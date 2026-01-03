-- Add invoice_number column to rental_bookings table
ALTER TABLE rental_bookings 
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) NULL;

-- Create index for invoice_number
CREATE INDEX IF NOT EXISTS idx_rental_bookings_invoice_number ON rental_bookings(invoice_number);

-- Add unique constraint for invoice_number per business
CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_bookings_business_invoice 
ON rental_bookings(business_id, invoice_number) 
WHERE invoice_number IS NOT NULL;

COMMENT ON COLUMN rental_bookings.invoice_number IS 'Auto-generated invoice number in format RENT-YYYYMM-####';

