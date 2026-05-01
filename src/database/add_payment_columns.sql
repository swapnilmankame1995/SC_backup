-- ===================================================
-- PAYMENT TRANSACTION COLUMNS MIGRATION
-- For compliance, accounting, and audit purposes
-- ===================================================

-- Add payment transaction columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS payment_id TEXT,                    -- Transaction/Payment ID from gateway
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT,               -- Gateway used: 'razorpay', 'payu', 'cod', etc.
  ADD COLUMN IF NOT EXISTS payment_method TEXT,                -- Payment method: 'card', 'upi', 'netbanking', 'wallet', etc.
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP,      -- When payment was verified
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),       -- Actual amount paid (for verification)
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,             -- Razorpay order ID (for Razorpay)
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,            -- Razorpay signature (for audit)
  ADD COLUMN IF NOT EXISTS payment_failed_reason TEXT,         -- Reason if payment failed
  ADD COLUMN IF NOT EXISTS payment_refund_id TEXT,             -- Refund ID if refunded
  ADD COLUMN IF NOT EXISTS payment_refunded_at TIMESTAMP,      -- When payment was refunded
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB;             -- Additional payment metadata

-- Create index for faster payment queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_gateway ON orders(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_orders_payment_verified_at ON orders(payment_verified_at);

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_id IS 'Transaction ID from payment gateway (Razorpay payment_id, PayU txnid, etc.)';
COMMENT ON COLUMN orders.payment_gateway IS 'Payment gateway used: razorpay, payu, cod, bank_transfer';
COMMENT ON COLUMN orders.payment_method IS 'Payment method: card, upi, netbanking, wallet, emi, cod';
COMMENT ON COLUMN orders.payment_verified_at IS 'Server timestamp when payment signature was verified';
COMMENT ON COLUMN orders.payment_amount IS 'Actual amount paid through gateway (for reconciliation)';
COMMENT ON COLUMN orders.razorpay_order_id IS 'Razorpay order_id (for Razorpay gateway)';
COMMENT ON COLUMN orders.razorpay_signature IS 'Razorpay HMAC signature (for audit trail)';
COMMENT ON COLUMN orders.payment_failed_reason IS 'Reason for payment failure (if applicable)';
COMMENT ON COLUMN orders.payment_refund_id IS 'Refund transaction ID (if refunded)';
COMMENT ON COLUMN orders.payment_refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN orders.payment_metadata IS 'Additional payment data in JSON format';

-- ===================================================
-- VERIFICATION QUERY
-- Run this after migration to verify columns were added
-- ===================================================

-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'orders' 
--   AND column_name LIKE 'payment%'
-- ORDER BY ordinal_position;

-- ===================================================
-- SAMPLE QUERY - View Orders with Payment Details
-- ===================================================

-- SELECT 
--   order_number,
--   total,
--   payment_status,
--   payment_gateway,
--   payment_method,
--   payment_id,
--   payment_amount,
--   payment_verified_at,
--   created_at
-- FROM orders
-- WHERE payment_status = 'paid'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- ===================================================
-- ROLLBACK QUERY (if needed)
-- USE WITH CAUTION - This will delete payment data!
-- ===================================================

-- ALTER TABLE orders 
--   DROP COLUMN IF EXISTS payment_id,
--   DROP COLUMN IF EXISTS payment_gateway,
--   DROP COLUMN IF EXISTS payment_method,
--   DROP COLUMN IF EXISTS payment_verified_at,
--   DROP COLUMN IF EXISTS payment_amount,
--   DROP COLUMN IF EXISTS razorpay_order_id,
--   DROP COLUMN IF EXISTS razorpay_signature,
--   DROP COLUMN IF EXISTS payment_failed_reason,
--   DROP COLUMN IF EXISTS payment_refund_id,
--   DROP COLUMN IF EXISTS payment_refunded_at,
--   DROP COLUMN IF EXISTS payment_metadata;
