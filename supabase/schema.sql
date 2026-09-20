-- ==============================================================================
-- CivicFlowAI: Supabase Database Schema
-- Run this script in the Supabase SQL Editor to set up tables, types, and policies.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'authority', 'admin')),
    department TEXT, -- e.g. 'BBMP Road Infrastructure', 'BWSSB Water Supply & Drainage'
    ward TEXT DEFAULT 'Ward 112 - Indiranagar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Complaints Table (Civic Issues & Tickets)
CREATE TABLE IF NOT EXISTS public.complaints (
    id TEXT PRIMARY KEY, -- e.g. 'CMP-882194' or UUID
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Pothole & Road Hazard', 'Solid Waste & Garbage', etc.
    department TEXT NOT NULL, -- Target municipal body
    ward TEXT NOT NULL, -- Ward name or number
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION DEFAULT 12.9716,
    longitude DOUBLE PRECISION DEFAULT 77.5946,
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    severity_score INTEGER DEFAULT 50, -- 0 to 100 composite score from SeverityAgent
    priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'Urgent', 'Emergency')),
    status TEXT NOT NULL DEFAULT 'Triaged' CHECK (status IN ('Submitted', 'Triaged', 'In Progress', 'Resolved', 'Escalated', 'Rejected')),
    image_url TEXT,
    citizen_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    citizen_name TEXT DEFAULT 'Citizen',
    tracking_token TEXT,
    sla_hours INTEGER DEFAULT 48,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Agent Audit Traces Table (7-Specialist Pipeline Results)
CREATE TABLE IF NOT EXISTS public.agent_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id TEXT REFERENCES public.complaints(id) ON DELETE CASCADE,
    stage INTEGER NOT NULL, -- Stage 1 (Triaging), Stage 2 (Dispatch), Stage 3 (Governance)
    agent_name TEXT NOT NULL, -- IssueAgent, SeverityAgent, RoutingAgent, VerificationAgent, etc.
    status TEXT NOT NULL DEFAULT 'passed' CHECK (status IN ('passed', 'flagged', 'warning', 'completed')),
    reasoning TEXT,
    confidence DOUBLE PRECISION DEFAULT 0.90,
    output_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Indexes for Fast Queries
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON public.complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON public.complaints(department);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON public.complaints(ward);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_traces_complaint_id ON public.agent_traces(complaint_id);

-- 6. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;

-- Allow public read of complaints for civic transparency & ward feeds
CREATE POLICY "Public read complaints" ON public.complaints
    FOR SELECT USING (true);

-- Allow authenticated users to insert complaints
CREATE POLICY "Users can create complaints" ON public.complaints
    FOR INSERT WITH CHECK (true);

-- Allow authorities/admins to update complaints
CREATE POLICY "Authorities can update complaints" ON public.complaints
    FOR UPDATE USING (true);

-- Allow public read of agent traces for audit trail transparency
CREATE POLICY "Public read agent traces" ON public.agent_traces
    FOR SELECT USING (true);

CREATE POLICY "Service can insert agent traces" ON public.agent_traces
    FOR INSERT WITH CHECK (true);

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
