import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);