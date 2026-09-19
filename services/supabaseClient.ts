import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const finalUrl = supabaseUrl || 'https://dummy.supabase.co';
const finalKey = supabaseAnonKey || 'dummy';

if (!supabaseUrl) {
  console.warn("WARNING: Supabase URL and Key are missing from environment variables.");
}

export const supabase = createClient(finalUrl, finalKey);

export const getUserClient = (token: string) => {
    return createClient(finalUrl, finalKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};
