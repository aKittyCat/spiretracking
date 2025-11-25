const SUPABASE_URL = 'https://xtgtucdgqkgpnyyhmybe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0Z3R1Y2RncWtncG55eWhteWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjk2NDgsImV4cCI6MjA3OTY0NTY0OH0.jHhX7e2M_sU8Jch8XIGbG5_h6NNhftlMvl5Z45QjySE';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.supabase = _supabase;