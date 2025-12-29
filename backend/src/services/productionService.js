/**
 * Production Service
 * Handles custom studio / manufacturing operations with vendor ledger integration
 */

import { supabase } from '../config/supabase.js';

/**
 * Create a production order
 * @param {object} orderData - Order data
 * @param {number} businessId - Business ID
 * @param {string} userId - User ID (created_by)
 * @returns {Promise<object>} Created order
 */
export async function createProductionOrder(orderData, businessId, userId) {
  const {
    customerId,
    orderNo,
    deadlineDate = null,
    description = null,
    measurements = null,
    steps = [],
    materials = [],
  } = orderData;

  // Validate required fields
  if (!orderNo) {
    throw new Error('Missing required field: orderNo');
  }

  // Check if order number already exists
  const { data: existing } = await supabase
    .from('production_orders')
    .select('id')
    .eq('business_id', businessId)
    .eq('order_no', orderNo)
    .single();

  if (existing) {
    throw new Error('Order number already exists for this business');
  }

  // Calculate total cost from steps
  const totalCost = steps.reduce((sum, step) => sum + (step.cost || 0), 0);

  // Prepare insert data
  const insertData = {
    business_id: businessId,
    customer_id: customerId || null,
    order_no: orderNo,
    deadline_date: deadlineDate,
    total_cost: totalCost,
    final_price: totalCost, // Initially same as cost
    description,
    status: 'new',
    created_by: userId,
  };

  // Add measurements if provided (as JSONB)
  if (measurements && Object.keys(measurements).length > 0) {
    insertData.measurements = measurements;
  }

  // Insert production order
  const { data: order, error: orderError } = await supabase
    .from('production_orders')
    .insert(insertData)
    .select()
    .single();

  if (orderError) {
    throw new Error(`Failed to create production order: ${orderError.message}`);
  }

  // Insert production steps
  if (steps.length > 0) {
    const stepInserts = steps.map((step) => ({
      production_order_id: order.id,
      step_name: step.stepName,
      vendor_id: step.vendorId || null,
      cost: step.cost || 0,
      status: 'pending',
      notes: step.notes || null,
    }));

    const { error: stepsError } = await supabase
      .from('production_steps')
      .insert(stepInserts);

    if (stepsError) {
      // Rollback order creation if steps fail
      await supabase.from('production_orders').delete().eq('id', order.id);
      throw new Error(`Failed to create production steps: ${stepsError.message}`);
    }
  }

  // Insert production materials
  if (materials.length > 0) {
    const materialInserts = materials.map((material) => ({
      production_order_id: order.id,
      product_id: material.productId,
      variation_id: material.variationId || null,
      quantity_used: material.quantityUsed,
      unit_id: material.unitId,
      unit_cost: material.unitCost || 0,
      total_cost: (material.quantityUsed || 0) * (material.unitCost || 0),
      notes: material.notes || null,
    }));

    const { error: materialsError } = await supabase
      .from('production_materials')
      .insert(materialInserts);

    if (materialsError) {
      console.error('Failed to create production materials:', materialsError);
      // Don't rollback - materials are optional
    }
  }

  // Fetch complete order with relations
  const { data: completeOrder, error: fetchError } = await supabase
    .from('production_orders')
    .select(`
      *,
      customer:contacts(id, name, mobile, email),
      steps:production_steps(
        *,
        vendor:contacts(id, name, mobile)
      ),
      materials:production_materials(
        *,
        product:products(id, name, sku),
        variation:variations(id, name, sub_sku)
      )
    `)
    .eq('id', order.id)
    .single();

  if (fetchError) {
    // Return order even if fetch fails
    return order;
  }

  return completeOrder;
}

/**
 * Update production order status
 * @param {number} orderId - Order ID
 * @param {string} status - New status
 * @param {number} businessId - Business ID
 * @param {number} assignedVendorId - Assigned vendor ID (optional)
 * @returns {Promise<object>} Updated order
 */
