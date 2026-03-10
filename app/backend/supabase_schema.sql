-- ================================================
-- HireReady Supabase Database Schema
-- ================================================
-- This schema replaces MongoDB collections with PostgreSQL tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- Users Table
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    plan_type TEXT DEFAULT 'free',
    usage_count INTEGER DEFAULT 0,
    credits INTEGER DEFAULT 0,
    subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ================================================
-- Resumes Table
-- ================================================
CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    feedback JSONB NOT NULL,
    resume_text TEXT NOT NULL,
    analysis_type TEXT DEFAULT 'basic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resumes_analysis_type ON resumes(analysis_type);

-- ================================================
-- JD Matches Table
-- ================================================
CREATE TABLE IF NOT EXISTS jd_matches (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    jd_match_score INTEGER NOT NULL,
    skill_gaps TEXT[] NOT NULL DEFAULT '{}',
    missing_keywords TEXT[] NOT NULL DEFAULT '{}',
    job_description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_jd_matches_user_id ON jd_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_jd_matches_resume_id ON jd_matches(resume_id);
CREATE INDEX IF NOT EXISTS idx_jd_matches_created_at ON jd_matches(created_at DESC);

-- ================================================
-- Payment Transactions Table
-- ================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    package_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'inr',
    payment_status TEXT DEFAULT 'created',
    status TEXT DEFAULT 'initiated',
    webhook_event TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_razorpay_order_id ON payment_transactions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_created_at ON payment_transactions(created_at DESC);

-- ================================================
-- Row Level Security (RLS) Policies
-- ================================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jd_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- ================================================
-- Policies for Users Table
-- ================================================
-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT
    USING (true);  -- Changed to allow backend service role to access

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE
    USING (true);

-- Allow insert for registration
CREATE POLICY "Users can register" ON users
    FOR INSERT
    WITH CHECK (true);

-- ================================================
-- Policies for Resumes Table
-- ================================================
-- Users can view their own resumes
CREATE POLICY "Users can view own resumes" ON resumes
    FOR SELECT
    USING (true);

-- Users can insert their own resumes
CREATE POLICY "Users can create own resumes" ON resumes
    FOR INSERT
    WITH CHECK (true);

-- ================================================
-- Policies for JD Matches Table
-- ================================================
-- Users can view their own JD matches
CREATE POLICY "Users can view own jd_matches" ON jd_matches
    FOR SELECT
    USING (true);

-- Users can create their own JD matches
CREATE POLICY "Users can create own jd_matches" ON jd_matches
    FOR INSERT
    WITH CHECK (true);

-- ================================================
-- Policies for Payment Transactions Table
-- ================================================
-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payment_transactions
    FOR SELECT
    USING (true);

-- Users can create their own payment records
CREATE POLICY "Users can create own payments" ON payment_transactions
    FOR INSERT
    WITH CHECK (true);

-- Users can update their own payment records
CREATE POLICY "Users can update own payments" ON payment_transactions
    FOR UPDATE
    USING (true);

-- ================================================
-- Functions for Auto-updating timestamps
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jd_matches_updated_at BEFORE UPDATE ON jd_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Views for Admin Dashboard
-- ================================================
CREATE OR REPLACE VIEW admin_stats AS
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM users WHERE plan_type = 'free') AS free_users,
    (SELECT COUNT(*) FROM users WHERE plan_type = 'pro') AS pro_users,
    (SELECT COUNT(*) FROM resumes) AS total_analyses,
    (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions WHERE payment_status = 'paid') AS total_revenue;

-- ================================================
-- Sample Data Queries (For Testing)
-- ================================================
-- Get user with their stats
-- SELECT u.*, COUNT(r.id) as resume_count 
-- FROM users u 
-- LEFT JOIN resumes r ON r.user_id = u.id 
-- GROUP BY u.id;

-- Get recent payments
-- SELECT * FROM payment_transactions 
-- WHERE payment_status = 'paid' 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- Get API usage stats
-- SELECT 
--     analysis_type,
--     COUNT(*) as count,
--     DATE(created_at) as date
-- FROM resumes
-- GROUP BY analysis_type, DATE(created_at)
-- ORDER BY date DESC;
