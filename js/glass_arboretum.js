// State
let selectedCharId = null;
let currentIngredients = [];
let currentPotions = [];
let craftingSlots = [null, null, null];
let activeTab = 'ingredients';

// DOM Elements
const charSelect = document.getElementById('characterSelect');
const invList = document.getElementById('inventoryList');
const potionList = document.getElementById('potionList');
const addItemSelect = document.getElementById('addItemSelect');
const craftBtn = document.getElementById('craftBtn');
const loading = document.getElementById('loadingOverlay');
const tieSection = document.getElementById('tieBreakerSection');
const tieButtons = document.getElementById('tieButtons');
const previewSection = document.getElementById('previewResult');
const craftLogSection = document.getElementById('craftResultLog');
const logText = document.getElementById('logText');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Characters
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html'; 
        return;
    }

    const { data: chars, error } = await supabase
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
        opt.innerText = `${ing.name}`;
        addItemSelect.appendChild(opt);
    });

    // Event Listener
    charSelect.addEventListener('change', (e) => {
        selectedCharId = e.target.value;
        loadAllInventory();
        resetSlots();
        hideLog();
    });
});

// --- Tab System ---
function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tabIngredients').classList.toggle('active', tab === 'ingredients');
    document.getElementById('tabPotions').classList.toggle('active', tab === 'potions');
    document.getElementById('contentIngredients').classList.toggle('hidden', tab !== 'ingredients');
    document.getElementById('contentIngredients').classList.toggle('flex', tab === 'ingredients'); // fix flex layout
    document.getElementById('contentPotions').classList.toggle('hidden', tab !== 'potions');
    document.getElementById('contentPotions').classList.toggle('flex', tab === 'potions');
}

// --- Inventory Functions ---

async function loadAllInventory() {
    if (!selectedCharId) return;
    invList.innerHTML = '<div class="text-center text-gray-500"><i class="fas fa-sync fa-spin"></i> Loading...</div>';
    potionList.innerHTML = '<div class="text-center text-gray-500"><i class="fas fa-sync fa-spin"></i> Loading...</div>';

    const { data, error } = await supabase
        .from('character_inventories')
        .select('*')
        .eq('character_id', selectedCharId)
        .gt('quantity', 0)
        .order('item_name');

    if (error) {
        console.error(error);
        return;
    }

    currentIngredients = data.filter(i => i.category === 'ingredient');
    currentPotions = data.filter(i => i.category === 'potion');
    
    renderIngredients();
    renderPotions();
}

function renderIngredients() {
    invList.innerHTML = '';
    if (currentIngredients.length === 0) {
        invList.innerHTML = '<div class="text-center text-gray-500 py-4">ไม่มีวัตถุดิบ</div>';
        return;
    }

    currentIngredients.forEach(item => {
        const stats = INGREDIENTS_DB.find(i => i.name === item.item_name) || { combat: '?', utility: '?', whimsy: '?' };
        
        const div = document.createElement('div');
        div.className = 'bg-gray-800 p-2 rounded border border-gray-700 flex justify-between items-center group hover:border-gray-500 transition';
        div.innerHTML = `
            <div class="flex-grow">
                <div class="font-bold text-sm text-green-300">${item.item_name}</div>
                <div class="text-[10px] text-gray-400 mt-0.5 flex gap-2">
                    <span class="text-red-400">C:${stats.combat}</span>
                    <span class="text-blue-400">U:${stats.utility}</span>
                    <span class="text-purple-400">W:${stats.whimsy}</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex items-center bg-gray-900 rounded px-1">
                    <button onclick="updateQty('${item.item_name}', -1, 'ingredient')" class="text-gray-500 hover:text-red-400 px-1.5 py-0.5 text-xs">-</button>
                    <span class="text-sm font-mono w-6 text-center text-white">${item.quantity}</span>
                    <button onclick="updateQty('${item.item_name}', 1, 'ingredient')" class="text-gray-500 hover:text-green-400 px-1.5 py-0.5 text-xs">+</button>
                </div>
                <button onclick="addToSlot('${item.item_name}')" class="bg-blue-600 hover:bg-blue-500 text-white w-8 h-8 rounded flex items-center justify-center shadow">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        invList.appendChild(div);
    });
}

function renderPotions() {
    potionList.innerHTML = '';
    if (currentPotions.length === 0) {
        potionList.innerHTML = '<div class="text-center text-gray-500 py-4">ยังไม่มียาในกระเป๋า</div>';
        return;
    }

    currentPotions.forEach(item => {
        const div = document.createElement('div');
        div.className = 'bg-gray-800 p-3 rounded border border-gray-600 flex justify-between items-center';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="text-2xl text-purple-400"><i class="fas fa-flask"></i></div>
                <div>
                    <div class="font-bold text-white">${item.item_name}</div>
                    <div class="text-xs text-gray-400">จำนวน: ${item.quantity} ขวด</div>
                </div>
            </div>
            <button onclick="deletePotion('${item.item_name}')" class="text-gray-500 hover:text-red-500 p-2" title="ลบทิ้ง">
                <i class="fas fa-trash"></i>
            </button>
        `;
        potionList.appendChild(div);
    });
}

