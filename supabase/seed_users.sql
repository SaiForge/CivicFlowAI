-- ==============================================================================
-- CivicFlowAI: Seed Demo Users in Supabase
-- Run this in the Supabase SQL Editor to create Demo Citizen & Admin accounts.
-- Passwords:
--   Citizen: Citizen@123
--   Admin:   Admin@123
-- ==============================================================================

-- 1. Create Demo Citizen in auth.users (if not already exists)
DO $$
DECLARE
    citizen_uuid UUID := 'c0000000-0000-0000-0000-000000000001'::UUID;
    admin_uuid UUID := 'a0000000-0000-0000-0000-000000000002'::UUID;
BEGIN
    -- Insert Demo Citizen into auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'citizen@civicflow.gov.in') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            citizen_uuid,
            '00000000-0000-0000-0000-000000000000'::UUID,
            'citizen@civicflow.gov.in',
            crypt('Citizen@123', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Aarav Sharma","role":"citizen","ward":"Ward 112 - Indiranagar"}'::jsonb,
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        );
    END IF;

    -- Insert Demo Admin into auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@civicflow.gov.in') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            admin_uuid,
            '00000000-0000-0000-0000-000000000000'::UUID,
            'admin@civicflow.gov.in',
            crypt('Admin@123', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Dr. Meera Iyer","role":"admin","department":"Municipal HQ","ward":"City Central Command"}'::jsonb,
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        );
    END IF;

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, email, full_name, role, department, ward, created_at, updated_at)
    VALUES 
        (citizen_uuid, 'citizen@civicflow.gov.in', 'Aarav Sharma', 'citizen', NULL, 'Ward 112 - Indiranagar', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        ward = EXCLUDED.ward;

    INSERT INTO public.profiles (id, email, full_name, role, department, ward, created_at, updated_at)
    VALUES 
        (admin_uuid, 'admin@civicflow.gov.in', 'Dr. Meera Iyer', 'admin', 'Municipal Corporation HQ', 'City Central Command', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        department = EXCLUDED.department,
        ward = EXCLUDED.ward;

END $$;

-- Verify creation
SELECT id, email, full_name, role, department, ward FROM public.profiles;
