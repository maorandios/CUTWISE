-- Payment System Schema for Cutwise
-- Run this in Supabase SQL Editor

-- 1. Add credits column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 1,  -- Start with 1 free credit
ADD COLUMN IF NOT EXISTS total_credits_purchased INTEGER DEFAULT 0;

-- 2. Create payments table to track all transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  credits_purchased INTEGER NOT NULL,
  plan_type VARCHAR(50) NOT NULL, -- 'single', 'pack_20', 'pack_50'
  paypal_order_id VARCHAR(255) UNIQUE,
  paypal_transaction_id VARCHAR(255),
  paypal_payer_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Create usage_history table to track credit usage
CREATE TABLE IF NOT EXISTS usage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name VARCHAR(255),
  action VARCHAR(50) NOT NULL DEFAULT 'nesting_report_generated',
  credits_used INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_history_user_id ON usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_created_at ON usage_history(created_at DESC);

-- 5. Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for payments table
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending payments"
  ON payments FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- 7. RLS Policies for usage_history table
CREATE POLICY "Users can view their own usage history"
  ON usage_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage history"
  ON usage_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. Create function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credit(p_user_id UUID, p_project_id UUID, p_project_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_company_id UUID;
  v_current_credits INTEGER;
BEGIN
  -- Get company_id and current credits
  SELECT id, credits INTO v_company_id, v_current_credits
  FROM companies
  WHERE user_id = p_user_id;
  
  -- Check if user has credits
  IF v_current_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credit
  UPDATE companies
  SET credits = credits - 1
  WHERE user_id = p_user_id;
  
  -- Record usage
  INSERT INTO usage_history (user_id, company_id, project_id, project_name, credits_used)
  VALUES (p_user_id, v_company_id, p_project_id, p_project_name, 1);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to add credits after payment
CREATE OR REPLACE FUNCTION add_credits(p_user_id UUID, p_credits INTEGER, p_payment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add credits to company
  UPDATE companies
  SET 
    credits = credits + p_credits,
    total_credits_purchased = total_credits_purchased + p_credits
  WHERE user_id = p_user_id;
  
  -- Mark payment as completed
  UPDATE payments
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_payment_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION deduct_credit TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits TO authenticated;