async function updateQty(itemName, change, category) {
    if(!selectedCharId) return;
    
    // Find current qty
    const list = category === 'ingredient' ? currentIngredients : currentPotions;
    const item = list.find(i => i.item_name === itemName);
    if (!item) return;

    const newQty = item.quantity + change;

    try {
        if (newQty <= 0) {
            if(!confirm(`ต้องการลบ "${itemName}" ออกจากกระเป๋าใช่หรือไม่?`)) return;
            await supabase.from('character_inventories')
                .delete()
                .eq('character_id', selectedCharId)
                .eq('item_name', itemName);
        } else {
            await supabase.from('character_inventories')
                .update({ quantity: newQty })
                .eq('character_id', selectedCharId)
                .eq('item_name', itemName);
        }
        loadAllInventory(); // Refresh UI
    } catch(e) {
        console.error(e);
        alert('เกิดข้อผิดพลาดในการอัปเดต');
    }
}

async function deletePotion(itemName) {
    updateQty(itemName, -1, 'potion'); // Use same logic, decrease by 1 or delete if 0
}

// --- Crafting Logic ---

function addToSlot(itemName) {
    const invItem = currentIngredients.find(i => i.item_name === itemName);
    const usedCount = craftingSlots.filter(s => s && s.name === itemName).length;
    
    if (usedCount >= invItem.quantity) {
        alert('วัตถุดิบนี้ถูกใช้จนหมดแล้วในช่องปรุงยา');
        return;
    }

    const emptyIndex = craftingSlots.findIndex(s => s === null);
    if (emptyIndex === -1) {
        alert('ช่องปรุงยาเต็มแล้ว');
        return;
    }

    const stats = INGREDIENTS_DB.find(i => i.name === itemName);
    craftingSlots[emptyIndex] = stats;
    updateSlotsUI();
    hideLog();
}

function removeIngredient(index) {
    craftingSlots[index] = null;
    updateSlotsUI();
    hideLog();
}

function resetSlots() {
    craftingSlots = [null, null, null];
    updateSlotsUI();
    hideLog();
}

function updateSlotsUI() {
    let totalC = 0, totalU = 0, totalW = 0;
    let filledCount = 0;

    craftingSlots.forEach((item, index) => {
        const el = document.getElementById(`slot${index+1}`);
        if (item) {
            el.innerHTML = `
                <div class="text-center w-full h-full flex flex-col justify-center items-center bg-gray-800 rounded border border-green-900">
                    <div class="text-xs font-bold text-white mb-1 truncate px-1 w-full">${item.name}</div>
                    <div class="text-[10px] text-gray-400 flex gap-1">
                        <span class="text-red-300">${item.combat}</span>
                        <span class="text-blue-300">${item.utility}</span>
                        <span class="text-purple-300">${item.whimsy}</span>
                    </div>
                </div>
            `;
            el.classList.add('filled', 'border-0', 'p-0');
            totalC += parseInt(item.combat);
            totalU += parseInt(item.utility);
            totalW += parseInt(item.whimsy);
            filledCount++;
        } else {
            el.innerHTML = `<span class="text-gray-600 text-sm">ว่าง</span>`;
            el.classList.remove('filled', 'border-0', 'p-0');
        }
    });

    document.getElementById('totalCombat').innerText = totalC;
    document.getElementById('totalUtility').innerText = totalU;
    document.getElementById('totalWhimsy').innerText = totalW;

    // Craft Button & Preview Logic
    if (filledCount === 3) {
        // Reset manual override
        craftingSlots.selectedTypeOverride = null;
        calculateResult(totalC, totalU, totalW);
    } else {
        craftBtn.disabled = true;
        craftBtn.classList.add('bg-gray-700', 'text-gray-500');
        craftBtn.classList.remove('bg-green-600', 'text-white', 'hover:bg-green-500');
        craftBtn.innerText = 'เลือกวัตถุดิบให้ครบ 3 อย่าง';
        previewSection.classList.add('hidden');
        tieSection.classList.add('hidden');
    }
}

