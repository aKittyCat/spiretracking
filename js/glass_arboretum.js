// State
let selectedCharId = null;
let currentInventory = [];
let craftingSlots = [null, null, null];

// DOM Elements
const charSelect = document.getElementById('characterSelect');
const invList = document.getElementById('inventoryList');
const addItemSelect = document.getElementById('addItemSelect');
const craftBtn = document.getElementById('craftBtn');
const loading = document.getElementById('loadingOverlay');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Characters
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html'; // Force login
        return;
    }

    const { data: chars, error } = await supabaseClient
        .from('characters')
        .select('id, name')
        .eq('user_id', user.id);

    if (error) console.error(error);

    chars.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.name;
        charSelect.appendChild(opt);
    });

    // Populate GM Add Item List
    INGREDIENTS_DB.sort((a,b) => a.name.localeCompare(b.name)).forEach(ing => {
        const opt = document.createElement('option');
        opt.value = ing.name;
        opt.innerText = `${ing.name} (${ing.rarity})`;
        addItemSelect.appendChild(opt);
    });

    // Event Listener
    charSelect.addEventListener('change', (e) => {
        selectedCharId = e.target.value;
        loadInventory();
        resetSlots();
    });
});

// --- Inventory Functions ---

async function loadInventory() {
    if (!selectedCharId) return;
    invList.innerHTML = '<div class="text-center text-gray-500"><i class="fas fa-sync fa-spin"></i> Loading...</div>';

    const { data, error } = await supabaseClient
        .from('character_inventories')
        .select('*')
        .eq('character_id', selectedCharId)
        .eq('category', 'ingredient')
        .gt('quantity', 0)
        .order('item_name');

    if (error) {
        console.error(error);
        invList.innerHTML = '<div class="text-red-500">Error loading inventory</div>';
        return;
    }

    currentInventory = data;
    renderInventory();
}

function renderInventory() {
    invList.innerHTML = '';
    if (currentInventory.length === 0) {
        invList.innerHTML = '<div class="text-center text-gray-500 py-4">ไม่มีวัตถุดิบในกระเป๋า</div>';
        return;
    }

    currentInventory.forEach(item => {
        // Find stats from DB constant
        const stats = INGREDIENTS_DB.find(i => i.name === item.item_name) || { combat: '?', utility: '?', whimsy: '?' };
        
        const div = document.createElement('div');
        div.className = 'bg-gray-800 p-2 rounded border border-gray-700 flex justify-between items-center';
        div.innerHTML = `
            <div>
                <div class="font-bold text-sm text-green-300">${item.item_name} <span class="text-xs text-gray-500">x${item.quantity}</span></div>
                <div class="text-xs text-gray-400 mt-1">
                    <span class="mr-2"><i class="fas fa-fist-raised text-red-900"></i> ${stats.combat}</span>
                    <span class="mr-2"><i class="fas fa-tools text-blue-900"></i> ${stats.utility}</span>
                    <span><i class="fas fa-hat-wizard text-purple-900"></i> ${stats.whimsy}</span>
                </div>
            </div>
            <button onclick="addToSlot('${item.item_name}')" class="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs">
                <i class="fas fa-plus"></i> ใส่
            </button>
        `;
        invList.appendChild(div);
    });
}

// --- Crafting Logic ---

function addToSlot(itemName) {
    // Check inventory count locally first
    const invItem = currentInventory.find(i => i.item_name === itemName);
    const usedCount = craftingSlots.filter(s => s && s.name === itemName).length;
    
    if (usedCount >= invItem.quantity) {
        alert('วัตถุดิบนี้ถูกใช้จนหมดแล้วในช่องปรุงยา');
        return;
    }

    // Find empty slot
    const emptyIndex = craftingSlots.findIndex(s => s === null);
    if (emptyIndex === -1) {
        alert('ช่องปรุงยาเต็มแล้ว (สูงสุด 3 ช่อง)');
        return;
    }

    const stats = INGREDIENTS_DB.find(i => i.name === itemName);
    craftingSlots[emptyIndex] = stats;
    updateSlotsUI();
}

function removeIngredient(index) {
    craftingSlots[index] = null;
    updateSlotsUI();
}

function resetSlots() {
    craftingSlots = [null, null, null];
    updateSlotsUI();
}

