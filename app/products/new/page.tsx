'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { Product } from '@/lib/types/modern-erp';
import { toast } from 'sonner';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    type: 'single',
    unit_id: 0,
    category_id: 0,
    brand_id: 0,
    alert_quantity: 0,
    // Rental fields
    is_rentable: false,
    rental_price: 0,
    security_deposit_amount: 0,
    rent_duration_unit: 'day' as 'hour' | 'day' | 'event',
  });
  const [units, setUnits] = useState<Array<{ id: number; actual_name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);

  // Load units, categories, brands
  useEffect(() => {
    const loadOptions = async () => {
      // Load units (RLS-protected)
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, actual_name')
        .order('actual_name');

      // Load categories (RLS-protected)
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      // Load brands (RLS-protected)
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');

      if (unitsData) setUnits(unitsData);
      if (categoriesData) setCategories(categoriesData);
      if (brandsData) setBrands(brandsData);
    };

    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.sku || !formData.unit_id) {
        setError('Name, SKU, and Unit are required');
        setLoading(false);
        return;
      }

      // Create product via backend API
      const payload = {
        name: formData.name,
        sku: formData.sku,
        type: formData.type,
        unitId: formData.unit_id,
        categoryId: formData.category_id || undefined,
        brandId: formData.brand_id || undefined,
        enableStock: true,
        alertQuantity: formData.alert_quantity || 0,
        // Rental fields
        isRentable: formData.is_rentable,
        rentalPrice: formData.rental_price > 0 ? formData.rental_price : undefined,
        securityDepositAmount: formData.security_deposit_amount > 0 ? formData.security_deposit_amount : undefined,
        rentDurationUnit: formData.is_rentable ? formData.rent_duration_unit : undefined,
      };

      const response = await apiClient.post<ApiResponse<Product>>('/products', payload);

      if (response.data.success && response.data.data) {
        toast.success('Product created successfully!');
        router.push('/products');
      } else {
        throw new Error(response.data.error?.message || 'Failed to create product');
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(`Failed to create product: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">New Product</h1>
            <p className="mt-1 text-sm text-slate-400">Create a new product</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                SKU <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter SKU"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Unit <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0} className="bg-slate-950">Select Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id} className="bg-slate-950">
                    {unit.actual_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0} className="bg-slate-950">No Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id} className="bg-slate-950">
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
              <select
                value={formData.brand_id}
                onChange={(e) => setFormData({ ...formData, brand_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0} className="bg-slate-950">No Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id} className="bg-slate-950">
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Alert Quantity</label>
              <input
                type="number"
                min="0"
                value={formData.alert_quantity}
                onChange={(e) => setFormData({ ...formData, alert_quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>

            {/* Rental Fields */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_rentable}
                    onChange={(e) => setFormData({ ...formData, is_rentable: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-300">Enable Rental</span>
                </label>
              </div>
            </div>

            {formData.is_rentable && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Rental Price</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rental_price}
                    onChange={(e) => setFormData({ ...formData, rental_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Security Deposit</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.security_deposit_amount}
                    onChange={(e) => setFormData({ ...formData, security_deposit_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Rental Duration Unit</label>
                  <select
                    value={formData.rent_duration_unit}
                    onChange={(e) => setFormData({ ...formData, rent_duration_unit: e.target.value as 'hour' | 'day' | 'event' })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="hour" className="bg-slate-950">Hour</option>
                    <option value="day" className="bg-slate-950">Day</option>
                    <option value="event" className="bg-slate-950">Event</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
              Create Product
            </Button>
          </div>
        </form>
      </div>
    </ModernDashboardLayout>
  );
}