function calculateResult(c, u, w) {
    let maxVal = Math.max(c, u, w);
    
    // Check for ties
    let ties = [];
    if (c === maxVal) ties.push('Combat');
    if (u === maxVal) ties.push('Utility');
    if (w === maxVal) ties.push('Whimsical');

    // Case 1: Tie exists AND user hasn't selected yet
    if (ties.length > 1 && !craftingSlots.selectedTypeOverride) {
        showTieBreaker(ties, maxVal);
        return;
    }

    // Case 2: No tie OR User selected override
    let finalType = craftingSlots.selectedTypeOverride || ties[0];
    
    // Hide Tie Breaker UI
    tieSection.classList.add('hidden');

    const result = findPotion(finalType, maxVal);
    
    if (result) {
        previewSection.classList.remove('hidden');
        document.getElementById('potionName').innerText = result.name;
        document.getElementById('potionDesc').innerText = result.desc;
        
        craftingSlots.resultPotion = result;
        
        // Enable Button
        craftBtn.disabled = false;
        craftBtn.classList.remove('bg-gray-700', 'text-gray-500');
        craftBtn.classList.add('bg-green-600', 'text-white', 'hover:bg-green-500');
        craftBtn.innerText = 'ปรุงยา (Craft)';
    }
}

function showTieBreaker(types, val) {
    tieSection.classList.remove('hidden');
    previewSection.classList.add('hidden');
    craftBtn.disabled = true;
    craftBtn.innerText = 'กรุณาเลือกสายพลังก่อน';

    tieButtons.innerHTML = '';
    
    types.forEach(type => {
        let colorClass = '';
        let icon = '';
        if(type === 'Combat') { colorClass = 'bg-red-900 hover:bg-red-800 text-red-100'; icon = 'fa-fist-raised'; }
        if(type === 'Utility') { colorClass = 'bg-blue-900 hover:bg-blue-800 text-blue-100'; icon = 'fa-tools'; }
        if(type === 'Whimsical') { colorClass = 'bg-purple-900 hover:bg-purple-800 text-purple-100'; icon = 'fa-hat-wizard'; }

        const btn = document.createElement('button');
        btn.className = `${colorClass} px-4 py-2 rounded text-sm font-bold transition`;
        btn.innerHTML = `<i class="fas ${icon}"></i> ${type}`;
        btn.onclick = () => {
            craftingSlots.selectedTypeOverride = type; // Set override
            // Re-calculate with selected type
            const totalC = parseInt(document.getElementById('totalCombat').innerText);
            const totalU = parseInt(document.getElementById('totalUtility').innerText);
            const totalW = parseInt(document.getElementById('totalWhimsy').innerText);
            calculateResult(totalC, totalU, totalW);
        };
        tieButtons.appendChild(btn);
    });
}

async function craftPotion() {
    loading.classList.remove('hidden');

    try {
        // 1. Deduct Ingredients
        const usage = {};
        craftingSlots.forEach(item => { if(item) usage[item.name] = (usage[item.name] || 0) + 1; });

        for (const [name, qty] of Object.entries(usage)) {
            const { data: curr } = await supabase
                .from('character_inventories')
                .select('quantity')
                .eq('character_id', selectedCharId)
                .eq('item_name', name)
                .single();
            
            await supabase
                .from('character_inventories')
                .update({ quantity: curr.quantity - qty })
                .eq('character_id', selectedCharId)
                .eq('item_name', name);
        }

        // 2. Add Potion
        const potionName = craftingSlots.resultPotion.name;
        const { data: existPot } = await supabase
            .from('character_inventories')
            .select('quantity')
            .eq('character_id', selectedCharId)
            .eq('item_name', potionName)
            .eq('category', 'potion')
            .single();

        if (existPot) {
            await supabase.from('character_inventories').update({ quantity: existPot.quantity + 1 }).eq('character_id', selectedCharId).eq('item_name', potionName);
        } else {
            await supabase.from('character_inventories').insert({ character_id: selectedCharId, item_name: potionName, quantity: 1, category: 'potion' });
        }

        // 3. Show Log
        showCraftLog();
        
        // Refresh & Reset
        loadAllInventory();
        resetSlots();

    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการปรุงยา');
    } finally {
        loading.classList.add('hidden');
    }
}

function showCraftLog() {
    const charName = charSelect.options[charSelect.selectedIndex].text;
    const ingredients = craftingSlots.filter(x=>x).map(x => x.name).join(', ');
    const result = craftingSlots.resultPotion.name;

    const log = `ชื่อตัวละคร: ${charName}\nวัตถุดิบที่ใช้: ${ingredients}\nPotion ที่ได้: ${result}`;
    
    logText.innerText = log;
    craftLogSection.classList.remove('hidden');
    
    // Scroll to log
    craftLogSection.scrollIntoView({ behavior: 'smooth' });
}

function copyCraftLog() {
    const text = logText.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('#craftResultLog button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    });
}

function hideLog() {
    craftLogSection.classList.add('hidden');
}

// --- GM Tool ---
async function addManualItem() {
    const itemName = addItemSelect.value;
    if (!itemName || !selectedCharId) return;
    await updateQty(itemName, 1, 'ingredient');
    
    // Check if user is in ingredients tab, if not switch? No need, just reload.
    if(activeTab !== 'ingredients') switchTab('ingredients');
}