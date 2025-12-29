# Monitoring Setup Guide

## 🎯 OVERVIEW

This guide helps you set up monitoring and alerting for the production POS system.

---

## 📊 RECOMMENDED TOOLS

### Application Monitoring

**Option 1: Sentry (Recommended)**
- Error tracking
- Performance monitoring
- User session replay
- Free tier available

**Option 2: LogRocket**
- Session replay
- Error tracking
- User analytics
- Paid service

### Uptime Monitoring

**Option 1: UptimeRobot (Free)**
- HTTP monitoring
- Email/SMS alerts
- 50 monitors free

**Option 2: Pingdom**
- Advanced monitoring
- Real user monitoring
- Paid service

### Log Aggregation

**Option 1: Logtail (Recommended)**
- Centralized logging
- Search and filter
- Free tier available

**Option 2: Datadog**
- Full observability
- APM, logs, metrics
- Paid service

---

## 🔧 SETUP INSTRUCTIONS

### Sentry Setup (Frontend)

1. **Install Sentry**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Initialize Sentry**
   ```typescript
   // sentry.client.config.ts
   import * as Sentry from '@sentry/nextjs';

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
   });
   ```

3. **Add to Environment Variables**
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
   ```

### Winston Setup (Backend)

1. **Install Winston**
   ```bash
   cd backend
   npm install winston
   ```

2. **Configure Logger**
   ```javascript
   // backend/src/utils/logger.js
   import winston from 'winston';

   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' }),
     ],
   });

   if (process.env.NODE_ENV !== 'production') {
     logger.add(new winston.transports.Console({
       format: winston.format.simple()
     }));
   }

   export default logger;
   ```

### UptimeRobot Setup

1. **Create Account**: https://uptimerobot.com
2. **Add Monitor**:
   - Type: HTTP(s)
   - URL: `https://api.yourdomain.com/test/health`
   - Interval: 5 minutes
   - Alert Contacts: Email, Slack
3. **Set Alerts**:
   - Alert when: Down for > 1 minute
   - Notify: Email + Slack

---

## 📈 METRICS TO MONITOR

### Critical Metrics

**Application Health**:
- ✅ Backend API uptime
- ✅ Frontend availability
- ✅ Database connection status
- ✅ Response times (p50, p95, p99)

**Business Metrics**:
- ✅ Failed transactions
- ✅ Stock update failures
- ✅ Authentication failures
- ✅ API error rates

**Security Metrics**:
- ✅ Unauthorized access attempts
- ✅ Role escalation attempts
- ✅ Cross-business access attempts

---

## 🚨 ALERTING RULES

### Critical Alerts (Immediate Response)

**Backend API Down**:
- Condition: Health check fails for > 1 minute
- Action: Page on-call engineer
- Channel: Email + SMS + Slack

**Database Connection Failures**:
- Condition: > 5 failures in 5 minutes
- Action: Page on-call engineer
- Channel: Email + SMS + Slack

**Failed Transactions**:
- Condition: > 10% of transactions fail
- Action: Notify team
- Channel: Email + Slack

### High Priority Alerts (Within 1 Hour)

**Stock Update Failures**:
- Condition: > 5 failures in 1 hour
- Action: Notify team
- Channel: Email + Slack

**API Error Rate**:
- Condition: Error rate > 10%
- Action: Notify team
- Channel: Email + Slack

### Medium Priority Alerts (Within 24 Hours)

**Slow Response Times**:
- Condition: p95 > 2 seconds
- Action: Review and optimize
- Channel: Email

**High Memory Usage**:
- Condition: Memory > 80%
- Action: Scale or optimize
- Channel: Email

---

## 📝 LOG RETENTION

**Recommended**:
- ✅ Application logs: 30 days
- ✅ Error logs: 90 days
- ✅ Audit logs: 1 year active, 7 years archived
- ✅ Access logs: 30 days

---

**Monitoring setup complete!** ✅

