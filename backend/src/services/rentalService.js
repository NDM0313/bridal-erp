/**
 * Rental Service
 * Handles rental booking operations with date conflict detection
 */

import { supabase } from '../config/supabase.js';

/**
 * Check for date conflicts for a product
 * @param {number} productId - Product ID
 * @param {string} pickupDate - Pickup date (ISO string)
 * @param {string} returnDate - Return date (ISO string)
 * @param {number} excludeBookingId - Booking ID to exclude from conflict check (for updates)
 * @returns {Promise<array>} Conflicting bookings
 */
export async function checkDateConflicts(productId, pickupDate, returnDate, excludeBookingId = null) {
  let query = supabase
    .from('rental_bookings')
    .select('id, pickup_date, return_date, status, contact_id')
    .eq('product_id', productId)
    .in('status', ['reserved', 'out'])
    .or(`pickup_date.lte.${returnDate},return_date.gte.${pickupDate}`);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to check date conflicts: ${error.message}`);
  }

  // Filter for actual overlaps
  const conflicts = (data || []).filter((booking) => {
    const bookingPickup = new Date(booking.pickup_date);
    const bookingReturn = new Date(booking.return_date);
    const newPickup = new Date(pickupDate);
    const newReturn = new Date(returnDate);

    return (
      (newPickup <= bookingReturn && newReturn >= bookingPickup)
    );
  });

  return conflicts;
}

/**
 * Create a rental booking
 * @param {object} bookingData - Booking data
 * @param {number} businessId - Business ID
 * @param {string} userId - User ID (created_by)
 * @returns {Promise<object>} Created booking
 */
export async function createRentalBooking(bookingData, businessId, userId) {
  const {
    contactId,
    productId,
    variationId = null,
    pickupDate,
    returnDate,
    rentalAmount,
    securityDepositAmount,
    securityType = 'cash',
    securityDocUrl = null,
    notes = null,
  } = bookingData;

  // Validate required fields
  if (!contactId || !productId || !pickupDate || !returnDate) {
    throw new Error('Missing required fields: contactId, productId, pickupDate, returnDate');
  }

  // Check for date conflicts
  const conflicts = await checkDateConflicts(productId, pickupDate, returnDate);
  if (conflicts.length > 0) {
    throw new Error(
      `Date conflict detected. Product is already booked from ${conflicts[0].pickup_date} to ${conflicts[0].return_date}`
    );
  }

  // Insert booking
  const { data, error } = await supabase
    .from('rental_bookings')
    .insert({
      business_id: businessId,
      contact_id: contactId,
      product_id: productId,
      variation_id: variationId,
      pickup_date: pickupDate,
      return_date: returnDate,
      rental_amount: rentalAmount || 0,
      security_deposit_amount: securityDepositAmount || 0,
      security_type: securityType,
      security_doc_url: securityDocUrl,
      notes,
      status: 'reserved',
      created_by: userId,
    })
    .select(`
      *,
      contact:contacts(id, name, mobile, email),
      product:products(id, name, sku, image),
      variation:variations(id, name, sub_sku)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create rental booking: ${error.message}`);
  }

  return data;
}

/**
 * Get all rental bookings for a business
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Bookings list
 */
export async function getRentalBookings(businessId, options = {}) {
  const {
    page = 1,
    perPage = 20,
    status = null,
    productId = null,
    contactId = null,
    startDate = null,
    endDate = null,
  } = options;

  let query = supabase
    .from('rental_bookings')
    .select(`
      *,
      contact:contacts(id, name, mobile, email),
      product:products(id, name, sku, image),
      variation:variations(id, name, sub_sku)
    `)
    .eq('business_id', businessId)
    .order('pickup_date', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (productId) {
    query = query.eq('product_id', productId);
  }

  if (contactId) {
    query = query.eq('contact_id', contactId);
  }

  if (startDate) {
    query = query.gte('pickup_date', startDate);
  }

  if (endDate) {
    query = query.lte('return_date', endDate);
  }

  // Pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch rental bookings: ${error.message}`);
  }

  // Get total count
  const { count: totalCount } = await supabase
    .from('rental_bookings')
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

/**
 * Update rental booking status
 * @param {number} bookingId - Booking ID
 * @param {string} status - New status
 * @param {number} businessId - Business ID
 * @param {string} actualReturnDate - Actual return date (optional)
 * @param {number} penaltyAmount - Penalty amount (optional)
 * @param {string} notes - Return notes (optional)
 * @returns {Promise<object>} Updated booking
 */
export async function updateRentalBookingStatus(
  bookingId,
  status,
  businessId,
  actualReturnDate = null,
  penaltyAmount = null,
  notes = null
) {
  // Verify booking belongs to business
  const { data: existing } = await supabase
    .from('rental_bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('business_id', businessId)
    .single();

  if (!existing) {
    throw new Error('Rental booking not found');
  }

  const updateData = { status };
  if (actualReturnDate) {
    updateData.actual_return_date = actualReturnDate;
  }
  if (penaltyAmount !== null && penaltyAmount !== undefined) {
    updateData.penalty_amount = penaltyAmount;
  }
  if (notes !== null && notes !== undefined) {
    updateData.notes = notes;
  }

  const { data, error } = await supabase
    .from('rental_bookings')
    .update(updateData)
    .eq('id', bookingId)
    .eq('business_id', businessId)
    .select(`
      *,
      contact:contacts(id, name, mobile, email),
      product:products(id, name, sku, image),
      variation:variations(id, name, sub_sku)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update rental booking: ${error.message}`);
  }

  return data;
}

/**
 * Get rental products (products that are rentable)
 * @param {number} businessId - Business ID
 * @returns {Promise<array>} Rentable products
 */
export async function getRentableProducts(businessId) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      image,
      is_rentable,
      rental_price,
      security_deposit_amount,
      rent_duration_unit,
      variations:variations(
        id,
        name,
        sub_sku,
        retail_price,
        wholesale_price
      )
    `)
    .eq('business_id', businessId)
    .eq('is_rentable', true)
    .eq('is_inactive', false)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch rentable products: ${error.message}`);
  }

  return data || [];
}

