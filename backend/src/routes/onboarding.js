/**
 * Onboarding Routes
 * Handles organization onboarding flow
 */

import express from 'express';
import { authenticateUser, attachBusinessContext } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { createStripeCustomer } from '../services/subscriptionService.js';

const router = express.Router();

/**
 * POST /api/v1/onboarding/create-organization
 * Create organization and start onboarding
 * 
 * SOFT LAUNCH: Checks signup enabled and user limit
 */
router.post(
  '/create-organization',
  authenticateUser,
  async (req, res, next) => {
    try {
      // SOFT LAUNCH: Check if signup is enabled
      const { data: signupSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'signup_enabled')
        .single();
      
      if (!signupSetting || signupSetting.value !== true) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SIGNUP_DISABLED',
            message: 'New signups are temporarily disabled. Please check back soon.',
          },
        });
      }
      
      // SOFT LAUNCH: Check user limit
      const { data: softLaunchSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'soft_launch_mode')
        .single();
      
      const softLaunchEnabled = softLaunchSetting?.value === true;
      
      if (softLaunchEnabled) {
        const { data: limitSetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'soft_launch_user_limit')
          .single();
        
        const userLimit = limitSetting?.value ? parseInt(limitSetting.value) : 10;
        
        const { count: currentCount } = await supabase
          .from('organizations')
          .select('id', { count: 'exact', head: true });
        
        if ((currentCount || 0) >= userLimit) {
          return res.status(503).json({
            success: false,
            error: {
              code: 'SOFT_LAUNCH_LIMIT',
              message: `We are currently in soft launch mode with limited capacity (${userLimit} users). Signups are currently full. Please check back soon!`,
            },
          });
        }
      }
      
      const { name, slug } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization name and slug are required',
          },
        });
      }
      
      // Check slug availability
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SLUG_TAKEN',
            message: 'Organization slug already taken',
          },
        });
      }
      
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          subscription_plan: 'free',
          subscription_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          onboarding_completed: false,
          onboarding_step: 'business_details',
        })
        .select()
        .single();
      
      if (orgError) {
        throw orgError;
      }
      
      // Create subscription
      const { data: subscription } = await supabase
        .from('organization_subscriptions')
        .insert({
          organization_id: org.id,
          plan: 'free',
          status: 'trial',
          trial_start: new Date(),
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
        .select()
        .single();
      
      // Add user as organization admin
      const { data: orgUser } = await supabase
        .from('organization_users')
        .insert({
          organization_id: org.id,
          user_id: req.user.id,
          role: 'admin',
          is_organization_admin: true,
        })
        .select()
        .single();
      
      // Create first business
      const { data: business } = await supabase
        .from('businesses')
        .insert({
          name: name + ' Business',
          organization_id: org.id,
          owner_id: req.user.id,
        })
        .select()
        .single();
      
      // Create default location
      const { data: location } = await supabase
        .from('business_locations')
        .insert({
          business_id: business.id,
          name: 'Main Location',
        })
        .select()
        .single();
      
      res.status(201).json({
        success: true,
        data: {
          organization: org,
          subscription,
          business,
          location,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/onboarding/complete-step
 * Complete onboarding step
 */
router.post(
  '/complete-step',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }
      
      const { step, data } = req.body;
      
      const validSteps = ['business_details', 'first_product', 'invite_team', 'payment_method'];
      if (!validSteps.includes(step)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STEP',
            message: `Invalid step. Valid steps: ${validSteps.join(', ')}`,
          },
        });
      }
      
      // Update onboarding step
      const updateData = {
        onboarding_step: step,
      };
      
      // If payment_method step, create Stripe customer
      if (step === 'payment_method' && data?.email) {
        try {
          await createStripeCustomer(req.organizationId, data.email);
        } catch (error) {
          console.error('Failed to create Stripe customer:', error);
          // Don't fail onboarding if Stripe fails
        }
      }
      
      // Mark as completed if all steps done
      if (step === 'payment_method') {
        updateData.onboarding_completed = true;
      }
      
      const { data: org, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', req.organizationId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/onboarding/status
 * Get onboarding status
 */
router.get(
  '/status',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }
      
      const { data: org, error } = await supabase
        .from('organizations')
        .select('onboarding_completed, onboarding_step')
        .eq('id', req.organizationId)
        .single();
      
      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        data: {
          completed: org.onboarding_completed,
          currentStep: org.onboarding_step,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

