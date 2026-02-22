import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijfcdmlsgbhhcmserikf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-gy5bhizCnunHbLU0AE11A_BzdCQPQF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
