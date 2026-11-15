

// Import directly via a browser-native ESM CDN URL
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://owwfiehydpyriyxqaeud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93d2ZpZWh5ZHB5cml5eHFhZXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NTAzNDMsImV4cCI6MjExMDIyNjM0M30.vZNwuocUHp8tJgr3Bun-yZQkmrilpHLm_LE3VePgUNg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
