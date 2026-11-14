import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Clean URL in case user supplied /rest/v1 or trailing slashes
export const cleanSupabaseUrl = (url?: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

// Read configuration from Vite env
const meta = (typeof import.meta !== 'undefined' ? import.meta : {}) as any;
const envUrl = meta?.env?.VITE_SUPABASE_URL || 'https://qpxvfnssktfuhlagliad.supabase.co';
const envKey = meta?.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweHZmbnNza3RmdWhsYWdsaWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMzg1MjgsImV4cCI6MjEwNDkxNDUyOH0.hjEy7VVD3_N7pwWyaZi9gtoVz1EzjP5cyhO6jCxcarg';

export const supabaseUrl = cleanSupabaseUrl(envUrl);
export const supabaseAnonKey = envKey ? envKey.trim() : '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') && 
  !supabaseAnonKey.includes('your-anon-key') &&
  supabaseUrl.startsWith('https://')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
