// ระบบดึงข้อมูลจากลิงก์ D&D Beyond (เชื่อมกับช่อง sheetLink)
document.getElementById('sheetLink').addEventListener('blur', async function() {
  const url = this.value.trim();
  if (!url) return;

  const match = url.match(/\/characters\/(\d+)/);
  if (!match) return;

  const characterId = match[1];
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(
    `https://character-service.dndbeyond.com/character/v5/character/${characterId}`
  )}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('Failed to fetch');

    const json = await res.json();
    if (!json.success || !json.data) return;

    const c = json.data;
    const safeValue = (val, def = '') => val == null ? def : val;

    // ดึงชื่อ
    document.getElementById('charName').value = safeValue(c.name);

    // ดึงเผ่า
    const raceName = safeValue(c.race?.fullName || c.race?.baseRaceName, '');
    document.getElementById('charRace').value = raceName;

    // ดึงทอง
    document.getElementById('charGold').value = safeValue(c.currencies?.gp) || "";

    // === จัดการหลายคลาส ===
    if (Array.isArray(c.classes) && c.classes.length > 0) {
      // รวมเลเวลทั้งหมด
      const totalLevel = c.classes.reduce((sum, cls) => sum + (cls.level || 0), 0);
      document.getElementById('charLevel').value = totalLevel;

      // ดึงชื่อคลาสทั้งหมด (ไม่มีเลเวล)
      const classNames = c.classes
        .map(cls => cls.definition?.name || '')
        .filter(name => name.trim() !== '');
      
      document.getElementById('charClass').value = classNames.join(', ');
    } else {
      // กรณีไม่มีคลาส (ไม่น่าจะเกิด แต่ป้องกันไว้)
      document.getElementById('charLevel').value = 1;
      document.getElementById('charClass').value = '';
    }

  } catch (err) {
    console.warn('Auto-fill จาก D&D Beyond ล้มเหลว:', err);
    // ไม่ alert ผู้ใช้ — ปล่อยให้กรอกเองตามปกติ
  }
});