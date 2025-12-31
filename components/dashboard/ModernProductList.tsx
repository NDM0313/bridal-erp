/**
 * Modern Product List Component
 * Upgraded to use SmartTable with composite cells, color-coded stock, and 3-dots menu
 * Follows docs/modules/Products.md specifications
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard, AdminOnly } from '@/components/auth/RoleGuard';
import { Skeleton, TableSkeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyProducts } from '@/components/placeholders/EmptyState';
import { ErrorState } from '@/components/placeholders/ErrorState';
import { listProducts, type Product } from '@/lib/services/productService';
import { SmartTable, type Column } from '@/components/ui/SmartTable';
import { ProductNameCell } from '@/components/products/ProductNameCell';
import { StockCell } from '@/components/products/StockCell';
import { ProductActionsMenu } from '@/components/products/ProductActionsMenu';
import { PrintBarcodeModal } from '@/components/products/PrintBarcodeModal';
import { StockHistoryModal } from '@/components/products/StockHistoryModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { duplicateProduct } from '@/lib/services/productService';
import { Trash2, Search, Plus, Package, Tag, Ruler, TrendingUp, AlertTriangle, Layers, DollarSign, MoreVertical, Edit2, FolderTree, Scale, Filter, Download } from 'lucide-react';
import { CategoryForm } from '@/components/products/CategoryForm';
import { BrandForm } from '@/components/products/BrandForm';
import { UnitForm } from '@/components/products/UnitForm';
import { AddProductForm } from '@/components/products/AddProductForm';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';

interface VariationInfo {
  product_variation_name: string; // "Size", "Color", "Fabric"
  variation_names: string[]; // ["XL", "L", "M"]
}

interface ProductWithRelations extends Product {
  category?: { name: string; id: number };
  sub_category?: { name: string; id: number };
  brand?: { name: string; id: number };
  unit?: { actual_name: string };
  stock?: number;
  status?: 'In Stock' | 'Low Stock' | 'Out of Stock';
  price?: number;
  variations?: VariationInfo[]; // Grouped variations
  variationCount?: number; // Total number of variations
}

interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  product_count?: number;
}

interface Brand {
  id: number;
  name: string;
  product_count?: number;
}

interface Unit {
  id: number;
  actual_name: string;
  short_name: string;
  allow_decimal: boolean;
}

export function ModernProductList() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [printBarcodeProduct, setPrintBarcodeProduct] = useState<Product | null>(null);
  const [stockHistoryProduct, setStockHistoryProduct] = useState<Product | null>(null);
  const [viewProductDetails, setViewProductDetails] = useState<ProductWithRelations | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'brands' | 'units'>('products');
  
  // Settings data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  
  // Modal states for adding/editing
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
  
  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitShortName, setUnitShortName] = useState('');
  const [allowDecimal, setAllowDecimal] = useState(false);
  
  // Editing states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  useEffect(() => {
    loadProducts();
  }, [searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'categories' || activeTab === 'brands' || activeTab === 'units') {
      loadSettings();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const { supabase } = await import('@/utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      // Load categories
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .order('name');
      
      if (cats) {
        // Get product counts for categories
        const categoryIds = cats.map((c: any) => c.id);
        const { data: productCounts } = await supabase
          .from('products')
          .select('category_id')
          .in('category_id', categoryIds.length > 0 ? categoryIds : [0]);
        
        const countMap = new Map<number, number>();
        productCounts?.forEach((p: any) => {
          if (p.category_id) {
            countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
          }
        });
        
        const catsWithCounts = cats.map((cat: any) => ({
          ...cat,
          product_count: countMap.get(cat.id) || 0
        }));
        
        setCategories(catsWithCounts);
      }

      // Load brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');
      
      if (brandsData) {
        // Get product counts for brands
        const brandIds = brandsData.map((b: any) => b.id);
        const { data: brandProductCounts } = await supabase
          .from('products')
          .select('brand_id')
          .in('brand_id', brandIds.length > 0 ? brandIds : [0]);
        
        const brandCountMap = new Map<number, number>();
        brandProductCounts?.forEach((p: any) => {
          if (p.brand_id) {
            brandCountMap.set(p.brand_id, (brandCountMap.get(p.brand_id) || 0) + 1);
          }
        });
        
        const brandsWithCounts = brandsData.map((brand: any) => ({
          ...brand,
          product_count: brandCountMap.get(brand.id) || 0
        }));
        
        setBrands(brandsWithCounts);
      }

      // Load units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, actual_name, short_name, allow_decimal')
        .order('actual_name');
      
      if (unitsData) {
        setUnits(unitsData);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const { supabase } = await import('@/utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Load products with filters
      const data = await listProducts({
        search: searchTerm || undefined,
        category_id: categoryFilter !== 'all' ? parseInt(categoryFilter) : undefined,
        is_inactive: statusFilter === 'inactive' ? true : statusFilter === 'active' ? false : undefined,
      });

      // Get default location for stock queries
      const { data: defaultLocation } = await supabase
        .from('business_locations')
        .select('id')
        .limit(1)
        .maybeSingle();

      // Get variations for products to calculate stock
      const productIds = data.map(p => p.id);
      const { data: variations } = await supabase
        .from('variations')
        .select('id, product_id')
        .in('product_id', productIds);

      const variationIds = variations?.map(v => v.id) || [];

      // Get stock for all variations at default location
      const { data: stockData } = await supabase
        .from('variation_location_details')
        .select('variation_id, qty_available')
        .in('variation_id', variationIds)
        .eq('location_id', defaultLocation?.id || 0);

      // Create stock map: variation_id -> qty_available
      const stockMap = new Map<number, number>();
      stockData?.forEach(s => {
        stockMap.set(s.variation_id, parseFloat(s.qty_available?.toString() || '0'));
      });

      // Group stock by product_id
      const productStockMap = new Map<number, number>();
      variations?.forEach(v => {
        const stock = stockMap.get(v.id) || 0;
        const current = productStockMap.get(v.product_id) || 0;
        productStockMap.set(v.product_id, current + stock);
      });

      // Load category and brand relations
      const categoryIds = [...new Set(data.map(p => p.category_id).filter(Boolean) as number[])];
      const brandIds = [...new Set(data.map(p => p.brand_id).filter(Boolean) as number[])];
      
      // Get categories with sub-categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .in('id', categoryIds.length > 0 ? categoryIds : [0]);
      
      // Get brands
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name')
        .in('id', brandIds.length > 0 ? brandIds : [0]);
      
      // Get variations for pricing and display
      const { data: variationsData } = await supabase
        .from('variations')
        .select('id, product_id, product_variation_id, name, retail_price, wholesale_price')
        .in('product_id', productIds)
        .is('deleted_at', null);
      
      // Get product_variations (templates) for grouping
      const productVariationIds = [...new Set(variationsData?.map(v => v.product_variation_id).filter(Boolean) || [])];
      const { data: productVariationsData } = await supabase
        .from('product_variations')
        .select('id, name')
        .in('id', productVariationIds.length > 0 ? productVariationIds : [0]);
      
      // Create maps
      const categoryMap = new Map(categoriesData?.map(c => [c.id, c]) || []);
      const brandMap = new Map(brandsData?.map(b => [b.id, b]) || []);
      const variationMap = new Map<number, any>();
      const productVariationMap = new Map<number, string>();
      
      productVariationsData?.forEach((pv: any) => {
        productVariationMap.set(pv.id, pv.name);
      });
      
      variationsData?.forEach((v: any) => {
        if (!variationMap.has(v.product_id) || v.retail_price) {
          variationMap.set(v.product_id, v);
        }
      });
      
      // Group variations by product_id and product_variation_id
      const variationsByProduct = new Map<number, Map<number, string[]>>();
      variationsData?.forEach((v: any) => {
        if (!variationsByProduct.has(v.product_id)) {
          variationsByProduct.set(v.product_id, new Map());
        }
        const productVariations = variationsByProduct.get(v.product_id)!;
        if (!productVariations.has(v.product_variation_id)) {
          productVariations.set(v.product_variation_id, []);
        }
        productVariations.get(v.product_variation_id)!.push(v.name);
      });
      
      // Build category hierarchy map
      const categoryHierarchy = new Map<number, { main: any; sub: any }>();
      categoriesData?.forEach(cat => {
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            categoryHierarchy.set(cat.id, { main: parent, sub: cat });
          }
        } else {
          categoryHierarchy.set(cat.id, { main: cat, sub: null });
        }
      });

      // Transform products to include stock, status, category, brand, and price
      const productsWithStock = data.map((product) => {
        const stock = productStockMap.get(product.id) || 0;
        const alertQty = product.alert_quantity || 0;
        
        let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        if (stock === 0) {
          status = 'Out of Stock';
        } else if (alertQty > 0 && stock <= alertQty) {
          status = 'Low Stock';
        }

        // Get category with sub-category
        const categoryInfo = product.category_id ? categoryHierarchy.get(product.category_id) : null;
        const category = categoryInfo?.main ? { id: categoryInfo.main.id, name: categoryInfo.main.name } : undefined;
        const sub_category = categoryInfo?.sub ? { id: categoryInfo.sub.id, name: categoryInfo.sub.name } : undefined;
        
        // Get brand
        const brand = product.brand_id ? brandMap.get(product.brand_id) : undefined;
        
        // Get price from variation
        const variation = variationMap.get(product.id);
        const price = variation?.retail_price || 0;

        // Get variations info
        const productVariationsMap = variationsByProduct.get(product.id);
        const variationsInfo: VariationInfo[] = [];
        if (productVariationsMap) {
          productVariationsMap.forEach((variationNames, productVariationId) => {
            const productVariationName = productVariationMap.get(productVariationId);
            if (productVariationName && variationNames.length > 0) {
              variationsInfo.push({
                product_variation_name: productVariationName,
                variation_names: variationNames,
              });
            }
          });
        }
        const variationCount = variationsInfo.reduce((sum, v) => sum + v.variation_names.length, 0);

        return {
          ...product,
          stock,
          status,
          category,
          sub_category,
          brand: brand ? { id: brand.id, name: brand.name } : undefined,
          price,
          variations: variationsInfo.length > 0 ? variationsInfo : undefined,
          variationCount: variationCount > 0 ? variationCount : undefined,
        };
      });

      setProducts(productsWithStock);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalValuation = products.reduce((sum, product) => {
    const stock = product.stock || 0;
    const price = product.price || 0;
    return sum + (stock * price);
  }, 0);

  const lowStockItems = products.filter(p => p.status === 'Low Stock').length;
  const activeCategories = categories.filter(cat => !cat.parent_id && (cat.product_count || 0) > 0).length;

  // Edit modal state
  const [editProduct, setEditProduct] = useState<ProductWithRelations | null>(null);

  // Action Handlers
  const handleEdit = (product: ProductWithRelations) => {
    setEditProduct(product);
  };

  const handleView = (product: ProductWithRelations) => {
    // Show product details in a modal
    setViewProductDetails(product);
  };

  const handlePrintBarcode = (product: ProductWithRelations) => {
    setPrintBarcodeProduct(product);
  };

  const handleDuplicate = async (product: ProductWithRelations) => {
    try {
      toast.loading('Duplicating product...', {
        description: `Creating copy of ${product.name}`,
        id: 'duplicate-product',
      });
      
      const { supabase } = await import('@/utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Get user's business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        throw new Error('Business not found. Please contact support.');
      }

      // Get original product with all relations
      const { data: originalProduct } = await supabase
        .from('products')
        .select('*')
        .eq('id', product.id)
        .single();

      if (!originalProduct) {
        throw new Error('Product not found');
      }

      // Generate new SKU and name
      const timestamp = Date.now();
      const newSku = `${originalProduct.sku}-COPY-${timestamp}`;
      const newName = `${originalProduct.name} (Copy)`;

      // Create duplicate product with business_id and created_by for RLS
      const { data: duplicatedProduct, error: productError } = await supabase
        .from('products')
        .insert({
          business_id: profile.business_id,
          created_by: session.user.id,
          name: newName,
          sku: newSku,
          type: originalProduct.type || 'single',
          unit_id: originalProduct.unit_id,
          secondary_unit_id: originalProduct.secondary_unit_id || null,
          category_id: originalProduct.category_id || null,
          brand_id: originalProduct.brand_id || null,
          alert_quantity: originalProduct.alert_quantity || null,
          is_inactive: false,
        })
        .select()
        .single();

      if (productError || !duplicatedProduct) {
        throw new Error(productError?.message || 'Failed to create duplicate product');
      }

      // Get original product_variations (templates) first
      const { data: originalProductVariations } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', product.id);

      // Create a map to track old -> new product_variation_id
      const productVariationIdMap = new Map<number, number>();

      if (originalProductVariations && originalProductVariations.length > 0) {
        // Duplicate product_variations first
        for (const pv of originalProductVariations) {
          const { data: newProductVariation, error: pvError } = await supabase
            .from('product_variations')
            .insert({
              product_id: duplicatedProduct.id,
              name: pv.name,
              is_dummy: pv.is_dummy,
            })
            .select()
            .single();

          if (pvError || !newProductVariation) {
            console.error('Failed to duplicate product_variation:', pvError);
            continue;
          }

          productVariationIdMap.set(pv.id, newProductVariation.id);
        }
      }

      // Get original variations (instances)
      const { data: originalVariations } = await supabase
        .from('variations')
        .select('*')
        .eq('product_id', product.id)
        .is('deleted_at', null);

      if (originalVariations && originalVariations.length > 0) {
        // Get default location for stock
        const { data: defaultLocation } = await supabase
          .from('business_locations')
          .select('id')
          .eq('business_id', profile.business_id)
          .limit(1)
          .maybeSingle();

        // Duplicate variations
        for (const variation of originalVariations) {
          const newProductVariationId = productVariationIdMap.get(variation.product_variation_id);
          
          if (!newProductVariationId) {
            console.warn(`No product_variation_id mapping found for variation ${variation.id}`);
            continue;
          }

          const { data: newVariation, error: variationError } = await supabase
            .from('variations')
            .insert({
              product_id: duplicatedProduct.id,
              product_variation_id: newProductVariationId,
              name: `${variation.name} (Copy)`,
              sub_sku: variation.sub_sku ? `${variation.sub_sku}-COPY` : null,
              default_purchase_price: variation.default_purchase_price,
              dpp_inc_tax: variation.dpp_inc_tax,
              profit_percent: variation.profit_percent,
              default_sell_price: variation.default_sell_price,
              sell_price_inc_tax: variation.sell_price_inc_tax,
              retail_price: variation.retail_price,
              wholesale_price: variation.wholesale_price,
            })
            .select()
            .single();

          if (variationError || !newVariation) {
            console.error('Failed to duplicate variation:', variationError);
            continue;
          }

          // Duplicate stock (variation_location_details) - start with 0 stock
          if (defaultLocation) {
            await supabase
              .from('variation_location_details')
              .insert({
                variation_id: newVariation.id,
                location_id: defaultLocation.id,
                qty_available: 0, // Start with 0 stock for duplicate
                qty_reserved: 0,
              });
          }
        }
      }

      toast.success('Product duplicated successfully', {
        description: `Created "${newName}"`,
        id: 'duplicate-product',
      });
      
      // Reload products to show the new duplicate
      await loadProducts();
    } catch (err) {
      console.error('Failed to duplicate product:', err);
      toast.error('Failed to duplicate product', {
        description: err instanceof Error ? err.message : 'Unknown error',
        id: 'duplicate-product',
      });
    }
  };

  const handleViewHistory = (product: ProductWithRelations) => {
    setStockHistoryProduct(product);
  };

  const handleDelete = async (product: ProductWithRelations) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) return;

    try {
      const { supabase } = await import('@/utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Authentication required');
      }

      // Delete using Supabase directly
      // First, delete related records (variations, stock, etc.)
      const { data: variations } = await supabase
        .from('variations')
        .select('id')
        .eq('product_id', product.id);

      if (variations && variations.length > 0) {
        const variationIds = variations.map(v => v.id);
        
        // Delete stock records
        await supabase
          .from('variation_location_details')
          .delete()
          .in('variation_id', variationIds);

        // Delete variations
        await supabase
          .from('variations')
          .delete()
          .eq('product_id', product.id);
      }

      // Delete product variations
      await supabase
        .from('product_variations')
        .delete()
        .eq('product_id', product.id);

      // Finally, delete the product
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete product');
      }

      toast.success('Product deleted successfully');
      loadProducts();
    } catch (err) {
      toast.error('Failed to delete product', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  // Filter products based on status filter
  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'in_stock' && p.status === 'In Stock') return true;
    if (statusFilter === 'low_stock' && p.status === 'Low Stock') return true;
    if (statusFilter === 'out_of_stock' && p.status === 'Out of Stock') return true;
    return false;
  });

  // Handle checkbox selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select products to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)?`)) {
      return;
    }

    try {
      const { supabase } = await import('@/utils/supabase/client');
      const productIds = Array.from(selectedProducts);

      // Delete all selected products
      for (const productId of productIds) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        // Delete related records (same as handleDelete)
        const { data: variations } = await supabase
          .from('variations')
          .select('id')
          .eq('product_id', product.id);

        if (variations && variations.length > 0) {
          const variationIds = variations.map(v => v.id);
          await supabase
            .from('variation_location_details')
            .delete()
            .in('variation_id', variationIds);
          await supabase
            .from('variations')
            .delete()
            .eq('product_id', product.id);
        }

        await supabase
          .from('product_variations')
          .delete()
          .eq('product_id', product.id);

        await supabase
          .from('products')
          .delete()
          .eq('id', product.id);
      }

      toast.success(`${selectedProducts.size} product(s) deleted successfully`);
      setSelectedProducts(new Set());
      loadProducts();
    } catch (err) {
      toast.error('Failed to delete products', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  // Define SmartTable columns (Figma Style Headers)
  const columns: Column<ProductWithRelations>[] = [
    {
      key: 'select',
      header: '',
      render: (product) => (
        <input
          type="checkbox"
          checked={selectedProducts.has(product.id)}
          onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
        />
      ),
    },
    {
      key: 'name',
      header: 'PRODUCT DETAILS',
      render: (product) => (
        <ProductNameCell
          image={null}
          name={product.name}
          sku={product.sku}
        />
      ),
    },
    {
      key: 'category',
      header: 'CATEGORY',
      render: (product) => (
        <div className="text-sm">
          <div className="text-white">{product.category?.name || 'N/A'}</div>
          {product.sub_category && (
            <div className="text-gray-400 text-xs">{product.sub_category.name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'BRAND',
      render: (product) => (
        <span className="px-2 py-1 rounded-md bg-gray-800 text-xs text-gray-400 border border-gray-700">
          {product.brand?.name || 'N/A'}
        </span>
      ),
    },
    {
      key: 'variations',
      header: 'VARIATIONS',
      render: (product) => {
        if (!product.variations || product.variations.length === 0) {
          return (
            <span className="text-gray-500 text-xs">No variations</span>
          );
        }
        
        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {product.variations.map((variation, idx) => (
              <div key={idx} className="group relative">
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 cursor-pointer"
                  title={`${variation.product_variation_name}: ${variation.variation_names.join(', ')}`}
                >
                  <span className="font-medium">{variation.product_variation_name}:</span>{' '}
                  <span className="text-blue-300">
                    {variation.variation_names.slice(0, 2).join(', ')}
                    {variation.variation_names.length > 2 && ` +${variation.variation_names.length - 2}`}
                  </span>
                </Badge>
                {/* Tooltip on hover */}
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg min-w-[150px]">
                    <div className="text-xs text-white font-medium mb-1">{variation.product_variation_name}</div>
                    <div className="flex flex-wrap gap-1">
                      {variation.variation_names.map((name, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {product.variationCount && product.variationCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 border-gray-700"
              >
                {product.variationCount} total
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'PRICE',
      render: (product) => (
        <span className="text-white font-medium">
          {formatCurrency(product.price)}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'STOCK LEVEL',
      render: (product) => (
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            product.status === 'In Stock' && "bg-green-500",
            product.status === 'Low Stock' && "bg-yellow-500",
            product.status === 'Out of Stock' && "bg-red-500"
          )} />
          <span className={cn(
            "text-sm",
            product.status === 'In Stock' && "text-green-400",
            product.status === 'Low Stock' && "text-yellow-400",
            product.status === 'Out of Stock' && "text-red-400"
          )}>
            {product.stock || 0} units
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'AVAILABILITY',
      render: (product) => {
        const statusText = product.status === 'In Stock' ? 'Active' : product.status === 'Low Stock' ? 'Low Stock' : 'Out of Stock';
        return (
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium px-2 py-1',
              product.status === 'In Stock' &&
                'bg-green-500/10 text-green-500 border-green-500/20',
              product.status === 'Low Stock' &&
                'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
              product.status === 'Out of Stock' &&
                'bg-red-500/10 text-red-500 border-red-500/20'
            )}
          >
            {statusText}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (product) => (
        <div className="flex justify-end">
          <ProductActionsMenu
            product={product}
            onEdit={handleEdit}
            onView={handleView}
            onPrintBarcode={handlePrintBarcode}
            onDuplicate={handleDuplicate}
            onViewHistory={handleViewHistory}
            onDelete={handleDelete}
          />
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadProducts}
      />
    );
  }

  return (
    <div className="bg-[#0B1019] min-h-screen p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Statistics Cards (Top Row) - Figma Style with Hover Effects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Valuation Card */}
          <div className="bg-[#1F2937] rounded-xl p-5 border border-gray-800 hover:border-emerald-500/50 hover:bg-[#1F2937]/80 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors duration-200">
                <TrendingUp className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-sm mb-1 group-hover:text-gray-300 transition-colors duration-200">Total Valuation</p>
                <p className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors duration-200">{formatCurrency(totalValuation)}</p>
              </div>
            </div>
          </div>

          {/* Low Stock Items Card */}
          <div className="bg-[#1F2937] rounded-xl p-5 border border-gray-800 hover:border-red-500/50 hover:bg-[#1F2937]/80 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center group-hover:bg-red-500/20 transition-colors duration-200">
                <AlertTriangle className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform duration-200" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-sm mb-1 group-hover:text-gray-300 transition-colors duration-200">Low Stock Items</p>
                <p className="text-2xl font-bold text-white group-hover:text-red-400 transition-colors duration-200">{lowStockItems}</p>
              </div>
            </div>
          </div>

          {/* Active Categories Card */}
          <div className="bg-[#1F2937] rounded-xl p-5 border border-gray-800 hover:border-purple-500/50 hover:bg-[#1F2937]/80 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:bg-purple-500/20 transition-colors duration-200">
                <Layers className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-sm mb-1 group-hover:text-gray-300 transition-colors duration-200">Active Categories</p>
                <p className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors duration-200">{activeCategories}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Figma Style - Uniform Design) */}
        <div className="flex items-center gap-1 border-b border-gray-800 justify-center rounded-[10px] bg-gray-800">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              "h-10 px-6 flex items-center gap-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'products'
                ? "text-white border-blue-600 bg-transparent"
                : "text-gray-400 border-transparent hover:text-white"
            )}
          >
            <Package className="w-4 h-4" />
            Products
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              activeTab === 'products' 
                ? "bg-blue-600/20 text-blue-400" 
                : "bg-gray-800/50 text-gray-500"
            )}>
              {filteredProducts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "h-10 px-6 flex items-center gap-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'categories'
                ? "text-white border-blue-600 bg-transparent"
                : "text-gray-400 border-transparent hover:text-white"
            )}
          >
            <FolderTree className="w-4 h-4" />
            Categories
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              activeTab === 'categories' 
                ? "bg-blue-600/20 text-blue-400" 
                : "bg-gray-800/50 text-gray-500"
            )}>
              {categories.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={cn(
              "h-10 px-6 flex items-center gap-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'brands'
                ? "text-white border-blue-600 bg-transparent"
                : "text-gray-400 border-transparent hover:text-white"
            )}
          >
            <Tag className="w-4 h-4" />
            Brands
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              activeTab === 'brands' 
                ? "bg-blue-600/20 text-blue-400" 
                : "bg-gray-800/50 text-gray-500"
            )}>
              {brands.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={cn(
              "h-10 px-6 flex items-center gap-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'units'
                ? "text-white border-blue-600 bg-transparent"
                : "text-gray-400 border-transparent hover:text-white"
            )}
          >
            <Scale className="w-4 h-4" />
            Units
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              activeTab === 'units' 
                ? "bg-blue-600/20 text-blue-400" 
                : "bg-gray-800/50 text-gray-500"
            )}>
              {units.length}
            </span>
          </button>
        </div>

        {/* Action Toolbar & Search (Figma Style) - Only for Products Tab */}
        {activeTab === 'products' && (
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111827] border-gray-800 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border border-gray-800 bg-transparent text-gray-300 hover:bg-gray-800/50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button
                variant="outline"
                className="border border-gray-800 bg-transparent text-gray-300 hover:bg-gray-800/50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => router.push('/products/new')}
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-400 font-medium">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedProducts(new Set())}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Clear Selection
            </Button>
            <Button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Products Table (Figma Style - Unified Card) */}
      {activeTab === 'products' && (
        <>
          {loading ? (
            <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
              <TableSkeleton rows={5} columns={7} />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={loadProducts} />
          ) : (
            <div className="bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
              <SmartTable
                data={filteredProducts}
                columns={columns}
                keyField="id"
                itemsPerPage={10}
                emptyMessage="No products found"
                renderMobileCard={(product) => (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <ProductNameCell
                  image={undefined}
                  name={product.name}
                  sku={product.sku}
                />
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-medium px-2 py-1',
                    product.status === 'In Stock' &&
                      'bg-green-500/10 text-green-500 border-green-500/20',
                    product.status === 'Low Stock' &&
                      'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                    product.status === 'Out of Stock' &&
                      'bg-red-500/10 text-red-500 border-red-500/20'
                  )}
                >
                  {product.status === 'In Stock' ? 'Active' : product.status === 'Low Stock' ? 'Low Stock' : 'Out of Stock'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Category</p>
                  <p className="text-gray-300">{product.category?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Stock</p>
                  <StockCell
                    quantity={product.stock || 0}
                    minLevel={product.alert_quantity}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <ProductActionsMenu
                  product={product}
                  onPrintBarcode={handlePrintBarcode}
                  onDuplicate={handleDuplicate}
                  onViewHistory={handleViewHistory}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          )}
              />
            </div>
          )}
        </>
      )}

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <div className="bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
          {loadingSettings ? (
            <div className="p-12 text-center">
              <p className="text-gray-400">Loading categories...</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.filter(c => !c.parent_id).map((cat) => {
                  const children = categories.filter(c => c.parent_id === cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="group relative bg-[#1F2937] border border-gray-800 rounded-xl p-5 hover:border-blue-500/50 hover:bg-[#1F2937]/80 transition-all duration-200 cursor-pointer"
                    >
                      {/* 3-dots menu - visible on hover */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <DropdownMenu
                          trigger={
                            <button className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50">
                              <MoreVertical size={18} />
                            </button>
                          }
                        >
                          <DropdownMenuItem onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name);
                            setParentCategoryId(cat.parent_id || null);
                            setCategoryModalOpen(true);
                          }}>
                            <Edit2 size={14} className="inline mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            if (confirm(`Delete category "${cat.name}"? This will also delete all sub-categories.`)) {
                              try {
                                const { supabase } = await import('@/utils/supabase/client');
                                const { error } = await supabase
                                  .from('categories')
                                  .delete()
                                  .eq('id', cat.id);
                                if (error) throw error;
                                toast.success('Category deleted');
                                loadSettings();
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to delete category');
                              }
                            }
                          }} className="text-red-400 hover:bg-red-900/20">
                            <Trash2 size={14} className="inline mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </div>
                      
                      {/* Icon - Light blue square with Tag icon */}
                      <div className="mb-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                          <Tag className="w-5 h-5 text-blue-400" />
                        </div>
                      </div>
                      
                      {/* Category Name - Bold white */}
                      <h3 className="text-white font-bold text-lg mb-1 leading-tight">{cat.name}</h3>
                      
                      {/* Product Count - Lighter white, on same line or below */}
                      <p className="text-gray-300 text-sm mb-4 leading-tight">
                        {cat.product_count || 0} Products
                      </p>
                      
                      {/* Sub-Categories Section */}
                      <div className="mb-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2.5 font-semibold">SUB-CATEGORIES</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          {children.length > 0 ? (
                            <>
                              {children.map((child, index) => (
                                <div key={child.id} className="flex items-center gap-1.5">
                                  <span className="px-2.5 py-1 bg-gray-700/60 text-white text-xs rounded-md border border-gray-600/50 font-medium">
                                    {child.name}
                                  </span>
                                  {index === children.length - 1 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setParentCategoryId(cat.id);
                                        setCategoryName('');
                                        setCategoryModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 bg-gray-700/60 hover:bg-blue-500/20 text-white text-xs rounded-md border border-gray-600/50 flex items-center justify-center transition-colors duration-200"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setParentCategoryId(cat.id);
                                setCategoryName('');
                                setCategoryModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-gray-700/60 hover:bg-blue-500/20 text-white text-xs rounded-md border border-gray-600/50 flex items-center justify-center transition-colors duration-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    setCategoryName('');
                    setParentCategoryId(null);
                    setCategoryModalOpen(true);
                  }}
                  className="group relative bg-[#1F2937]/30 border-2 border-dashed border-gray-700 rounded-xl p-5 hover:border-blue-500/50 hover:bg-[#1F2937]/50 transition-all min-h-[200px] flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-500/10 transition-colors">
                    <Plus className="w-6 h-6 text-white group-hover:text-blue-400 transition-colors" />
                  </div>
                  <p className="text-white font-medium group-hover:text-white transition-colors">Add New Category</p>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brands Tab Content - Figma Style */}
      {activeTab === 'brands' && (
        <div className="bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
          {loadingSettings ? (
            <div className="p-12 text-center">
              <p className="text-gray-400">Loading brands...</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {brands.map((brand) => {
                  const initials = brand.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                  const productCount = brand.product_count || 0;
                  
                  return (
                    <div
                      key={brand.id}
                      className="group relative bg-[#1F2937] border border-gray-800 rounded-xl p-5 hover:border-purple-500/50 transition-all"
                    >
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <DropdownMenu
                          trigger={
                            <button className="text-gray-400 hover:text-white transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          }
                        >
                          <DropdownMenuItem onClick={() => {
                            setEditingBrand(brand);
                            setBrandName(brand.name);
                            setBrandModalOpen(true);
                          }}>
                            <Edit2 size={14} className="inline mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            if (confirm(`Delete brand "${brand.name}"?`)) {
                              try {
                                const { supabase } = await import('@/utils/supabase/client');
                                const { error } = await supabase
                                  .from('brands')
                                  .delete()
                                  .eq('id', brand.id);
                                if (error) throw error;
                                toast.success('Brand deleted');
                                loadSettings();
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to delete brand');
                              }
                            }
                          }} className="text-red-400 hover:bg-red-900/20">
                            <Trash2 size={14} className="inline mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </div>
                      <div className="mb-4 flex justify-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                          <span className="text-gray-900 font-bold text-base">{initials}</span>
                        </div>
                      </div>
                      <h3 className="text-white font-bold text-xl mb-1 text-center">{brand.name}</h3>
                      <p className="text-gray-400 text-sm mb-3 text-center">Pakistan</p>
                      <div className="mt-auto flex justify-center">
                        <span className="inline-block px-3 py-1 bg-gray-700/50 text-white text-xs rounded-full">
                          {productCount} Products
                        </span>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    setBrandName('');
                    setBrandModalOpen(true);
                  }}
                  className="group relative bg-[#1F2937]/30 border-2 border-dashed border-gray-700 rounded-xl p-5 hover:border-purple-500/50 hover:bg-[#1F2937]/50 transition-all min-h-[200px] flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/10 transition-colors">
                    <Plus className="w-6 h-6 text-white group-hover:text-purple-400 transition-colors" />
                  </div>
                  <p className="text-white font-medium group-hover:text-white transition-colors">Add Brand</p>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Units Tab Content - Figma Style */}
      {activeTab === 'units' && (
        <div className="bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
          {loadingSettings ? (
            <div className="p-12 text-center">
              <p className="text-gray-400">Loading units...</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Measurement Units</h2>
                  <p className="text-gray-400 text-sm">Manage base units for products</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {units.map((unit) => {
                  // Determine unit type based on name
                  const getUnitType = (name: string): string => {
                    const lower = name.toLowerCase();
                    if (lower.includes('piece') || lower.includes('pc') || lower.includes('box') || lower.includes('unit')) {
                      return 'Count';
                    }
                    if (lower.includes('meter') || lower.includes('m') || lower.includes('yard') || lower.includes('yd') || lower.includes('foot') || lower.includes('ft') || lower.includes('inch')) {
                      return 'Length';
                    }
                    if (lower.includes('kg') || lower.includes('kilogram') || lower.includes('gram') || lower.includes('g') || lower.includes('pound') || lower.includes('lb') || lower.includes('ounce') || lower.includes('oz')) {
                      return 'Weight';
                    }
                    if (lower.includes('liter') || lower.includes('l') || lower.includes('gallon') || lower.includes('ml')) {
                      return 'Volume';
                    }
                    return 'Count';
                  };
                  
                  return (
                    <div
                      key={unit.id}
                      className="group flex items-center justify-between p-4 bg-[#1F2937] rounded-xl border border-gray-800 hover:border-green-500/50 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">{unit.short_name}</span>
                        </div>
                        <div className="flex-1">
                          <span className="text-white font-semibold block text-base">{unit.actual_name}</span>
                          <span className="text-gray-400 text-sm">{getUnitType(unit.actual_name)}</span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingUnit(unit);
                            setUnitName(unit.actual_name);
                            setUnitShortName(unit.short_name);
                            setAllowDecimal(unit.allow_decimal);
                            setUnitModalOpen(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete unit "${unit.actual_name}"?`)) {
                              try {
                                const { supabase } = await import('@/utils/supabase/client');
                                const { error } = await supabase
                                  .from('units')
                                  .delete()
                                  .eq('id', unit.id);
                                if (error) throw error;
                                toast.success('Unit deleted');
                                loadSettings();
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to delete unit');
                              }
                            }
                          }}
                          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    setUnitName('');
                    setUnitShortName('');
                    setAllowDecimal(false);
                    setUnitModalOpen(true);
                  }}
                  className="group w-full p-4 bg-[#1F2937]/30 border-2 border-dashed border-gray-700 rounded-xl hover:border-green-500/50 hover:bg-[#1F2937]/50 transition-all flex items-center justify-center gap-3"
                >
                  <Plus className="w-5 h-5 text-white group-hover:text-green-400 transition-colors" />
                  <p className="text-white font-medium group-hover:text-white transition-colors">Add New Unit</p>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50">
          <AddProductForm
            productId={editProduct.id}
            onClose={() => {
              setEditProduct(null);
              loadProducts();
            }}
            onSuccess={() => {
              setEditProduct(null);
              loadProducts();
            }}
          />
        </div>
      )}

      {/* Modals */}
      <PrintBarcodeModal
        isOpen={printBarcodeProduct !== null}
        onClose={() => setPrintBarcodeProduct(null)}
        product={printBarcodeProduct}
      />
      <StockHistoryModal
        isOpen={stockHistoryProduct !== null}
        onClose={() => setStockHistoryProduct(null)}
        product={stockHistoryProduct}
      />

      {/* View Product Details Modal */}
      <Dialog open={viewProductDetails !== null} onOpenChange={(open) => {
        if (!open) setViewProductDetails(null);
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={() => setViewProductDetails(null)} />
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Product Details</DialogTitle>
          </DialogHeader>
          {viewProductDetails && (
            <div className="space-y-6">
              {/* Product Header */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-800">
                <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl font-bold text-gray-400">
                  {viewProductDetails.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{viewProductDetails.name}</h3>
                  <p className="text-sm text-gray-400">SKU: {viewProductDetails.sku}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-medium px-3 py-1',
                    viewProductDetails.status === 'In Stock' &&
                      'bg-green-500/10 text-green-500 border-green-500/20',
                    viewProductDetails.status === 'Low Stock' &&
                      'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                    viewProductDetails.status === 'Out of Stock' &&
                      'bg-red-500/10 text-red-500 border-red-500/20'
                  )}
                >
                  {viewProductDetails.status || 'Active'}
                </Badge>
              </div>

              {/* Product Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Category</p>
                  <p className="text-white font-medium">
                    {viewProductDetails.category?.name || 'N/A'}
                    {viewProductDetails.sub_category && ` / ${viewProductDetails.sub_category.name}`}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Brand</p>
                  <p className="text-white font-medium">{viewProductDetails.brand?.name || 'N/A'}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Price</p>
                  <p className="text-white font-medium text-lg">{formatCurrency(viewProductDetails.price)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Stock Level</p>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      viewProductDetails.status === 'In Stock' && 'bg-green-500',
                      viewProductDetails.status === 'Low Stock' && 'bg-yellow-500',
                      viewProductDetails.status === 'Out of Stock' && 'bg-red-500'
                    )} />
                    <p className="text-white font-medium">{viewProductDetails.stock || 0} units</p>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Unit</p>
                  <p className="text-white font-medium">{viewProductDetails.unit?.actual_name || 'N/A'}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Alert Quantity</p>
                  <p className="text-white font-medium">{viewProductDetails.alert_quantity || 'Not set'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <Button
                  onClick={() => {
                    handleEdit(viewProductDetails);
                    setViewProductDetails(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Edit Product
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewProductDetails(null)}
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={(open) => {
        setCategoryModalOpen(open);
        if (!open) {
          setCategoryName('');
          setParentCategoryId(null);
        }
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogClose onClose={() => {
            setCategoryModalOpen(false);
            setCategoryName('');
            setParentCategoryId(null);
          }} />
          <DialogHeader>
            <DialogTitle className="text-white">
              {parentCategoryId ? 'Add Sub-Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            categoryName={categoryName}
            setCategoryName={setCategoryName}
            parentCategoryId={parentCategoryId}
            setParentCategoryId={setParentCategoryId}
            categories={categories}
            onSave={async () => {
              await loadSettings();
              setCategoryModalOpen(false);
              setCategoryName('');
              setParentCategoryId(null);
            }}
            onClose={() => {
              setCategoryModalOpen(false);
              setCategoryName('');
              setParentCategoryId(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Brand Modal */}
      <Dialog open={brandModalOpen} onOpenChange={(open) => {
        setBrandModalOpen(open);
        if (!open) {
          setBrandName('');
        }
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogClose onClose={() => {
            setBrandModalOpen(false);
            setBrandName('');
          }} />
          <DialogHeader>
            <DialogTitle className="text-white">Add Brand</DialogTitle>
          </DialogHeader>
          <BrandForm
            brandName={brandName}
            setBrandName={setBrandName}
            onSave={async () => {
              await loadSettings();
              setBrandModalOpen(false);
              setBrandName('');
            }}
            onClose={() => {
              setBrandModalOpen(false);
              setBrandName('');
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Unit Modal */}
      <Dialog open={unitModalOpen} onOpenChange={(open) => {
        setUnitModalOpen(open);
        if (!open) {
          setUnitName('');
          setUnitShortName('');
          setAllowDecimal(false);
        }
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogClose onClose={() => {
            setUnitModalOpen(false);
            setUnitName('');
            setUnitShortName('');
            setAllowDecimal(false);
          }} />
          <DialogHeader>
            <DialogTitle className="text-white">Add Unit</DialogTitle>
          </DialogHeader>
          <UnitForm
            unitName={unitName}
            setUnitName={setUnitName}
            unitShortName={unitShortName}
            setUnitShortName={setUnitShortName}
            allowDecimal={allowDecimal}
            setAllowDecimal={setAllowDecimal}
            onSave={async () => {
              await loadSettings();
              setUnitModalOpen(false);
              setUnitName('');
              setUnitShortName('');
              setAllowDecimal(false);
            }}
            onClose={() => {
              setUnitModalOpen(false);
              setUnitName('');
              setUnitShortName('');
              setAllowDecimal(false);
            }}
          />
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

