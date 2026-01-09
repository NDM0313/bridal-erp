/**
 * Add Product Form Component
 * Matches Figma design with sections, colored bars, and icons
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Package, DollarSign, RotateCcw, HelpCircle, Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategoryForm } from './CategoryForm';
import { BrandForm } from './BrandForm';
import { UnitForm } from './UnitForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { useGlobalRefresh } from '@/lib/hooks/useGlobalRefresh';

interface AddProductFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (productId?: number, productName?: string) => void; // Pass product ID and name on success
  productId?: number; // For editing existing product
  initialName?: string; // Pre-fill product name (for Quick Add from Sales)
}

export function AddProductForm({ isOpen = true, onClose, onSuccess, productId, initialName }: AddProductFormProps) {
  const { handleSuccess } = useGlobalRefresh();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rentalExpanded, setRentalExpanded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: 'AUTO-GENERATED',
    barcode_type: 'C128', // Default to valid barcode type
    brand_id: 0,
    category_id: 0,
    sub_category_id: 0,
    unit_id: 0,
    purchase_price: 0,
    profit_margin: 30,
    selling_price: 0,
    tax_type: '',
    initial_stock: 0,
    opening_stock_date: '', // Date for opening stock (required if product is old)
    alert_quantity: 0,
    enable_tracking: false,
    // Rental fields
    is_rentable: false,
    rental_price: 0,
    security_deposit: 0,
  });

  const [units, setUnits] = useState<Array<{ id: number; actual_name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; parent_id?: number | null }>>([]);
  const [subCategories, setSubCategories] = useState<Array<{ id: number; name: string; parent_id: number }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);
  
  // Modal states for adding new items
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
  const [brandName, setBrandName] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitShortName, setUnitShortName] = useState('');
  const [allowDecimal, setAllowDecimal] = useState(false);
  
  // Variations state
  const [enableVariations, setEnableVariations] = useState(false);
  const [variations, setVariations] = useState<Array<{
    id: string;
    name: string; // "Size", "Color", "Fabric"
    values: Array<{
      id: string;
      name: string; // "XL", "Red", "Cotton"
      additionalPrice?: number;
      subSku?: string;
    }>;
  }>>([]);

  useEffect(() => {
    loadOptions();
    if (productId) {
      loadProductData(productId);
    } else if (initialName && !formData.name) {
      // Pre-fill name when opened from Quick Add
      setFormData((prev) => ({ ...prev, name: initialName }));
    }
  }, [productId, initialName]);

  useEffect(() => {
    // Calculate selling price from purchase price and profit margin
    if (formData.purchase_price > 0 && formData.profit_margin > 0) {
      const calculated = formData.purchase_price * (1 + formData.profit_margin / 100);
      setFormData((prev) => ({ ...prev, selling_price: Math.round(calculated * 100) / 100 }));
    }
  }, [formData.purchase_price, formData.profit_margin]);

  // Load sub-categories when category is selected
  useEffect(() => {
    const loadSubCategories = async () => {
      if (formData.category_id > 0) {
        const { data: subCats } = await supabase
          .from('categories')
          .select('id, name, parent_id')
          .eq('parent_id', formData.category_id)
          .order('name');
        
        if (subCats) {
          setSubCategories(subCats);
        } else {
          setSubCategories([]);
        }
        // Reset sub-category selection when parent category changes
        setFormData(prev => ({ ...prev, sub_category_id: 0 }));
      } else {
        setSubCategories([]);
        setFormData(prev => ({ ...prev, sub_category_id: 0 }));
      }
    };

    loadSubCategories();
  }, [formData.category_id]);

  const loadOptions = async () => {
    const { data: unitsData } = await supabase.from('units').select('id, actual_name').order('actual_name');
    const { data: categoriesData } = await supabase.from('categories').select('id, name, parent_id').order('name');
    const { data: brandsData } = await supabase.from('brands').select('id, name').order('name');

    if (unitsData) setUnits(unitsData);
    if (categoriesData) setCategories(categoriesData);
    if (brandsData) setBrands(brandsData);
  };

  // Load sub-categories when category is selected
  useEffect(() => {
    const loadSubCategories = async () => {
      if (formData.category_id > 0) {
        const { data: subCats } = await supabase
          .from('categories')
          .select('id, name, parent_id')
          .eq('parent_id', formData.category_id)
          .order('name');
        
        if (subCats) {
          setSubCategories(subCats);
        } else {
          setSubCategories([]);
        }
        // Reset sub-category selection when parent category changes
        setFormData(prev => ({ ...prev, sub_category_id: 0 }));
      } else {
        setSubCategories([]);
        setFormData(prev => ({ ...prev, sub_category_id: 0 }));
      }
    };

    loadSubCategories();
  }, [formData.category_id]);

  const generateSKU = () => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData((prev) => ({ ...prev, sku: `SKU-${random}` }));
    toast.success('SKU generated');
  };

  const generateVariationSKU = (baseSku: string, variationName: string, index?: number) => {
    const cleanName = variationName.replace(/\s+/g, '').toUpperCase().substring(0, 3);
    const suffix = index !== undefined ? `-${index + 1}` : '';
    return `${baseSku}-${cleanName}${suffix}`;
  };

  const loadProductData = async (id: number) => {
    setLoadingProduct(true);
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      setIsEditMode(true);

      // Load product variations and variations
      const { data: productVariations } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', id)
        .eq('is_dummy', false);

      const { data: variationsData } = await supabase
        .from('variations')
        .select('*')
        .eq('product_id', id)
        .is('deleted_at', null);

      // Group variations by product_variation_id
      const variationsByTemplate = new Map<number, any[]>();
      variationsData?.forEach((v: any) => {
        if (!variationsByTemplate.has(v.product_variation_id)) {
          variationsByTemplate.set(v.product_variation_id, []);
        }
        variationsByTemplate.get(v.product_variation_id)!.push(v);
      });

      // Get default variation for pricing
      const defaultVariation = variationsData?.find((v: any) => v.name === 'default' || !v.name);
      const retailPrice = defaultVariation?.retail_price || 0;
      const purchasePrice = defaultVariation?.default_purchase_price || 0;

      // Build variations state
      const loadedVariations = productVariations?.map((pv: any) => {
        const values = variationsByTemplate.get(pv.id)?.map((v: any) => ({
          id: `val-${v.id}`,
          name: v.name,
          additionalPrice: 0, // Calculate from retail_price if needed
          subSku: v.sub_sku || '',
        })) || [];

        return {
          id: `var-${pv.id}`,
          name: pv.name,
          values,
        };
      }) || [];

      // Set form data
      setFormData({
        name: product.name || '',
        sku: product.sku || 'AUTO-GENERATED',
        barcode_type: product.barcode_type || 'C128',
        brand_id: product.brand_id || 0,
        category_id: product.category_id || 0,
        sub_category_id: product.sub_category_id || 0,
        unit_id: product.unit_id || 0,
        purchase_price: purchasePrice,
        profit_margin: purchasePrice > 0 ? ((retailPrice - purchasePrice) / purchasePrice) * 100 : 30,
        selling_price: retailPrice,
        tax_type: product.tax_type || '',
        initial_stock: 0, // Don't load initial stock in edit mode
        alert_quantity: product.alert_quantity || 0,
        enable_tracking: product.enable_stock || false,
        is_rentable: false,
        rental_price: 0,
        security_deposit: 0,
        opening_stock_date: new Date().toISOString().split('T')[0], // Add default date
      });

      if (loadedVariations.length > 0) {
        setEnableVariations(true);
        setVariations(loadedVariations);
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      toast.error('Failed to load product data');
      if (onClose) onClose();
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name || !formData.sku || formData.sku === 'AUTO-GENERATED' || !formData.unit_id) {
        setError('Name, SKU, and Unit are required');
        setLoading(false);
        return;
      }

      // Get session and business_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        throw new Error('Business not found. Please contact support.');
      }

      // Check if SKU already exists (only for new products)
      if (!isEditMode) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('business_id', profile.business_id)
          .eq('sku', formData.sku)
          .single();

        if (existingProduct) {
          throw new Error('SKU already exists. Please use a different SKU.');
        }
      }

      // Validate barcode_type - must be one of the allowed values
      const allowedBarcodeTypes = ['C39', 'C128', 'EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'ITF-14'];
      const barcodeType = formData.barcode_type && allowedBarcodeTypes.includes(formData.barcode_type) 
        ? formData.barcode_type 
        : 'C128'; // Default to C128 if invalid or empty

      // Prepare product data
      const productData: any = {
        business_id: profile.business_id,
        name: formData.name,
        sku: formData.sku,
        type: 'single',
        unit_id: formData.unit_id,
        barcode_type: barcodeType,
        enable_stock: formData.enable_tracking,
        alert_quantity: formData.alert_quantity || 0,
        is_inactive: false,
        created_by: session.user.id,
      };

      // Add optional fields
      if (formData.category_id) {
        productData.category_id = formData.category_id;
      }
      if (formData.sub_category_id) {
        productData.sub_category_id = formData.sub_category_id;
      }
      if (formData.brand_id) {
        productData.brand_id = formData.brand_id;
      }
      if (formData.tax_type) {
        productData.tax_type = formData.tax_type;
      }

      let newProduct;
      if (isEditMode && productId) {
        // Update existing product
        const { data: updatedProduct, error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId)
          .select()
          .single();

        if (updateError) {
          console.error('Product update error:', updateError);
          throw new Error(updateError.message || 'Failed to update product');
        }

        if (!updatedProduct) {
          throw new Error('Product update failed');
        }

        newProduct = updatedProduct;

        // Delete existing variations if variations are enabled
        if (enableVariations && variations.length > 0) {
          // Delete old variations
          const { data: oldVariations } = await supabase
            .from('variations')
            .select('id')
            .eq('product_id', productId);

          if (oldVariations && oldVariations.length > 0) {
            const oldVariationIds = oldVariations.map(v => v.id);
            await supabase
              .from('variation_location_details')
              .delete()
              .in('variation_id', oldVariationIds);
            await supabase
              .from('variations')
              .delete()
              .in('id', oldVariationIds);
          }

          // Delete old product_variations
          await supabase
            .from('product_variations')
            .delete()
            .eq('product_id', productId);
        }
      } else {
        // Insert new product
        const { data: insertedProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (insertError) {
          console.error('Product insert error:', insertError);
          throw new Error(insertError.message || 'Failed to create product');
        }

        if (!insertedProduct) {
          throw new Error('Product created but failed to retrieve data');
        }

        newProduct = insertedProduct;
      }

      // Get business financial year info
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('fy_start_month, start_date')
        .eq('id', profile.business_id)
        .single();

      if (businessError) {
        console.error('Error fetching business:', businessError);
      }

      // Calculate current financial year start date
      const getCurrentFinancialYearStart = (fyStartMonth: number): Date => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
        
        let fyStartYear = currentYear;
        if (currentMonth < fyStartMonth) {
          fyStartYear = currentYear - 1;
        }
        
        return new Date(fyStartYear, fyStartMonth - 1, 1);
      };

      const fyStartMonth = business?.fy_start_month || 1;
      const currentFYStart = getCurrentFinancialYearStart(fyStartMonth);
      const isNewProduct = !isEditMode || (newProduct && new Date(newProduct.created_at) >= currentFYStart);
      const needsStockAdjustment = isEditMode && formData.initial_stock > 0 && formData.opening_stock_date;

      // Get default location for stock
      const { data: defaultLocation, error: locationError } = await supabase
        .from('business_locations')
        .select('id')
        .eq('business_id', profile.business_id)
        .limit(1)
        .maybeSingle();

      if (locationError) {
        console.error('Error fetching default location:', locationError);
      }

      if (!defaultLocation) {
        console.warn('No default location found for business. Stock will not be saved.');
        toast.warning('No business location found. Stock cannot be saved. Please create a location first.');
      }

      // Validate opening stock date for old products
      if (isEditMode && formData.initial_stock > 0 && !formData.opening_stock_date) {
        throw new Error('Opening Stock Date is required when adding stock to an existing product. Please select a date for the stock adjustment.');
      }

      // Helper function to create stock adjustment transaction
      const createStockAdjustment = async (variationId: number, quantity: number, unitId: number) => {
        if (!defaultLocation || !formData.opening_stock_date) return;

        // Create stock adjustment transaction
        const { data: adjustmentTransaction, error: transError } = await supabase
          .from('transactions')
          .insert({
            business_id: profile.business_id,
            location_id: defaultLocation.id,
            type: 'stock_adjustment',
            status: 'final',
            transaction_date: formData.opening_stock_date,
            payment_status: 'paid',
            total_before_tax: 0,
            tax_amount: 0,
            discount_amount: 0,
            final_total: 0,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (transError || !adjustmentTransaction) {
          console.error('Failed to create stock adjustment transaction:', transError);
          throw new Error('Failed to create stock adjustment transaction');
        }

        // Create stock adjustment line
        const { error: lineError } = await supabase
          .from('stock_adjustment_lines')
          .insert({
            transaction_id: adjustmentTransaction.id,
            product_id: newProduct.id,
            variation_id: variationId,
            quantity: quantity,
            unit_id: unitId,
            adjustment_type: 'increase',
            reason: 'Opening stock adjustment',
          });

        if (lineError) {
          console.error('Failed to create stock adjustment line:', lineError);
          throw new Error('Failed to create stock adjustment line');
        }

        return adjustmentTransaction;
      };

      if (enableVariations && variations.length > 0) {
        // Create variations (Size, Color, Fabric, etc.)
        for (const variationTemplate of variations) {
          if (!variationTemplate.name.trim() || variationTemplate.values.length === 0) {
            continue; // Skip empty variation templates
          }

          // Create product_variation (template)
          const { data: productVariation, error: pvError } = await supabase
            .from('product_variations')
            .insert({
              product_id: newProduct.id,
              name: variationTemplate.name.trim(),
              is_dummy: false,
            })
            .select()
            .single();

          if (pvError || !productVariation) {
            console.error('Failed to create product_variation:', pvError);
            continue;
          }

          // Create variation instances (values)
          for (let valIdx = 0; valIdx < variationTemplate.values.length; valIdx++) {
            const value = variationTemplate.values[valIdx];
            if (!value.name.trim()) {
              continue; // Skip empty values
            }

            const basePrice = formData.selling_price || 0;
            const finalPrice = basePrice + (value.additionalPrice || 0);

            // Auto-generate SKU if not provided or empty
            let subSku = value.subSku?.trim();
            if (!subSku || subSku === '') {
              subSku = generateVariationSKU(formData.sku, value.name.trim(), valIdx);
            }

            const { data: variation, error: vError } = await supabase
              .from('variations')
              .insert({
                product_id: newProduct.id,
                product_variation_id: productVariation.id,
                name: value.name.trim(),
                sub_sku: subSku,
                default_purchase_price: formData.purchase_price || 0,
                default_sell_price: finalPrice,
                retail_price: finalPrice,
                wholesale_price: finalPrice,
              })
              .select()
              .single();

            if (vError || !variation) {
              console.error('Failed to create variation:', vError);
              continue;
            }

            // Create or update stock entry if default location exists
            if (defaultLocation) {
              // Check if stock entry already exists
              const { data: existingStock } = await supabase
                .from('variation_location_details')
                .select('id, qty_available')
                .eq('variation_id', variation.id)
                .eq('location_id', defaultLocation.id)
                .maybeSingle();

              // If old product with date, create stock adjustment transaction
              if (needsStockAdjustment) {
                await createStockAdjustment(variation.id, formData.initial_stock, formData.unit_id);
              }

              if (existingStock) {
                // Update existing stock (add to existing if stock adjustment, otherwise set)
                const newQty = needsStockAdjustment 
                  ? (parseFloat(existingStock.qty_available.toString()) + formData.initial_stock)
                  : formData.initial_stock;

                const { error: updateError } = await supabase
                  .from('variation_location_details')
                  .update({
                    qty_available: newQty,
                  })
                  .eq('id', existingStock.id);
                
                if (updateError) {
                  console.error('Failed to update stock:', updateError);
                  toast.error(`Failed to update stock: ${updateError.message}`);
                } else {
                  console.log(`Stock updated successfully for variation ${variation.id}: ${newQty}`);
                }
              } else {
                // Insert new stock with all required fields
                const { error: insertError } = await supabase
                  .from('variation_location_details')
                  .insert({
                    variation_id: variation.id,
                    product_id: newProduct.id,
                    product_variation_id: productVariation.id,
                    location_id: defaultLocation.id,
                    qty_available: formData.initial_stock || 0,
                  });
                
                if (insertError) {
                  console.error('Failed to insert stock:', insertError);
                  toast.error(`Failed to save stock: ${insertError.message}`);
                } else {
                  console.log(`Stock saved successfully for variation ${variation.id}: ${formData.initial_stock}`);
                }
              }
            } else {
              console.warn('No default location found. Stock not saved for variation:', variation.id);
            }
          }
        }
      } else {
        // Create default product variation for single products
        const { error: variationError } = await supabase
          .from('product_variations')
          .insert({
            product_id: newProduct.id,
            name: 'default',
            is_dummy: true,
          });

        if (variationError) {
          console.error('Failed to create product variation:', variationError);
        }

        // Create default variation entry
        const { data: variation } = await supabase
          .from('product_variations')
          .select('id')
          .eq('product_id', newProduct.id)
          .single();

        if (variation) {
          const { error: variationDetailError } = await supabase
            .from('variations')
            .insert({
              product_id: newProduct.id,
              product_variation_id: variation.id,
              name: 'default',
              sub_sku: formData.sku,
              default_purchase_price: formData.purchase_price || 0,
              default_sell_price: formData.selling_price || 0,
              retail_price: formData.selling_price || 0,
              wholesale_price: formData.selling_price || 0,
            });

          if (variationDetailError) {
            console.error('Failed to create variation detail:', variationDetailError);
          } else if (defaultLocation) {
            // Get the created variation to add/update stock
            const { data: createdVariation } = await supabase
              .from('variations')
              .select('id')
              .eq('product_id', newProduct.id)
              .eq('product_variation_id', variation.id)
              .single();

            if (createdVariation) {
              // If old product with date, create stock adjustment transaction
              if (needsStockAdjustment && formData.initial_stock > 0) {
                await createStockAdjustment(createdVariation.id, formData.initial_stock, formData.unit_id);
              }

              // Check if stock entry already exists
              const { data: existingStock } = await supabase
                .from('variation_location_details')
                .select('id, qty_available')
                .eq('variation_id', createdVariation.id)
                .eq('location_id', defaultLocation.id)
                .maybeSingle();

              if (existingStock) {
                // Update existing stock (add to existing if stock adjustment, otherwise set)
                const newQty = needsStockAdjustment && formData.initial_stock > 0
                  ? (parseFloat(existingStock.qty_available.toString()) + formData.initial_stock)
                  : formData.initial_stock;

                const { error: updateError } = await supabase
                  .from('variation_location_details')
                  .update({
                    qty_available: newQty,
                  })
                  .eq('id', existingStock.id);
                
                if (updateError) {
                  console.error('Failed to update stock:', updateError);
                  toast.error(`Failed to update stock: ${updateError.message}`);
                } else {
                  console.log(`Stock updated successfully for default variation: ${newQty}`);
                }
              } else {
                // Insert new stock with all required fields
                const { error: insertError } = await supabase
                  .from('variation_location_details')
                  .insert({
                    variation_id: createdVariation.id,
                    product_id: newProduct.id,
                    product_variation_id: variation.id,
                    location_id: defaultLocation.id,
                    qty_available: formData.initial_stock || 0,
                  });
                
                if (insertError) {
                  console.error('Failed to insert stock:', insertError);
                  toast.error(`Failed to save stock: ${insertError.message}`);
                } else {
                  console.log(`Stock saved successfully for default variation: ${formData.initial_stock}`);
                }
              }
            } else {
              console.warn('Created variation not found. Stock not saved.');
            }
          } else {
            console.warn('No default location found. Stock not saved for default product.');
          }
        }
      }

      // Refresh products and inventory lists immediately
      await handleSuccess('products', isEditMode ? 'Product updated successfully!' : 'Product created successfully!', ['inventory']);
      
      if (onSuccess) onSuccess(newProduct.id, newProduct.name);
      if (onClose) onClose();
      else router.push('/products');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(`Failed to create product: ${errorMessage}`);
      console.error('Product creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (!open && onClose) {
      onClose();
    }
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent 
        side="right" 
        className="bg-[#0B0F1A] border-l border-gray-800 p-0 overflow-hidden [&>button]:hidden w-full sm:w-full md:max-w-[1000px] h-screen z-[1002] [&+div]:z-[1001]"
        onClick={(e) => {
          // Prevent clicks inside modal from closing it
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          // Prevent mousedown events from bubbling to parent
          e.stopPropagation();
        }}
      >
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <SheetHeader className="border-b border-gray-800 p-6 bg-[#0B0F1A]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={onClose || (() => router.back())} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
                <div>
                  <SheetTitle className="text-2xl font-bold text-white">
                    {isEditMode ? 'Edit Product' : 'Add New Product'}
                  </SheetTitle>
                  <p className="text-sm text-gray-400 mt-1">
                    {isEditMode ? 'Update product details' : 'Complete product details for inventory'}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Content */}
          <div 
            className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0B0F1A]"
            onClick={(e) => {
              // Prevent clicks inside form from bubbling
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              // Prevent mousedown events from bubbling
              e.stopPropagation();
            }}
          >
            {/* Form */}
            <form 
              onSubmit={handleSubmit} 
              className="space-y-8"
              onClick={(e) => {
                // Prevent form clicks from bubbling
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                // Prevent form mousedown from bubbling
                e.stopPropagation();
              }}
            >
          {loadingProduct && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-3 rounded-lg">
              Loading product data...
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Section 1: Product Identity (Purple) */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-lg" />
            <div className="pl-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Package size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white">Product Identity</h3>
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  Product Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cotton Premium Shirt"
                  className="bg-[#111827] border-gray-800 text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  SKU / Code <span className="text-red-400">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={generateSKU}
                    className="text-gray-400 hover:text-white"
                  >
                    <RotateCcw size={18} />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-white mb-2 block">Barcode Type</Label>
                <select
                  value={formData.barcode_type || 'C128'}
                  onChange={(e) => setFormData({ ...formData, barcode_type: e.target.value || 'C128' })}
                    className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="C128">CODE-128</option>
                  <option value="C39">CODE-39</option>
                  <option value="EAN-13">EAN-13</option>
                  <option value="EAN-8">EAN-8</option>
                  <option value="UPC-A">UPC-A</option>
                  <option value="UPC-E">UPC-E</option>
                  <option value="ITF-14">ITF-14</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Classification (Purple) */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-lg" />
            <div className="pl-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Classification</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">Brand</Label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'add-new') {
                        setShowBrandModal(true);
                      } else {
                        setFormData({ ...formData, brand_id: parseInt(value) });
                      }
                    }}
                    className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 text-white"
                  >
                    <option value={0}>Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                    <option value="add-new" className="bg-blue-600 text-white font-semibold">
                      + Add New Brand
                    </option>
                  </select>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Category</Label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'add-new') {
                        setShowCategoryModal(true);
                      } else {
                        setFormData({ ...formData, category_id: parseInt(value) });
                      }
                    }}
                    className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 text-white"
                  >
                    <option value={0}>Select Category</option>
                    {categories.filter(cat => !cat.parent_id).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                    <option value="add-new" className="bg-blue-600 text-white font-semibold">
                      + Add New Category
                    </option>
                  </select>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Sub-Category</Label>
                  <select
                    value={formData.sub_category_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'add-new') {
                        setShowCategoryModal(true);
                      } else {
                        setFormData({ ...formData, sub_category_id: parseInt(value) });
                      }
                    }}
                    disabled={!formData.category_id || formData.category_id === 0}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value={0}>
                      {formData.category_id ? 'Select Sub-Category' : 'Select Category First'}
                    </option>
                    {subCategories.map((subCat) => (
                      <option key={subCat.id} value={subCat.id}>
                        {subCat.name}
                      </option>
                    ))}
                    {formData.category_id > 0 && (
                      <option value="add-new" className="bg-blue-600 text-white font-semibold">
                        + Add New Sub-Category
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <Label className="text-white mb-2 block">
                    Unit <span className="text-red-400">*</span>
                  </Label>
                  <select
                    required
                    value={formData.unit_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'add-new') {
                        setShowUnitModal(true);
                      } else {
                        setFormData({ ...formData, unit_id: parseInt(value) });
                      }
                    }}
                    className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 text-white"
                  >
                    <option value={0}>Select Unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.actual_name}
                      </option>
                    ))}
                    <option value="add-new" className="bg-blue-600 text-white font-semibold">
                      + Add New Unit
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Pricing (Green) */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-lg" />
            <div className="pl-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                  <DollarSign size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white">Pricing</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">Purchase Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchase_price || 0}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                    className="bg-[#111827] border-gray-800 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Profit Margin (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.profit_margin || 0}
                    onChange={(e) => setFormData({ ...formData, profit_margin: parseFloat(e.target.value) || 0 })}
                    className="bg-[#111827] border-gray-800 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">
                    Selling Price <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.selling_price || 0}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-800 border-gray-700 text-white border-green-500"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Tax Type</Label>
                  <select
                    value={formData.tax_type}
                    onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                    className="w-full bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">Select Tax Type</option>
                    <option value="standard">Standard (10%)</option>
                    <option value="reduced">Reduced (5%)</option>
                    <option value="zero">Zero (0%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Rental Options (Optional) - Collapsible */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-lg" />
            <div className="pl-6">
              <button
                type="button"
                onClick={() => setRentalExpanded(!rentalExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <h3 className="text-lg font-semibold text-white">Rental Options (Optional)</h3>
                <span className={cn('text-gray-400 transition-transform', rentalExpanded && 'rotate-180')}>
                  ▼
                </span>
              </button>
              {rentalExpanded && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_rentable}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_rentable: checked })}
                    />
                    <Label className="text-white">Enable Rental</Label>
                  </div>
                  {formData.is_rentable && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white mb-2 block">Rental Price</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.rental_price || 0}
                          onChange={(e) => setFormData({ ...formData, rental_price: parseFloat(e.target.value) || 0 })}
                          className="bg-[#111827] border-gray-800 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">Security Deposit</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.security_deposit || 0}
                          onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
                          className="bg-[#111827] border-gray-800 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Variations (Blue) */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg" />
            <div className="pl-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Layers size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Variations</h3>
                  <p className="text-sm text-gray-400">Add Size, Color, Fabric, etc.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enableVariations}
                    onCheckedChange={(checked) => {
                      setEnableVariations(checked);
                      if (!checked) {
                        setVariations([]);
                      }
                    }}
                  />
                  <Label className="text-white text-sm">Enable Variations</Label>
                </div>
              </div>

              {enableVariations && (
                <div className="space-y-4">
                  {variations.map((variation, vIdx) => (
                    <div key={variation.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder="Variation name (e.g., Size, Color, Fabric)"
                            value={variation.name || ''}
                            onChange={(e) => {
                              const updated = [...variations];
                              updated[vIdx].name = e.target.value;
                              setVariations(updated);
                            }}
                            className="bg-[#111827] border-gray-800 text-white"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = variations.filter((_, i) => i !== vIdx);
                            setVariations(updated);
                          }}
                          className="ml-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-gray-400 mb-2">Values:</div>
                        {variation.values.map((value, valIdx) => (
                          <div key={value.id} className="flex gap-2 items-center">
                            <Input
                              type="text"
                              placeholder="Value (e.g., XL, Red)"
                              value={value.name || ''}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[vIdx].values[valIdx].name = e.target.value;
                                setVariations(updated);
                              }}
                              className="flex-1 bg-[#111827] border-gray-800 text-white text-sm"
                            />
                            <Input
                              type="number"
                              placeholder="+Price"
                              step="0.01"
                              min="0"
                              value={value.additionalPrice || ''}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[vIdx].values[valIdx].additionalPrice = parseFloat(e.target.value) || 0;
                                setVariations(updated);
                              }}
                              className="w-24 bg-[#111827] border-gray-800 text-white text-sm"
                            />
                            <Input
                              type="text"
                              placeholder="Sub-SKU"
                              value={value.subSku || ''}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[vIdx].values[valIdx].subSku = e.target.value;
                                setVariations(updated);
                              }}
                              className="w-32 bg-[#111827] border-gray-800 text-white text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = [...variations];
                                updated[vIdx].values = updated[vIdx].values.filter((_, i) => i !== valIdx);
                                setVariations(updated);
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = [...variations];
                            updated[vIdx].values.push({
                              id: `val-${Date.now()}-${Math.random()}`,
                              name: '',
                            });
                            setVariations(updated);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          <Plus size={14} className="mr-1" />
                          Add Value
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setVariations([
                        ...variations,
                        {
                          id: `var-${Date.now()}-${Math.random()}`,
                          name: '',
                          values: [],
                        },
                      ]);
                    }}
                    className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Variation Type
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Stock Management (Yellow) */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-l-lg" />
            <div className="pl-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Stock Management</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">Initial Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.initial_stock || 0}
                    onChange={(e) => setFormData({ ...formData, initial_stock: parseInt(e.target.value) || 0 })}
                    className="bg-[#111827] border-gray-800 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Alert Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.alert_quantity || 0}
                    onChange={(e) => setFormData({ ...formData, alert_quantity: parseInt(e.target.value) || 0 })}
                    className="bg-[#111827] border-gray-800 text-white"
                  />
                </div>
              </div>

              {/* Opening Stock Date - Only required for old products */}
              {isEditMode && formData.initial_stock > 0 && (
                <div>
                  <Label className="text-white mb-2 block">
                    Opening Stock Date <span className="text-yellow-400 text-xs">(Required for mid-year stock adjustment)</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.opening_stock_date || ''}
                    onChange={(e) => setFormData({ ...formData, opening_stock_date: e.target.value })}
                    className="bg-[#111827] border-gray-800 text-white"
                    required={isEditMode && formData.initial_stock > 0}
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Required when adding opening stock to an existing product mid-financial year
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.enable_tracking}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_tracking: checked })}
                />
                <Label className="text-white">Enable Tracking</Label>
              </div>
            </div>
          </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-800">
                <Button type="button" variant="ghost" onClick={onClose || (() => router.back())}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>

      {/* Modals for adding new items */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {formData.category_id > 0 ? 'Add Sub-Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            categoryName={categoryName}
            setCategoryName={setCategoryName}
            parentCategoryId={formData.category_id > 0 ? formData.category_id : parentCategoryId}
            setParentCategoryId={setParentCategoryId}
            categories={categories}
            onSave={async (newCategoryId) => {
              await loadOptions();
              
              // Auto-select the newly created category/sub-category
              if (newCategoryId) {
                // Reload categories to get the new one
                const { data: updatedCategories } = await supabase
                  .from('categories')
                  .select('id, name, parent_id')
                  .order('name');
                
                if (updatedCategories) {
                  setCategories(updatedCategories);
                  
                  // Find the new category
                  const newCategory = updatedCategories.find(c => c.id === newCategoryId);
                  if (newCategory) {
                    if (newCategory.parent_id) {
                      // It's a sub-category - set both category_id and sub_category_id
                      setFormData(prev => ({
                        ...prev,
                        category_id: newCategory.parent_id!,
                        sub_category_id: newCategoryId
                      }));
                    } else {
                      // It's a main category - set category_id
                      setFormData(prev => ({
                        ...prev,
                        category_id: newCategoryId,
                        sub_category_id: 0
                      }));
                    }
                  }
                }
              }
              
              setShowCategoryModal(false);
              setCategoryName('');
              setParentCategoryId(null);
            }}
            onClose={() => {
              setShowCategoryModal(false);
              setCategoryName('');
              setParentCategoryId(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showBrandModal} onOpenChange={setShowBrandModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Brand</DialogTitle>
          </DialogHeader>
          <BrandForm
            brandName={brandName}
            setBrandName={setBrandName}
            onSave={async () => {
              await loadOptions();
              setShowBrandModal(false);
              setBrandName('');
            }}
            onClose={() => {
              setShowBrandModal(false);
              setBrandName('');
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUnitModal} onOpenChange={setShowUnitModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
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
              await loadOptions();
              setShowUnitModal(false);
              setUnitName('');
              setUnitShortName('');
              setAllowDecimal(false);
            }}
            onClose={() => {
              setShowUnitModal(false);
              setUnitName('');
              setUnitShortName('');
              setAllowDecimal(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

