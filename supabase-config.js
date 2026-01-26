const config = window.env || { SUPABASE_URL: '', SUPABASE_KEY: '' };

const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_KEY = config.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ไม่พบ Supabase Configuration! กรุณาตรวจสอบไฟล์ env.js');
}

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.supabase = _supabase;