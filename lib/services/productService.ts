/**
 * Product Service
 * Direct Supabase operations for product management
 * Uses anon key + JWT - respects RLS
 */

import { supabase } from '@/utils/supabase/client';

export interface Product {
  id: number;
  name: string;
  sku: string;
  type: string;
  unit_id: number;
  secondary_unit_id?: number;
  category_id?: number;
  brand_id?: number;
  alert_quantity?: number;
  is_inactive: boolean;
  business_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  type?: string;
  unit_id: number;
  secondary_unit_id?: number;
  category_id?: number;
  brand_id?: number;
  alert_quantity?: number;
}

/**
 * List products (RLS-protected)
 * Returns only products from user's business
 */
export async function listProducts(params?: {
  search?: string;
  category_id?: number;
  is_inactive?: boolean;
}): Promise<Product[]> {
  let query = supabase.from('products').select('*');

  // RLS automatically filters by business_id
  // Additional filters
  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
  }
  if (params?.category_id) {
    query = query.eq('category_id', params.category_id);
  }
  if (params?.is_inactive !== undefined) {
    query = query.eq('is_inactive', params.is_inactive);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list products: ${error.message}`);
  }

  return data || [];
}

/**
 * Create product (authenticated user only)
 * RLS ensures business_id is set correctly
 */
export async function createProduct(productData: CreateProductDto): Promise<Product> {
  // RLS will automatically set business_id based on get_user_business_id()
  // But we need to ensure user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated to create products');
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...productData,
      type: productData.type || 'single',
      is_inactive: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }

  return data;
}

/**
 * Update product (same business only)
 * RLS ensures user can only update their own business products
 */
export async function updateProduct(id: number, productData: Partial<CreateProductDto>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    // RLS automatically filters by business_id
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Product not found or you do not have permission to update it');
    }
    throw new Error(`Failed to update product: ${error.message}`);
  }

  return data;
}

/**
 * Get product by ID (RLS-protected)
 */
export async function getProductById(id: number): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Product not found or not accessible
    }
    throw new Error(`Failed to get product: ${error.message}`);
  }

  return data;
}

