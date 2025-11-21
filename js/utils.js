// utils.js - ฟังก์ชันลบตัวละครและข้อมูลที่เกี่ยวข้อง
async function deleteCharacterAndData(charId, isOwner = true) {
  try {
    // 1. ดึงข้อมูลตัวละคร (เพื่อแสดงชื่อ)
    const charDoc = await db.collection('characters').doc(charId).get();
    if (!charDoc.exists) {
      throw new Error('ไม่พบตัวละคร');
    }
    const charName = charDoc.data().name;

    // 2. ลบ Session
    const sessions = await db.collection('sessions')
      .where('characterId', '==', charId)
      .get();
    const sessionDeletes = sessions.docs.map(doc => doc.ref.delete());

    // 3. ลบ Gold
    const golds = await db.collection('gold')
      .where('characterId', '==', charId)
      .get();
    const goldDeletes = golds.docs.map(doc => doc.ref.delete());

    // 4. ลบ Favor
    const favors = await db.collection('favor')
      .where('characterId', '==', charId)
      .get();
    const favorDeletes = favors.docs.map(doc => doc.ref.delete());

    // 5. ลบ DM Logs
    const dmLogs = await db.collection('dm_logs')
      .where('characterId', '==', charId)
      .get();
    const dmLogDeletes = dmLogs.docs.map(doc => doc.ref.delete());

    // 6. ลบตัวละคร
    await db.collection('characters').doc(charId).delete();

    // 7. รอให้ทุกอย่างเสร็จ
    await Promise.all([
      ...sessionDeletes,
      ...goldDeletes,
      ...favorDeletes,
      ...dmLogDeletes
    ]);

    return { success: true, message: `ลบตัวละคร "${charName}" และข้อมูลทั้งหมดเรียบร้อย!` };
  } catch (error) {
    console.error('ลบล้มเหลว:', error);
    return { success: false, message: error.message || 'เกิดข้อผิดพลาด' };
  }
}