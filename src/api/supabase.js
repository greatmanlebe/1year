import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'sb_publishable_Gza5Ov8K-DVCLcvcsadMmA_D7BkP0oP';
const SUPABASE_ANON_KEY = 'sb_secret_4wfa_i3PnpNC3zDSzsVcyw_ww0BPwq5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);