export async function updateProductionOrderStatus(orderId, status, businessId, assignedVendorId = null) {
  // Verify order belongs to business
  const { data: existing } = await supabase
    .from('production_orders')
    .select('id')
    .eq('id', orderId)
    .eq('business_id', businessId)
    .single();

  if (!existing) {
    throw new Error('Production order not found');
  }

  // Validate status
  const validStatuses = ['new', 'dyeing', 'stitching', 'handwork', 'completed', 'dispatched', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  // Prepare update data
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Add assigned_vendor_id if provided
  if (assignedVendorId !== null && assignedVendorId !== undefined) {
    // Verify vendor belongs to business
    const { data: vendor } = await supabase
      .from('contacts')
      .select('id, business_id')
      .eq('id', assignedVendorId)
      .eq('business_id', businessId)
      .single();

    if (!vendor) {
      throw new Error('Vendor not found or does not belong to this business');
    }

    updateData.assigned_vendor_id = assignedVendorId;
  }

  // Update order status
  const { data, error } = await supabase
    .from('production_orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('business_id', businessId)
    .select(`
      *,
      customer:contacts(id, name, mobile, email),
      assigned_vendor:contacts(id, name, mobile, address_line_1),
      steps:production_steps(
        *,
        vendor:contacts(id, name, mobile)
      ),
      materials:production_materials(
        *,
        product:products(id, name, sku),
        variation:variations(id, name, sub_sku)
      )
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update production order: ${error.message}`);
  }

  return data;
}

/**
 * Update production step status and credit vendor account
 * @param {number} stepId - Step ID
 * @param {string} status - New status ('pending', 'in_progress', 'completed', 'cancelled')
 * @param {number} businessId - Business ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Updated step
 */
export async function updateProductionStepStatus(stepId, status, businessId, userId) {
  // Get step with order and vendor info
  const { data: step, error: stepError } = await supabase
    .from('production_steps')
    .select(`
      *,
      order:production_orders!inner(id, business_id, status)
    `)
    .eq('id', stepId)
    .single();

  if (stepError || !step) {
    throw new Error('Production step not found');
  }

  // Verify order belongs to business
  if (step.order.business_id !== businessId) {
    throw new Error('Production step does not belong to this business');
  }

  const oldStatus = step.status;
  const isCompleting = oldStatus !== 'completed' && status === 'completed';
  const isCancelling = status === 'cancelled';

  // Update step status
  const updateData = { status };
  if (status === 'in_progress' && !step.started_at) {
    updateData.started_at = new Date().toISOString();
  }
  if (status === 'completed' && !step.completed_at) {
    updateData.completed_at = new Date().toISOString();
  }

  const { data: updatedStep, error: updateError } = await supabase
    .from('production_steps')
    .update(updateData)
    .eq('id', stepId)
    .select(`
      *,
      vendor:contacts(id, name, mobile)
    `)
    .single();

  if (updateError) {
    throw new Error(`Failed to update production step: ${updateError.message}`);
  }

  // If step is completed and has a vendor, credit vendor's account
  if (isCompleting && updatedStep.vendor_id) {
    try {
      // Get or create vendor's financial account
      const { data: vendorAccount } = await supabase
        .from('financial_accounts')
        .select('id')
        .eq('business_id', businessId)
        .eq('name', `Vendor: ${updatedStep.vendor?.name || 'Unknown'}`)
        .single();

      let accountId = vendorAccount?.id;

      if (!accountId) {
        // Create vendor account if it doesn't exist
        const { data: newAccount, error: createError } = await supabase
          .from('financial_accounts')
          .insert({
            business_id: businessId,
            name: `Vendor: ${updatedStep.vendor?.name || 'Unknown'}`,
            type: 'wallet',
            current_balance: 0,
            opening_balance: 0,
            created_by: userId,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        accountId = newAccount.id;
      }

      // Credit vendor account
      await supabase.from('account_transactions').insert({
        account_id: accountId,
        business_id: businessId,
        type: 'credit',
        amount: updatedStep.cost,
        reference_type: 'production',
        reference_id: updatedStep.id,
        description: `Payment for ${step.step_name} - Order ${step.order.order_no || step.order.id}`,
        created_by: userId,
      });
    } catch (vendorError) {
      // Log error but don't fail the step update
      console.error('Failed to credit vendor account:', vendorError);
    }
  }

  return updatedStep;
}

/**
 * Get all production orders for a business
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Orders list
 */
export async function getProductionOrders(businessId, options = {}) {
  const {
    page = 1,
    perPage = 20,
    status = null,
    customerId = null,
    vendorId = null,
  } = options;

  let query = supabase
    .from('production_orders')
    .select(`
      *,
      customer:contacts(id, name, mobile, email),
      assigned_vendor:contacts(id, name, mobile, address_line_1),
      steps:production_steps(
        *,
        vendor:contacts(id, name, mobile)
      ),
      materials:production_materials(
        *,
        product:products(id, name, sku),
        variation:variations(id, name, sub_sku)
      )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  if (vendorId) {
    query = query.eq('assigned_vendor_id', vendorId);
  }

  // Pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch production orders: ${error.message}`);
  }

  // Get total count
  const { count: totalCount } = await supabase
    .from('production_orders')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);

  return {
    data: data || [],
    meta: {
      page,
      perPage,
      total: totalCount || 0,
      totalPages: Math.ceil((totalCount || 0) / perPage),
    },
  };
}
