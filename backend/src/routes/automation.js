/**
 * Automation Routes
 * Manage notification templates and automation rules
 */

import express from 'express';
import { authenticateUser, attachBusinessContext } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/v1/automation/templates
 * Get notification templates
 */
router.get(
  '/templates',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { notification_type } = req.query;

      let query = supabase
        .from('notification_templates')
        .select('*')
        .eq('business_id', req.businessId);

      if (notification_type) {
        query = query.eq('notification_type', notification_type);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/automation/templates
 * Create notification template
 */
router.post(
  '/templates',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { notification_type, template_name, template_content, is_active = true } = req.body;

      if (!notification_type || !template_name || !template_content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: notification_type, template_name, template_content',
        });
      }

      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          business_id: req.businessId,
          notification_type,
          template_name,
          template_content,
          is_active,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create template: ${error.message}`);
      }

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/automation/templates/:id
 * Update notification template
 */
router.put(
  '/templates/:id',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { template_name, template_content, is_active } = req.body;

      const { data, error } = await supabase
        .from('notification_templates')
        .update({
          ...(template_name && { template_name }),
          ...(template_content && { template_content }),
          ...(is_active !== undefined && { is_active }),
        })
        .eq('id', id)
        .eq('business_id', req.businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update template: ${error.message}`);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/automation/rules
 * Get automation rules
 */
router.get(
  '/rules',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('business_id', req.businessId);

      if (error) {
        throw new Error(`Failed to fetch rules: ${error.message}`);
      }

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/automation/rules
 * Create or update automation rule
 */
router.post(
  '/rules',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { rule_type, is_enabled, conditions, whatsapp_number } = req.body;

      if (!rule_type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: rule_type',
        });
      }

      // Upsert (insert or update)
      const { data, error } = await supabase
        .from('automation_rules')
        .upsert(
          {
            business_id: req.businessId,
            rule_type,
            is_enabled: is_enabled !== undefined ? is_enabled : true,
            conditions: conditions || null,
            whatsapp_number: whatsapp_number || null,
          },
          {
            onConflict: 'business_id,rule_type',
          }
        )
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save rule: ${error.message}`);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/automation/rules/:id
 * Update automation rule
 */
router.put(
  '/rules/:id',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { is_enabled, conditions, whatsapp_number } = req.body;

      const { data, error } = await supabase
        .from('automation_rules')
        .update({
          ...(is_enabled !== undefined && { is_enabled }),
          ...(conditions !== undefined && { conditions }),
          ...(whatsapp_number !== undefined && { whatsapp_number }),
        })
        .eq('id', id)
        .eq('business_id', req.businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update rule: ${error.message}`);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

