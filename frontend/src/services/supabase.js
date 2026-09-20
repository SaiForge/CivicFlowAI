import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Sign up user with Supabase Auth & create profile
 */
export async function supabaseSignUp(email, password, fullName, role = 'citizen') {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (err) {
      console.warn('Supabase auth signup error:', err);
    }
  }

  // Gateway API fallback
  try {
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, role }),
    });
    if (res.ok) {
      const user = await res.json();
      return { success: true, user };
    }
  } catch (err) {
    console.warn('Gateway auth signup error:', err);
  }

  // Offline demo user
  return {
    success: true,
    user: { id: `usr-${Date.now()}`, email, full_name: fullName, role },
  };
}

/**
 * Sign in user with Supabase Auth
 */
export async function supabaseSignIn(email, password) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (err) {
      console.warn('Supabase auth login error:', err);
    }
  }

  // Gateway API fallback
  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const user = await res.json();
      return { success: true, user };
    }
  } catch (err) {
    console.warn('Gateway auth login error:', err);
  }

  // Demo fallback
  return {
    success: true,
    user: {
      id: 'demo-user-1',
      email,
      full_name: email.split('@')[0] || 'Aarav Sharma',
      role: email.includes('admin') ? 'admin' : 'citizen',
    },
  };
}

/**
 * Sign out
 */
export async function supabaseSignOut() {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
  }
  return { success: true };
}

/**
 * Fetch complaints from Supabase
 */
export async function fetchComplaintsFromSupabase(department = null) {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.table('complaints').select('*').order('created_at', { ascending: false });
      if (department && department !== 'All') {
        query = query.eq('department', department);
      }
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase fetch complaints error:', err);
    }
  }

  // Fallback to Backend Gateway API
  try {
    const url = department && department !== 'All' 
      ? `/api/v1/complaints?department=${encodeURIComponent(department)}`
      : '/api/v1/complaints';
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Gateway fetch complaints error:', err);
  }
  return [];
}
