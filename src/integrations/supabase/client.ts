import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.DEV
  ? `${window.location.origin}/supabase`
  : import.meta.env.VITE_SUPABASE_URL || "https://jilmlmdgeyzubylncpjy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "sb_publishable_7xFUuqzVjAb5LA22UN0S-A_R1B-ZKiE";

// Guard localStorage access for server environments
const authConfig = typeof window !== 'undefined' ? {
  storage: localStorage,
  persistSession: true,
  autoRefreshToken: true,
} : {
  persistSession: false,
};

// Create the base client
const baseClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: authConfig as any,
});

// Export a more permissive client to avoid type errors with strict Supabase types
export const supabase = baseClient as any;
