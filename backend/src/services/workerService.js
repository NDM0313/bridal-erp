/**
 * Worker Service
 * Handles production worker operations (mobile-friendly, restricted access)
 * 
 * PHASE B: Production Worker Flow
 * - Workers can only view/update their assigned steps
 * - No access to sales, accounting, or other workers' steps
 */

import { supabase } from '../config/supabase.js';

/**
 * Get assigned production steps for a worker
 * Mobile-friendly: Returns only assigned steps, excludes completed by default
 * 
 * @param {string} userId - User ID (from auth)
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<array>} Assigned steps
 */
export async function getAssignedSteps(userId, businessId, options = {}) {
  const {
    includeCompleted = false, // Exclude completed steps by default
  } = options;

  let query = supabase
    .from('production_steps')
    .select(`
      id,
      production_order_id,
      step_name,
      step_qty,
      completed_qty,
      status,
      started_at,
      completed_at,
      production_orders!inner(
        id,
        order_no,
        business_id
      )
    `)
    .eq('assigned_user_id', userId)
    .eq('production_orders.business_id', businessId);

  // Exclude completed steps by default (mobile-friendly)
  if (!includeCompleted) {
    query = query.neq('status', 'completed');
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch assigned steps: ${error.message}`);
  }

  // Transform to mobile-friendly flat structure
  return (data || []).map(step => ({
    step_id: step.id,
    order_no: step.production_orders.order_no,
    step_name: step.step_name,
    step_qty: step.step_qty ? parseFloat(step.step_qty) : null,
    completed_qty: step.completed_qty ? parseFloat(step.completed_qty) : 0,
    status: step.status,
    started_at: step.started_at,
    completed_at: step.completed_at,
  }));
}

/**
 * Update step progress (completed_qty)
 * Auto-updates status based on quantity
 * 
 * @param {number} stepId - Step ID
 * @param {number} completedQty - Completed quantity
 * @param {string} userId - User ID (must be assigned to this step)
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Updated step
 */
export async function updateStepProgress(stepId, completedQty, userId, businessId) {
  // Step 1: Verify step exists and user is assigned
  const { data: step, error: stepError } = await supabase
    .from('production_steps')
    .select(`
      id,
      assigned_user_id,
      step_qty,
      completed_qty,
      status,
      production_orders!inner(
        id,
        business_id
      )
    `)
    .eq('id', stepId)
    .single();

  if (stepError || !step) {
    throw new Error('Production step not found');
  }

  // Verify business context
  if (step.production_orders.business_id !== businessId) {
    throw new Error('Production step does not belong to this business');
  }

  // Verify user is assigned to this step
  if (step.assigned_user_id !== userId) {
    throw new Error('You are not assigned to this step');
  }

  // Step 2: Validate completed_qty
  if (completedQty < 0) {
    throw new Error('completed_qty cannot be negative');
  }

  if (step.step_qty !== null && completedQty > step.step_qty) {
    throw new Error(`completed_qty (${completedQty}) cannot exceed step_qty (${step.step_qty})`);
  }

  // Step 3: Auto-determine status based on quantity
  let newStatus = step.status;
  const updateData = {
    completed_qty: completedQty,
    updated_at: new Date().toISOString(),
  };

  if (completedQty === 0) {
    // Reset to pending if quantity is 0
    newStatus = 'pending';
    updateData.started_at = null;
  } else if (completedQty > 0 && step.status === 'pending') {
    // Auto-transition to in_progress when quantity > 0
    newStatus = 'in_progress';
    if (!step.started_at) {
      updateData.started_at = new Date().toISOString();
    }
  } else if (step.step_qty !== null && completedQty >= step.step_qty) {
    // Auto-complete when quantity reaches step_qty
    newStatus = 'completed';
    if (!step.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
  }

  updateData.status = newStatus;

  // Step 4: Update step
  const { data: updatedStep, error: updateError } = await supabase
    .from('production_steps')
    .update(updateData)
    .eq('id', stepId)
    .select(`
      id,
      production_order_id,
      step_name,
      step_qty,
      completed_qty,
      status,
      started_at,
      completed_at,
      production_orders!inner(
        order_no
      )
    `)
    .single();

  if (updateError) {
    // Check if it's a status transition error
    if (updateError.message.includes('Invalid status transition')) {
      throw new Error(`Cannot update: ${updateError.message}`);
    }
    throw new Error(`Failed to update step: ${updateError.message}`);
  }

  // Step 5: Check if all steps are completed and auto-update production order
  if (newStatus === 'completed') {
    await checkAndCompleteProductionOrder(updatedStep.production_order_id, businessId);
    
    // PHASE D: Emit production.step.completed event
    import('./eventService.js').then(({ emitSystemEvent, EVENT_NAMES }) => {
      emitSystemEvent(EVENT_NAMES.PRODUCTION_STEP_COMPLETED, {
        step: updatedStep,
        businessId,
      }).catch((err) => {
        console.error('Error emitting production.step.completed event:', err);
      });
    });
  }

  // Return mobile-friendly format
  return {
    step_id: updatedStep.id,
    order_no: updatedStep.production_orders.order_no,
    step_name: updatedStep.step_name,
    step_qty: updatedStep.step_qty ? parseFloat(updatedStep.step_qty) : null,
    completed_qty: updatedStep.completed_qty ? parseFloat(updatedStep.completed_qty) : 0,
    status: updatedStep.status,
    started_at: updatedStep.started_at,
    completed_at: updatedStep.completed_at,
  };
}

/**
 * Update step status (with validation)
 * Enforces valid status transitions
 * 
 * @param {number} stepId - Step ID
 * @param {string} status - New status
 * @param {string} userId - User ID (must be assigned to this step)
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Updated step
 */
export async function updateStepStatus(stepId, status, userId, businessId) {
  // Step 1: Verify step exists and user is assigned
  const { data: step, error: stepError } = await supabase
    .from('production_steps')
    .select(`
      id,
      assigned_user_id,
      step_qty,
      completed_qty,
      status,
      production_orders!inner(
        id,
        business_id
      )
    `)
    .eq('id', stepId)
    .single();

  if (stepError || !step) {
    throw new Error('Production step not found');
  }

  // Verify business context
  if (step.production_orders.business_id !== businessId) {
    throw new Error('Production step does not belong to this business');
  }

  // Verify user is assigned to this step
  if (step.assigned_user_id !== userId) {
    throw new Error('You are not assigned to this step');
  }

  // Step 2: Validate status transition
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  // Step 3: Validate completed status requires completed_qty = step_qty
  if (status === 'completed') {
    if (step.step_qty !== null) {
      if (step.completed_qty === null || step.completed_qty !== step.step_qty) {
        throw new Error(`Cannot mark as completed: completed_qty (${step.completed_qty || 0}) must equal step_qty (${step.step_qty})`);
      }
    }
  }

  // Step 4: Prepare update data
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Auto-set timestamps
  if (status === 'in_progress' && step.status === 'pending' && !step.started_at) {
    updateData.started_at = new Date().toISOString();
  }

  if (status === 'completed' && !step.completed_at) {
    updateData.completed_at = new Date().toISOString();
  }

  // Step 5: Update step (database trigger will validate status transition)
  const { data: updatedStep, error: updateError } = await supabase
    .from('production_steps')
    .update(updateData)
    .eq('id', stepId)
    .select(`
      id,
      production_order_id,
      step_name,
      step_qty,
      completed_qty,
      status,
      started_at,
      completed_at,
      production_orders!inner(
        order_no
      )
    `)
    .single();

  if (updateError) {
    // Check if it's a status transition error
    if (updateError.message.includes('Invalid status transition')) {
      throw new Error(`Cannot update status: ${updateError.message}`);
    }
    throw new Error(`Failed to update step: ${updateError.message}`);
  }

  // Step 6: Check if all steps are completed and auto-update production order
  if (status === 'completed') {
    await checkAndCompleteProductionOrder(updatedStep.production_order_id, businessId);
  }

  // Return mobile-friendly format
  return {
    step_id: updatedStep.id,
    order_no: updatedStep.production_orders.order_no,
    step_name: updatedStep.step_name,
    step_qty: updatedStep.step_qty ? parseFloat(updatedStep.step_qty) : null,
    completed_qty: updatedStep.completed_qty ? parseFloat(updatedStep.completed_qty) : 0,
    status: updatedStep.status,
    started_at: updatedStep.started_at,
    completed_at: updatedStep.completed_at,
  };
}

/**
 * Check if all steps are completed and auto-update production order status
 * This is called automatically when a step is completed
 * 
 * @param {number} productionOrderId - Production order ID
 * @param {number} businessId - Business ID
 */
async function checkAndCompleteProductionOrder(productionOrderId, businessId) {
  try {
    // Get all steps for this production order
    const { data: steps, error: stepsError } = await supabase
      .from('production_steps')
      .select('id, status')
      .eq('production_order_id', productionOrderId);

    if (stepsError || !steps || steps.length === 0) {
      return; // No steps, nothing to check
    }

    // Check if all steps are completed
    const allCompleted = steps.every(step => step.status === 'completed');

    if (allCompleted) {
      // Get production order details
      const { data: productionOrder } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .eq('business_id', businessId)
        .single();

      // Auto-update production order status to 'completed'
      const { error: updateError } = await supabase
        .from('production_orders')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productionOrderId)
        .eq('business_id', businessId);

      if (updateError) {
        // Log error but don't fail the step update
        console.error('Failed to auto-complete production order:', updateError);
      } else {
        console.log(`Production order ${productionOrderId} auto-completed (all steps finished)`);
        
        // PHASE D: Emit production.completed event
        if (productionOrder) {
          import('./eventService.js').then(({ emitSystemEvent, EVENT_NAMES }) => {
            emitSystemEvent(EVENT_NAMES.PRODUCTION_COMPLETED, {
              productionOrder: { ...productionOrder, status: 'completed' },
              businessId,
            }).catch((err) => {
              console.error('Error emitting production.completed event:', err);
            });
          });
        }
      }
    }
  } catch (error) {
    // Log error but don't fail the step update
    console.error('Error checking production order completion:', error);
  }
}
