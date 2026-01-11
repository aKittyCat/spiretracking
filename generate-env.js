const fs = require('fs');

// ดึงค่าจาก Vercel Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// สร้างเนื้อหาที่จะเขียนลงในไฟล์ env.js
const content = `
window.env = {
  SUPABASE_URL: "${supabaseUrl}",
  SUPABASE_KEY: "${supabaseKey}"
};
`;

// เขียนไฟล์ env.js
try {
  fs.writeFileSync('env.js', content);
  console.log('✅ สร้างไฟล์ env.js สำเร็จแล้ว!');
  console.log('-> URL:', supabaseUrl ? 'ระบุแล้ว' : 'ไม่พบ');
  console.log('-> KEY:', supabaseKey ? 'ระบุแล้ว' : 'ไม่พบ');
} catch (err) {
  console.error('❌ สร้างไฟล์ env.js ไม่สำเร็จ:', err);
  process.exit(1);
}