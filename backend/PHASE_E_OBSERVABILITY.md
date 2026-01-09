# Phase E: Observability & Safety Recommendations

## Centralized Logging Strategy

### Current State

**Implementation**: Console logging (`console.log`, `console.error`)

**Limitations**:
- No structured logging
- No log levels
- No centralized collection
- Difficult to search/filter

---

### Recommended: Winston Logger

**Installation**:
```bash
npm install winston
```

**Implementation** (`backend/src/utils/logger.js`):
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'pos-backend',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write errors to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
```

**Usage**:
```javascript
import logger from '../utils/logger.js';

// Info log
logger.info('Sale created', {
  saleId: 123,
  businessId: 1,
  userId: 'user-123',
});

// Error log
logger.error('Failed to create sale', {
  error: error.message,
  stack: error.stack,
  businessId: 1,
});
```

**Log Levels**:
- `error`: Errors that need attention
- `warn`: Warnings (non-critical issues)
- `info`: General information
- `debug`: Debug information (development only)

---

## Error Tracking (Production-Safe)

### Recommended: Sentry Integration

**Installation**:
```bash
npm install @sentry/node
```

**Implementation** (`backend/src/config/sentry.js`):
```javascript
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% of transactions
    beforeSend(event, hint) {
      // Sanitize sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    },
  });
}

export default Sentry;
```

**Usage** (`backend/src/server.js`):
```javascript
import Sentry from './config/sentry.js';
import { errorHandler } from './middleware/errorHandler.js';

// Add Sentry error handler
app.use(Sentry.Handlers.errorHandler());

