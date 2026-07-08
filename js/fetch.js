// ===== D&D Beyond Character Fetcher =====

/**
 * ดึง Character ID จาก URL ของ D&D Beyond
 * @param {string} url - URL ของ character sheet
 * @returns {string|null} - Character ID หรือ null
 */
function extractCharacterId(url) {
  if (!url) return null;
  const match = url.match(/\/characters\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * ดึงข้อมูลตัวละครจาก D&D Beyond API
 * - Production (Vercel): ใช้ /api/ddb-proxy (serverless function ของเราเอง)
 * - Localhost: ใช้ corsproxy.io เป็น fallback
 * @param {string} characterId - ID ของตัวละคร
 * @returns {Promise<object|null>} - ข้อมูลตัวละคร หรือ null ถ้าล้มเหลว
 */
async function fetchCharacterData(characterId) {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const url = isLocal
    ? `https://corsproxy.io/?${encodeURIComponent(`https://character-service.dndbeyond.com/character/v5/character/${characterId}`)}`
    : `/api/ddb-proxy?id=${characterId}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  if (!json.success || !json.data) return null;
  return json.data;
}

/**
 * เคลียร์ Cache รูปภาพทั้งหมด
 */
function clearAvatarCache() {
  const keys = Object.keys(localStorage);
  for (let key of keys) {
    if (key.startsWith('ddb_avatar_')) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * ดึง avatarUrl จาก sheet_link ของ D&D Beyond
 * @param {string} sheetLink - URL ของ character sheet
 * @returns {Promise<string|null>} - URL ของรูป avatar หรือ null
 */
async function fetchAvatarUrl(sheetLink) {
  try {
    const charId = extractCharacterId(sheetLink);
    if (!charId) return null;

    // 1. ตรวจสอบใน Cache (LocalStorage)
    const cacheKey = `ddb_avatar_${charId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const now = new Date().getTime();
        // ถ้าเวลาปัจจุบันยังไม่เกิน 24 ชั่วโมง (24 * 60 * 60 * 1000 = 86400000 ms)
        if (now - parsed.timestamp < 86400000 && parsed.url !== 'null') {
          return parsed.url;
        }
      } catch (e) {
        // ถ้า parse error ให้ปล่อยผ่านไปดึงใหม่
      }
    }

    // 2. ถ้าไม่มีใน Cache หรือหมดอายุ ให้โหลดจาก API
    const data = await fetchCharacterData(charId);
    const url = data?.decorations?.avatarUrl || null;
    
    // 3. บันทึกลง Cache พร้อมระบุเวลา (Timestamp)
    if (url) {
      const cacheObj = {
        url: url,
        timestamp: new Date().getTime()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
    }
    
    return url;
  } catch (e) {
    console.warn("Failed to fetch avatar:", e);
    return null;
  }
}