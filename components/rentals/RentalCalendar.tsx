'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  addDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  parseISO,
  differenceInDays,
  startOfDay,
  endOfDay,
  subMonths,
  addMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { supabase } from '@/utils/supabase/client';
import { RentalBooking } from '@/lib/types/modern-erp';

type ViewMode = 'weekly' | 'monthly';

interface RentalCalendarProps {
  bookings: RentalBooking[];
  onDateClick?: (date: Date, productId?: number) => void;
}

export const RentalCalendar = ({ bookings, onDateClick }: RentalCalendarProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products that have bookings OR are rentable
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('business_id')
          .eq('user_id', session.user.id)
          .single();

        if (!profile) return;

        // Get product IDs from bookings
        const bookingProductIds = bookings
          .map(b => {
            const pid = typeof b.product_id === 'number' ? b.product_id : parseInt(b.product_id?.toString() || '0');
            return pid > 0 ? pid : null;
          })
          .filter((id): id is number => id !== null && id > 0);

        console.log('Booking product IDs:', bookingProductIds);
        console.log('Total bookings:', bookings.length);

        // Fetch products in two steps to avoid OR query issues
        const allProductIds = new Set<number>();

        // 1. Fetch rentable products
        const { data: rentableProducts } = await supabase
          .from('products')
          .select('id, name, sku, image, is_rentable')
          .eq('business_id', profile.business_id)
          .eq('is_rentable', true)
          .eq('is_inactive', false);

        if (rentableProducts) {
          rentableProducts.forEach(p => allProductIds.add(p.id));
        }

        // 2. Fetch products that have bookings (if any)
        if (bookingProductIds.length > 0) {
          const { data: bookingProducts } = await supabase
            .from('products')
            .select('id, name, sku, image, is_rentable')
            .eq('business_id', profile.business_id)
            .eq('is_inactive', false)
            .in('id', bookingProductIds);

          if (bookingProducts) {
            bookingProducts.forEach(p => allProductIds.add(p.id));
          }
        }

        // 3. Fetch all unique products
        if (allProductIds.size > 0) {
          const { data: allProducts } = await supabase
            .from('products')
            .select('id, name, sku, image, is_rentable')
            .eq('business_id', profile.business_id)
            .in('id', Array.from(allProductIds))
            .order('name', { ascending: true });

          if (allProducts) {
            setProducts(allProducts);
            console.log('Products loaded:', allProducts.length);
            console.log('Bookings:', bookings.length);
          }
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [bookings]);

  // Get days for current view
  const days = useMemo(() => {
    if (viewMode === 'weekly') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  const colWidth = viewMode === 'weekly' ? 120 : 60;

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate(prev => viewMode === 'weekly' ? addDays(prev, -7) : subMonths(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => viewMode === 'weekly' ? addDays(prev, 7) : addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Check if a product is booked on a specific date
  const getBookingForDate = (productId: number, date: Date) => {
    if (!bookings || bookings.length === 0) return null;
    
    const booking = bookings.find((booking) => {
      // Match product ID - handle both number and string types
      const bookingProductId = typeof booking.product_id === 'number' 
        ? booking.product_id 
        : typeof booking.product_id === 'string'
        ? parseInt(booking.product_id)
        : booking.product_id;
      
      // Compare as numbers
      if (Number(bookingProductId) !== Number(productId)) {
        return false;
      }
      
      // Only show active bookings
      if (!booking.status || !['reserved', 'out'].includes(booking.status)) {
        return false;
      }

      // Check date range
      try {
        if (!booking.pickup_date || !booking.return_date) return false;
        
        const pickupDate = startOfDay(new Date(booking.pickup_date));
        const returnDate = endOfDay(new Date(booking.return_date));
        const checkDate = startOfDay(date);

        const isInRange = isWithinInterval(checkDate, { start: pickupDate, end: returnDate });
        return isInRange;
      } catch (error) {
        console.error('Date parsing error:', error, booking);
        return false;
      }
    });

    return booking || null;
  };

  // Get booking status color
  const getBookingColor = (booking: RentalBooking) => {
    if (booking.status === 'out') return 'bg-orange-500/80';
    if (booking.status === 'reserved') return 'bg-blue-500/80';
    return 'bg-gray-500/80';
  };

  const today = new Date();
  const isToday = (date: Date) => isSameDay(date, today);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between mb-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => {}}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white font-medium text-sm hover:bg-gray-700 transition-colors"
            >
              {format(currentDate, 'MMMM yyyy')}
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-400 text-sm hover:bg-gray-700 hover:text-white transition-colors"
            >
              Today
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setViewMode('monthly')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'monthly'
                  ? 'bg-gray-800 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'weekly'
                  ? 'bg-gray-800 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Date Header Row */}
          <div className="flex border-b border-gray-800 bg-gray-900/50 sticky top-0 z-20">
            {/* Product Name Column Header */}
            <div className="w-64 flex-shrink-0 border-r border-gray-800 p-3 bg-gray-900/80">
              <span className="text-xs font-semibold text-gray-400 uppercase">Product Name</span>
            </div>

            {/* Date Columns */}
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  style={{ width: colWidth }}
                  className={cn(
                    'flex-shrink-0 border-r border-gray-800 p-2 text-center',
                    isToday(day) && 'bg-blue-500/20'
                  )}
                >
                  <div className="text-xs text-gray-500 uppercase mb-1">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'text-sm font-semibold',
                    isToday(day) ? 'text-blue-400' : 'text-white'
                  )}
                >
                  {format(day, 'd')}
                </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Rows */}
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No rentable products found</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {products.map((product) => (
                <div key={product.id} className="flex hover:bg-gray-900/30 transition-colors">
                  {/* Product Name Column */}
                  <div className="w-64 flex-shrink-0 border-r border-gray-800 p-3 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-8 w-8 rounded object-cover border border-gray-800"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-800 border border-gray-800" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{product.name}</p>
                        {product.sku && (
                          <p className="text-xs text-gray-500 font-mono truncate">{product.sku}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date Cells */}
                  <div className="flex relative">
                    {days.map((day) => {
                      const booking = getBookingForDate(product.id, day);
                      const isTodayCell = isToday(day);

                      return (
                        <div
                          key={day.toISOString()}
                          style={{ width: colWidth }}
                          className={cn(
                            'flex-shrink-0 border-r border-gray-800/50 h-16 relative cursor-pointer hover:bg-gray-800/30 transition-colors',
                            isTodayCell && 'bg-blue-500/10'
                          )}
                          onClick={() => onDateClick?.(day, product.id)}
                        >
                          {booking && (
                            <div
                              className={cn(
                                'absolute inset-0 flex items-center justify-center text-xs font-medium text-white',
                                getBookingColor(booking)
                              )}
                              title={`${booking.contact?.name || 'Customer'} - ${format(new Date(booking.pickup_date), 'MMM dd')} to ${format(new Date(booking.return_date), 'MMM dd')}`}
                            >
                              {booking.status === 'out' ? 'Out' : 'Reserved'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

