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
 * ดึง avatarUrl จาก sheet_link ของ D&D Beyond
 * @param {string} sheetLink - URL ของ character sheet
 * @returns {Promise<string|null>} - URL ของรูป avatar หรือ null
 */
async function fetchAvatarUrl(sheetLink) {
  try {
    const charId = extractCharacterId(sheetLink);
    if (!charId) return null;
    const data = await fetchCharacterData(charId);
    return data?.decorations?.avatarUrl || null;
  } catch {
    return null;
  }
}