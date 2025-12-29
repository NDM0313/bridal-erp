/**
 * Product Service
 * Handles all product-related database operations
 * Respects RLS and business_id isolation
 */

import { supabase } from '../config/supabase.js';

/**
 * Get all products for a business
 * @param {number} businessId - Business ID
 * @param {object} options - Query options (filters, pagination)
 * @returns {Promise<object>} Products list
 */
export async function getProducts(businessId, options = {}) {
  const {
    page = 1,
    perPage = 20,
    search = null,
    categoryId = null,
    brandId = null,
    isInactive = false,
  } = options;

  let query = supabase
    .from('products')
    .select(`
      *,
      unit:units!products_unit_id_fkey(id, actual_name, short_name),
      secondary_unit:units!products_secondary_unit_id_fkey(id, actual_name, short_name, base_unit_multiplier),
      brand:brands(id, name),
      category:categories(id, name),
      sub_category:categories!products_sub_category_id_fkey(id, name)
    `)
    .eq('business_id', businessId)
    .eq('is_inactive', isInactive)
    .order('created_at', { ascending: false });

  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (brandId) {
    query = query.eq('brand_id', brandId);
  }

  // Pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  // Get total count for pagination
  const { count: totalCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('is_inactive', isInactive);

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

/**
 * Get single product by ID
 * @param {number} productId - Product ID
 * @param {number} businessId - Business ID (for RLS)
 * @returns {Promise<object>} Product details
 */
export async function getProductById(productId, businessId) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      unit:units!products_unit_id_fkey(id, actual_name, short_name),
      secondary_unit:units!products_secondary_unit_id_fkey(id, actual_name, short_name, base_unit_multiplier),
      brand:brands(id, name),
      category:categories(id, name),
      sub_category:categories!products_sub_category_id_fkey(id, name),
      variations:variations(
        id,
        name,
        sub_sku,
        retail_price,
        wholesale_price,
        default_purchase_price,
        deleted_at
      )
    `)
    .eq('id', productId)
    .eq('business_id', businessId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Product not found');
    }
    throw new Error(`Failed to fetch product: ${error.message}`);
  }

  return data;
}

/**
 * Create a new product
 * @param {object} productData - Product data
 * @param {number} businessId - Business ID
 * @param {number} userId - User ID (created_by)
 * @returns {Promise<object>} Created product
 */
export async function createProduct(productData, businessId, userId) {
  const {
    name,
    type = 'single',
    unitId,
    secondaryUnitId = null,
    brandId = null,
    categoryId = null,
    subCategoryId = null,
    sku,
    enableStock = false,
    alertQuantity = 0,
    isInactive = false,
    productDescription = null,
    image = null,
    weight = null,
  } = productData;

  // Validate required fields
  if (!name || !unitId || !sku) {
    throw new Error('Missing required fields: name, unitId, sku');
  }

  // Check if SKU already exists for this business
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('business_id', businessId)
    .eq('sku', sku)
    .single();

  if (existing) {
    throw new Error('SKU already exists for this business');
  }

  // Extract rental fields if provided
  const {
    isRentable = false,
    rentalPrice = null,
    securityDepositAmount = null,
    rentDurationUnit = null,
  } = productData;

  // Insert product
  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id: businessId,
      name,
      type,
      unit_id: unitId,
      secondary_unit_id: secondaryUnitId,
      brand_id: brandId,
      category_id: categoryId,
      sub_category_id: subCategoryId,
      sku,
      enable_stock: enableStock,
      alert_quantity: alertQuantity,
      is_inactive: isInactive,
      product_description: productDescription,
      image,
      weight,
      // Rental fields
      is_rentable: isRentable,
      rental_price: rentalPrice,
      security_deposit_amount: securityDepositAmount,
      rent_duration_unit: rentDurationUnit,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }

  return data;
}

/**
 * Update a product
 * @param {number} productId - Product ID
 * @param {object} productData - Updated product data
 * @param {number} businessId - Business ID (for RLS)
 * @returns {Promise<object>} Updated product
 */
export async function updateProduct(productId, productData, businessId) {
  // Verify product belongs to business
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('business_id', businessId)
    .single();

  if (!existing) {
    throw new Error('Product not found');
  }

  // If SKU is being updated, check for duplicates
  if (productData.sku) {
    const { data: duplicate } = await supabase
      .from('products')
      .select('id')
      .eq('business_id', businessId)
      .eq('sku', productData.sku)
      .neq('id', productId)
      .single();

    if (duplicate) {
      throw new Error('SKU already exists for this business');
    }
  }

  // Prepare update data (only include provided fields)
  const updateData = {};
  const allowedFields = [
    'name',
    'type',
    'unit_id',
    'secondary_unit_id',
    'brand_id',
    'category_id',
    'sub_category_id',
    'sku',
    'enable_stock',
    'alert_quantity',
    'is_inactive',
    'product_description',
    'image',
    'weight',
    // Rental fields (from MODERN_ERP_EXTENSION)
    'is_rentable',
    'rental_price',
    'security_deposit_amount',
    'rent_duration_unit',
  ];

  allowedFields.forEach((field) => {
    if (productData[field] !== undefined) {
      // Convert camelCase to snake_case
      const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateData[snakeField] = productData[field];
    }
  });

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId)
    .eq('business_id', businessId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`);
  }

  return data;
}

/**
 * Delete a product (soft delete by setting is_inactive)
 * @param {number} productId - Product ID
 * @param {number} businessId - Business ID (for RLS)
 * @returns {Promise<boolean>} Success status
 */
export async function deleteProduct(productId, businessId) {
  // Verify product belongs to business
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('business_id', businessId)
    .single();

  if (!existing) {
    throw new Error('Product not found');
  }

  // Soft delete by setting is_inactive
  const { error } = await supabase
    .from('products')
    .update({ is_inactive: true })
    .eq('id', productId)
    .eq('business_id', businessId);

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`);
  }

  return true;
}

/**
 * Search products
 * @param {number} businessId - Business ID
 * @param {string} searchTerm - Search term
 * @param {number} limit - Result limit
 * @returns {Promise<array>} Matching products
 */
export async function searchProducts(businessId, searchTerm, limit = 10) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, type, is_inactive')
    .eq('business_id', businessId)
    .eq('is_inactive', false)
    .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search products: ${error.message}`);
  }

  return data || [];
}

