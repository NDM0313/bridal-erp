/**
 * Production Costing Service
 * Handles production cost tracking and accounting integration
 * 
 * PHASE C: Production Costing & Accounting
 * - Step-level cost tracking
 * - Automatic expense creation when steps complete
 * - Order-level cost rollup
 */

import { supabase } from '../config/supabase.js';

/**
 * Update production step cost
 * Only admin/manager can update costs
 * 
 * @param {number} stepId - Step ID
 * @param {number} cost - New cost amount
 * @param {number} businessId - Business ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Updated step
 */
export async function updateStepCost(stepId, cost, businessId, userId) {
  // Validate cost
  if (cost === null || cost === undefined) {
    throw new Error('Cost is required');
  }

  if (typeof cost !== 'number' || cost < 0) {
    throw new Error('Cost must be a non-negative number');
  }

  // Verify step exists and belongs to business
  const { data: step, error: stepError } = await supabase
    .from('production_steps')
    .select(`
      id,
      production_order_id,
      cost,
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

  // Update step cost
  const { data: updatedStep, error: updateError } = await supabase
    .from('production_steps')
    .update({
      cost: cost,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stepId)
    .select(`
      id,
      production_order_id,
      step_name,
      cost,
      vendor_id,
      status,
      production_orders!inner(
        id,
        order_no,
        business_id
      )
    `)
    .single();

  if (updateError) {
    throw new Error(`Failed to update step cost: ${updateError.message}`);
  }

  // Note: production_orders.total_cost is auto-updated by database trigger
  // when production_steps.cost changes

  return updatedStep;
}

/**
 * Get production cost reports
 * 
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Cost reports
 */
export async function getProductionCostReports(businessId, options = {}) {
  const {
    orderId = null,
    stepType = null, // 'Dyeing', 'Handwork', 'Stitching'
    startDate = null,
    endDate = null,
  } = options;

  // Base query for cost per production order
  let orderCostQuery = supabase
    .from('production_orders')
    .select(`
      id,
      order_no,
      total_cost,
      final_price,
      status,
      created_at,
      production_steps(
        id,
        step_name,
        cost,
        status
      )
    `)
    .eq('business_id', businessId);

  if (orderId) {
    orderCostQuery = orderCostQuery.eq('id', orderId);
  }

  if (startDate) {
    orderCostQuery = orderCostQuery.gte('created_at', startDate);
  }

  if (endDate) {
    orderCostQuery = orderCostQuery.lte('created_at', endDate);
  }

  const { data: orders, error: ordersError } = await orderCostQuery;

  if (ordersError) {
    throw new Error(`Failed to fetch production orders: ${ordersError.message}`);
  }

  // Calculate profit per order
  const ordersWithProfit = (orders || []).map(order => {
    const profit = parseFloat(order.final_price) - parseFloat(order.total_cost || 0);
    return {
      ...order,
      profit: profit,
      profit_margin: order.final_price > 0 
        ? ((profit / parseFloat(order.final_price)) * 100).toFixed(2) 
        : '0.00',
    };
  });

  // Cost per step type
  let stepCostQuery = supabase
    .from('production_steps')
    .select(`
      step_name,
      cost,
      production_orders!inner(
        business_id,
        created_at
      )
    `)
    .eq('production_orders.business_id', businessId);

  if (stepType) {
    stepCostQuery = stepCostQuery.eq('step_name', stepType);
  }

  if (startDate) {
    stepCostQuery = stepCostQuery.gte('production_orders.created_at', startDate);
  }

  if (endDate) {
    stepCostQuery = stepCostQuery.lte('production_orders.created_at', endDate);
  }

  const { data: steps, error: stepsError } = await stepCostQuery;

  if (stepsError) {
    throw new Error(`Failed to fetch step costs: ${stepsError.message}`);
  }

  // Aggregate cost by step type
  const stepTypeCosts = {};
  (steps || []).forEach(step => {
    const stepName = step.step_name;
    if (!stepTypeCosts[stepName]) {
      stepTypeCosts[stepName] = {
        step_name: stepName,
        total_cost: 0,
        step_count: 0,
        avg_cost: 0,
      };
    }
    stepTypeCosts[stepName].total_cost += parseFloat(step.cost || 0);
    stepTypeCosts[stepName].step_count += 1;
  });

  // Calculate averages
  Object.keys(stepTypeCosts).forEach(stepName => {
    const data = stepTypeCosts[stepName];
    data.avg_cost = data.step_count > 0 
      ? (data.total_cost / data.step_count).toFixed(2) 
      : '0.00';
    data.total_cost = data.total_cost.toFixed(2);
  });

  return {
    orders: ordersWithProfit,
    step_type_costs: Object.values(stepTypeCosts),
    summary: {
      total_orders: ordersWithProfit.length,
      total_cost: ordersWithProfit.reduce((sum, o) => sum + parseFloat(o.total_cost || 0), 0).toFixed(2),
      total_revenue: ordersWithProfit.reduce((sum, o) => sum + parseFloat(o.final_price || 0), 0).toFixed(2),
      total_profit: ordersWithProfit.reduce((sum, o) => sum + parseFloat(o.profit || 0), 0).toFixed(2),
    },
  };
}
