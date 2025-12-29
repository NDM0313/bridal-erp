/**
 * Test Routes
 * Minimal routes for testing Supabase connection and INSERT operations
 * Uses service_role key to bypass RLS for testing purposes
 */

import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /test/health
 * Enhanced health check with Supabase connection test
 */
router.get('/health', async (req, res) => {
  try {
    // Test Supabase connection using service_role key
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY in .env',
      });
    }

    // Test connection by querying a simple table
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Supabase connection failed',
        details: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Server and Supabase are connected',
      timestamp: new Date().toISOString(),
      supabase: {
        connected: true,
        usingServiceRole: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
    });
  }
});

/**
 * POST /test/insert
 * Test INSERT operation into products table using service_role key
 */
router.post('/insert', async (req, res) => {
  try {
    // Validate required fields
    const { name, sku, business_id, unit_id, created_by } = req.body;

    if (!name || !sku || !business_id || !unit_id || !created_by) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'sku', 'business_id', 'unit_id', 'created_by'],
        received: {
          name: !!name,
          sku: !!sku,
          business_id: !!business_id,
          unit_id: !!unit_id,
          created_by: !!created_by,
        },
      });
    }

    // Verify Supabase admin client is available
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Supabase admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY in .env',
      });
    }

    // Insert test product
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        business_id: parseInt(business_id),
        name: name,
        sku: sku,
        type: 'single',
        unit_id: parseInt(unit_id),
        enable_stock: false,
        alert_quantity: 0,
        is_inactive: false,
        not_for_selling: false,
        created_by: created_by, // UUID from auth.users
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to insert product',
        details: error.message,
        code: error.code,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product inserted successfully',
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Insert operation failed',
      details: error.message,
    });
  }
});

export default router;

