/**
 * Express Server
 * Main entry point for the POS Backend API
 */

// Load environment variables FIRST (before any other imports)
import dotenv from 'dotenv';
dotenv.config();

// PHASE D: Initialize event listeners early (must be imported before routes)
import './services/socialMediaService.js';

import express from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import productRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import purchaseRoutes from './routes/purchases.js';
import adjustmentRoutes from './routes/adjustments.js';
import transferRoutes from './routes/transfers.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import whatsappRoutes from './routes/whatsapp.js';
import automationRoutes from './routes/automation.js';
import subscriptionRoutes from './routes/subscriptions.js';
import stripeWebhookRoutes from './routes/stripe-webhooks.js';
import onboardingRoutes from './routes/onboarding.js';
import supportRoutes from './routes/support.js';
import metricsRoutes from './routes/metrics.js';
import monitoringRoutes from './routes/monitoring.js';
import testRoutes from './routes/test.js';
// Modern ERP Routes
import rentalRoutes from './routes/rentals.js';
import productionRoutes from './routes/production.js';
import accountingRoutes from './routes/accounting.js';
// Phase B: Production Worker Routes
import workerRoutes from './routes/worker.js';
// Phase D: Social Media Routes
import socialRoutes from './routes/social.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Routes (for Supabase connection verification)
app.use('/test', testRoutes);

// API Routes
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/adjustments', adjustmentRoutes);
app.use('/api/v1/transfers', transferRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/automation', automationRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/webhooks', stripeWebhookRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);
// Modern ERP Routes
app.use('/api/v1/rentals', rentalRoutes);
app.use('/api/v1/production', productionRoutes);
app.use('/api/v1/accounting', accountingRoutes);
// Phase B: Production Worker Routes
app.use('/api/v1/worker', workerRoutes);
// Phase D: Social Media Routes
app.use('/api/v1/social', socialRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Verify Supabase connection
  if (process.env.SUPABASE_URL) {
    console.log(`✅ Supabase URL: ${process.env.SUPABASE_URL.substring(0, 30)}...`);
  } else {
    console.error('❌ SUPABASE_URL is not set!');
  }
  
  if (process.env.SUPABASE_ANON_KEY) {
    console.log(`✅ Supabase Anon Key: ${process.env.SUPABASE_ANON_KEY.substring(0, 20)}...`);
  } else {
    console.error('❌ SUPABASE_ANON_KEY is not set!');
  }
  
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`✅ Supabase Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  } else {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set!');
  }
});

export default app;