// Custom error handler
app.use(errorHandler);
```

**Error Tracking**:
- ✅ Captures unhandled errors
- ✅ Captures API errors
- ✅ Includes stack traces
- ✅ Includes user context (sanitized)
- ✅ Includes business context

**Privacy**:
- ✅ No PII in error messages
- ✅ Sanitized data only
- ✅ Compliant with data protection

---

## Event Failure Monitoring

### Current State

**Implementation**: Event listeners in `socialMediaService.js`

**Limitations**:
- No failure tracking
- No retry mechanism
- No dead-letter queue

---

### Recommended: Event Failure Tracking

**Database Table** (`event_failures`):
```sql
CREATE TABLE IF NOT EXISTS event_failures (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    business_id INTEGER NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT NULL,
    event_data JSONB NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'failed' CHECK (status IN ('failed', 'retrying', 'resolved')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_event_failures_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX idx_event_failures_business_id ON event_failures(business_id);
CREATE INDEX idx_event_failures_status ON event_failures(status);
CREATE INDEX idx_event_failures_event_name ON event_failures(event_name);
```

**Implementation** (`backend/src/services/eventService.js`):
```javascript
import { supabase } from '../config/supabase.js';
import logger from '../utils/logger.js';

// Wrap event emission with error tracking
export function emitSystemEvent(eventName, data) {
  try {
    systemEvents.emitEvent(eventName, data);
  } catch (error) {
    // Track event failure
    trackEventFailure(eventName, data, error);
  }
}

async function trackEventFailure(eventName, data, error) {
  try {
    await supabase.from('event_failures').insert({
      event_name: eventName,
      business_id: data.businessId || null,
      error_message: error.message,
      error_stack: error.stack,
      event_data: sanitizeData(data),
      status: 'failed',
    });
    
    logger.error('Event processing failed', {
      event: eventName,
      error: error.message,
      businessId: data.businessId,
    });
  } catch (trackError) {
    logger.error('Failed to track event failure', {
      event: eventName,
      error: trackError.message,
    });
  }
}

function sanitizeData(data) {
  // Remove sensitive data
  const sanitized = { ...data };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.apiKey;
  return sanitized;
}
```

**Monitoring**:
- Track failed events in `event_failures` table
- Alert on repeated failures
- Retry failed events (with backoff)

---

## Retry / Dead-Letter Strategy for Outbound Messages

### Current State

**Implementation**: Basic retry in `whatsappService.js`

**Limitations**:
- Fixed retry count
- No exponential backoff
- No dead-letter queue

---

### Recommended: Enhanced Retry Strategy

**Implementation** (`backend/src/services/socialMediaService.js`):
```javascript
async function sendMessageWithRetry(messageData, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000; // Start with 1 second
  
  while (attempt < maxRetries) {
    try {
      const result = await sendMessage(messageData);
      if (result.success || result.status === 'sent') {
        return result;
      }
      
      // If failed, retry
      attempt++;
      if (attempt >= maxRetries) {
        // Move to dead-letter queue
        await moveToDeadLetterQueue(messageData, 'Max retries exceeded');
        throw new Error('Max retries exceeded');
      }
      
      // Exponential backoff
      await sleep(delay);
      delay *= 2; // Double delay each retry
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        // Move to dead-letter queue
        await moveToDeadLetterQueue(messageData, error.message);
        throw error;
      }
      
      // Exponential backoff
      await sleep(delay);
      delay *= 2;
    }
  }
}

async function moveToDeadLetterQueue(messageData, errorMessage) {
  // Update message status to 'failed' in social_messages
  await supabase
    .from('social_messages')
    .update({
      status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', messageData.messageId);
  
  // Log to dead-letter queue table (if exists)
  await supabase.from('dead_letter_messages').insert({
    message_id: messageData.messageId,
    business_id: messageData.businessId,
    channel_id: messageData.channelId,
    error_message: errorMessage,
    message_data: messageData,
    created_at: new Date().toISOString(),
  });
  
  logger.error('Message moved to dead-letter queue', {
    messageId: messageData.messageId,
    error: errorMessage,
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Dead-Letter Queue Table**:
```sql
CREATE TABLE IF NOT EXISTS dead_letter_messages (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    error_message TEXT NOT NULL,
    message_data JSONB NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retried', 'resolved', 'abandoned')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_dead_letter_messages_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_dead_letter_messages_channel FOREIGN KEY (channel_id) 
        REFERENCES social_channels(id) ON DELETE CASCADE
);

CREATE INDEX idx_dead_letter_messages_business_id ON dead_letter_messages(business_id);
CREATE INDEX idx_dead_letter_messages_status ON dead_letter_messages(status);
```

**Retry Strategy**:
- ✅ Exponential backoff (1s, 2s, 4s, ...)
- ✅ Max retries: 3 (configurable)
- ✅ Dead-letter queue for failed messages
- ✅ Manual review and retry

---

## Monitoring Recommendations

### Uptime Monitoring

**Recommended**: UptimeRobot or similar

**Endpoints to Monitor**:
- `GET /test/health` - Health check
- `GET /api/v1/sales` - API availability
- `GET /api/v1/worker/steps` - Worker API availability

**Alerting**:
- Alert if endpoint down for > 5 minutes
- Alert if response time > 5 seconds
- Alert if error rate > 5%

---

### Performance Monitoring

**Recommended**: Application Performance Monitoring (APM)

**Metrics to Track**:
- API response times
- Database query times
- Error rates
- Request throughput

**Tools**:
- New Relic
- Datadog
- Custom metrics (Prometheus + Grafana)

---

### Database Monitoring

**Recommended**: Supabase Dashboard + Custom Queries

**Metrics to Track**:
- Database size
- Query performance
- Connection pool usage
- RLS policy performance

**Queries**:
```sql
-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Alerting Strategy

### Critical Alerts

**Immediate Action Required**:
- API down for > 5 minutes
- Database connection failures
- Authentication failures > 10%
- Error rate > 10%

**Notification Channels**:
- Email
- Slack
- PagerDuty (for critical)

---

### Warning Alerts

**Monitor Closely**:
- Response time > 2 seconds
- Error rate > 5%
- Database query time > 1 second
- Event failures > 5 per hour

**Notification Channels**:
- Email
- Slack

---

## Implementation Priority

### Phase 1 (Immediate)
1. ✅ Winston logger setup
2. ✅ Structured logging
3. ✅ Error tracking (Sentry)

### Phase 2 (Short-term)
1. Event failure tracking
2. Enhanced retry strategy
3. Dead-letter queue

### Phase 3 (Long-term)
1. APM integration
2. Custom dashboards
3. Advanced alerting

---

**Status**: ✅ **Observability Recommendations Complete**  
**Ready For**: Implementation

---

**Last Updated**: January 8, 2026
