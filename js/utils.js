async function deleteCharacterAndData(charId, isOwner = true) {
  try {
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', charId);

    if (error) throw error;

    return { success: true, message: `ลบตัวละครและข้อมูลทั้งหมดเรียบร้อย!` };
  } catch (error) {
    console.error('ลบล้มเหลว:', error);
    return { success: false, message: error.message || 'เกิดข้อผิดพลาด' };
  }
}