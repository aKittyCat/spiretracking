// Database of Ingredients (จากไฟล์ Tracker.csv)
const INGREDIENTS_DB = [
    { name: "Boon Shard", combat: 0, utility: 0, whimsy: 0, rarity: "VR" },
    { name: "Amber", combat: 9, utility: 5, whimsy: 4, rarity: "C" },
    { name: "Apper Carrot", combat: 0, utility: 3, whimsy: 1, rarity: "C" },
    { name: "Bamboo", combat: 3, utility: 3, whimsy: 3, rarity: "C" },
    { name: "Bashu Powder", combat: 2, utility: 0, whimsy: 0, rarity: "C" },
    { name: "Black Cinnamon", combat: 16, utility: 12, whimsy: 11, rarity: "U" },
    { name: "Black Pearl", combat: 13, utility: 14, whimsy: 15, rarity: "U" },
    { name: "Blossom of Spirit Vine", combat: 18, utility: 18, whimsy: 19, rarity: "R" },
    { name: "Blue Back Salmon", combat: 3, utility: 4, whimsy: 7, rarity: "C" },
    { name: "Boom Beri", combat: 7, utility: 6, whimsy: 1, rarity: "C" },
    { name: "Bora Bug", combat: 4, utility: 8, whimsy: 3, rarity: "C" },
    { name: "Brush Reed", combat: 1, utility: 10, whimsy: 6, rarity: "C" },
    { name: "Bundle of Driko Twigs", combat: 1, utility: 1, whimsy: 2, rarity: "C" },
    { name: "Camp Mite", combat: 6, utility: 4, whimsy: 8, rarity: "C" },
    { name: "Chicken Egg", combat: 1, utility: 1, whimsy: 2, rarity: "C" },
    { name: "Chisuay's Heavenly Tea", combat: 2, utility: 7, whimsy: 5, rarity: "C" },
    { name: "Clay Snake Tail", combat: 8, utility: 6, whimsy: 5, rarity: "C" },
    { name: "Cloud Horn", combat: 1, utility: 0, whimsy: 0, rarity: "C" },
    { name: "Creeping Bolete", combat: 3, utility: 10, whimsy: 6, rarity: "C" },
    { name: "Dorrin Plate", combat: 7, utility: 8, whimsy: 4, rarity: "C" },
    { name: "Dried Fruit", combat: 2, utility: 1, whimsy: 4, rarity: "C" },
    { name: "Earwax", combat: 0, utility: 0, whimsy: 0, rarity: "C" },
    { name: "Fish Folk Tooth", combat: 9, utility: 4, whimsy: 3, rarity: "C" },
    { name: "Fish Head", combat: 4, utility: 5, whimsy: 4, rarity: "C" },
    { name: "Flash Paper", combat: 6, utility: 9, whimsy: 1, rarity: "C" },
    { name: "Gohaku Rice", combat: 3, utility: 2, whimsy: 3, rarity: "C" },
    { name: "Green Slime", combat: 8, utility: 2, whimsy: 5, rarity: "C" },
    { name: "Wolfenite", combat: 11, utility: 17, whimsy: 11, rarity: "U" },
    { name: "Vinyl Record", combat: 15, utility: 15, whimsy: 15, rarity: "U" },
    { name: "Munchanka Root", combat: 17, utility: 11, whimsy: 11, rarity: "U" }
    // ... สามารถเพิ่มรายการอื่นๆ จากไฟล์ CSV ได้ที่นี่
];

// Database of Potions Logic (จากไฟล์ Potions List.csv)
// Logic: type + value (Highest Attribute) -> Potion Result
const POTIONS_DB = {
    "Combat": {
        1: { name: "Rabbit's Speed", rarity: "common", desc: "Walking speed +5 ft for 10 mins." },
        2: { name: "Weapon Master's Elixir", rarity: "common", desc: "Gain proficiency with a melee weapon for 24 hours." },
        3: { name: "Spirit of Salyri", rarity: "common", desc: "Gain proficiency with one armor type for 24 hours." },
        4: { name: "Beast Hide", rarity: "common", desc: "Resistance to cold damage for 1 minute." },
        5: { name: "Spirit Armor", rarity: "common", desc: "AC 15 when unarmored for 1 hour." },
        6: { name: "Displacement Field", rarity: "common", desc: "Appear next to actual location." },
        // ... (ใส่ข้อมูลเพิ่มตาม CSV)
        59: { name: "Dragon's Breath", rarity: "rare", desc: "Exhale energy breath weapon." }, 
        60: { name: "Invulnerability", rarity: "rare", desc: "Resistance to all damage for 1 minute." }
    },
    "Utility": {
        1: { name: "Night Eye", rarity: "common", desc: "Darkvision 60ft for 1 hour." },
        // ... (ใส่ข้อมูลเพิ่ม)
        60: { name: "Wish in a Bottle", rarity: "rare", desc: "Cast Wish spell once." }
    },
    "Whimsical": {
        1: { name: "Giggle Juice", rarity: "common", desc: "Uncontrollable laughter." },
        // ... (ใส่ข้อมูลเพิ่ม)
        59: { name: "Chicken Chaser", rarity: "rare", desc: "Summon 100 chickens." },
        60: { name: "Disappearing Act", rarity: "rare", desc: "Vanish completely." }
    }
};

// Helper function to find potion
function findPotion(type, value) {
    const category = POTIONS_DB[type];
    if (!category) return null;

    // หาค่า Potion ที่ใกล้เคียงที่สุดแต่ไม่เกินค่า Value ที่ทำได้ (Fallback logic)
    // หรือถ้าตามกฎคือ "ต้องตรงเป๊ะ" ถ้าไม่ตรงจะได้ Sludge ให้แก้ logic ตรงนี้
    
    // Logic: หาค่า index ที่ตรงกับ value
    if (category[value]) {
        return category[value];
    }
    
    // กรณีไม่เจอค่าตรงเป๊ะ ให้หาค่าที่น้อยกว่าที่ใกล้ที่สุด (หรือจะให้ Fail ก็ได้)
    // ในที่นี้สมมติว่าถ้าค่าเกินให้ปัดลงมาหาอันสูงสุดที่มี
    let keys = Object.keys(category).map(Number).sort((a,b) => b-a);
    for (let k of keys) {
        if (value >= k) return category[k];
    }

    return { name: "Failed Sludge", rarity: "common", desc: "การปรุงยาผิดพลาด ได้เพียงโคลนเละๆ" };
}