function updateSlotsUI() {
    let totalC = 0, totalU = 0, totalW = 0;
    let filledCount = 0;

    craftingSlots.forEach((item, index) => {
        const el = document.getElementById(`slot${index+1}`);
        if (item) {
            el.innerHTML = `
                <div class="text-center">
                    <div class="text-xs font-bold text-white">${item.name}</div>
                    <div class="text-[10px] text-gray-400">
                        C:${item.combat} U:${item.utility} W:${item.whimsy}
                    </div>
                </div>
            `;
            el.classList.add('filled');
            totalC += parseInt(item.combat);
            totalU += parseInt(item.utility);
            totalW += parseInt(item.whimsy);
            filledCount++;
        } else {
            el.innerHTML = `<span class="text-gray-500 text-sm">วัตถุดิบ ${index+1}</span>`;
            el.classList.remove('filled');
        }
    });

    document.getElementById('totalCombat').innerText = totalC;
    document.getElementById('totalUtility').innerText = totalU;
    document.getElementById('totalWhimsy').innerText = totalW;

    // Craft Button Logic
    if (filledCount === 3) {
        craftBtn.disabled = false;
        craftBtn.classList.remove('bg-gray-700', 'text-gray-400');
        craftBtn.classList.add('bg-green-600', 'text-white', 'hover:bg-green-500');
        calculatePreview(totalC, totalU, totalW);
    } else {
        craftBtn.disabled = true;
        craftBtn.classList.add('bg-gray-700', 'text-gray-400');
        craftBtn.classList.remove('bg-green-600', 'text-white', 'hover:bg-green-500');
        document.getElementById('previewResult').classList.add('hidden');
    }
}

function calculatePreview(c, u, w) {
    // Logic: หาค่าสูงสุด
    let maxVal = Math.max(c, u, w);
    let type = '';
    
    // Priority check (ถ้าเท่ากันเอาอะไร? ปกติ Combat > Utility > Whimsy หรือแล้วแต่ระบบ)
    if (maxVal === c) type = 'Combat';
    else if (maxVal === u) type = 'Utility';
    else type = 'Whimsical';

    const result = findPotion(type, maxVal);
    
    if (result) {
        document.getElementById('previewResult').classList.remove('hidden');
        document.getElementById('potionName').innerText = result.name;
        document.getElementById('potionDesc').innerText = result.desc;
        // Store for crafting
        craftingSlots.resultPotion = result;
    }
}

async function craftPotion() {
    if (!confirm(`ยืนยันการสร้าง "${craftingSlots.resultPotion.name}" ?\nวัตถุดิบจะถูกลบออกจากกระเป๋า`)) return;

    loading.classList.remove('hidden');

    try {
        // 1. Deduct Ingredients from DB
        // Group by item name to handle duplicates
        const usage = {};
        craftingSlots.forEach(item => {
            if(!item) return;
            usage[item.name] = (usage[item.name] || 0) + 1;
        });

        for (const [name, qty] of Object.entries(usage)) {
            // Get current qty first (to be safe)
            const { data: curr } = await supabaseClient
                .from('character_inventories')
                .select('quantity')
                .eq('character_id', selectedCharId)
                .eq('item_name', name)
                .single();
            
            const newQty = curr.quantity - qty;
            
            // Update
            await supabaseClient
                .from('character_inventories')
                .update({ quantity: newQty })
                .eq('character_id', selectedCharId)
                .eq('item_name', name);
        }

        // 2. Add Potion to Inventory (Category: Potion)
        const potionName = craftingSlots.resultPotion.name;
        
        // Check if potion exists
        const { data: existPot } = await supabaseClient
            .from('character_inventories')
            .select('quantity')
            .eq('character_id', selectedCharId)
            .eq('item_name', potionName)
            .eq('category', 'potion')
            .single();

        if (existPot) {
            await supabaseClient
                .from('character_inventories')
                .update({ quantity: existPot.quantity + 1 })
                .eq('character_id', selectedCharId)
                .eq('item_name', potionName);
        } else {
            await supabaseClient
                .from('character_inventories')
                .insert({
                    character_id: selectedCharId,
                    item_name: potionName,
                    quantity: 1,
                    category: 'potion'
                });
        }

        alert(`🎉 สร้างสำเร็จ! ได้รับ ${potionName}`);
        resetSlots();
        loadInventory(); // Refresh inventory

    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
        loading.classList.add('hidden');
    }
}

// --- GM Tool (Add Manual Item) ---
async function addManualItem() {
    const itemName = addItemSelect.value;
    if (!itemName || !selectedCharId) return;

    const { data: exist } = await supabaseClient
        .from('character_inventories')
        .select('quantity')
        .eq('character_id', selectedCharId)
        .eq('item_name', itemName)
        .single();

    if (exist) {
        await supabaseClient.from('character_inventories').update({ quantity: exist.quantity + 1 }).eq('character_id', selectedCharId).eq('item_name', itemName);
    } else {
        await supabaseClient.from('character_inventories').insert({ character_id: selectedCharId, item_name: itemName, quantity: 1, category: 'ingredient' });
    }
    loadInventory();
}