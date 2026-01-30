// State
let selectedCharId = null;
let selectedCharName = "";
let currentInventory = [];
let currentPotions = [];
let craftingSlots = [null, null, null];
let selectedAttribute = null; // เก็บค่าที่ user เลือกตอน tie-break

// DOM Elements
const charSelect = document.getElementById('characterSelect');
const invList = document.getElementById('inventoryList');
const potList = document.getElementById('potionList');
const craftBtn = document.getElementById('craftBtn');
const loading = document.getElementById('loadingOverlay');
const tieBreakerDiv = document.getElementById('tieBreaker');
const tieButtonsDiv = document.getElementById('tieButtons');
const logArea = document.getElementById('craftLogArea');
const logContent = document.getElementById('logContent');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    const { data: chars } = await supabase.from('characters').select('id, name').eq('user_id', user.id);
    chars.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.innerText = c.name;
        charSelect.appendChild(opt);
    });

    // Populate GM Item List
    INGREDIENTS_DB.sort((a, b) => a.name.localeCompare(b.name)).forEach(ing => {
        const opt = document.createElement('option');
        opt.value = ing.name; opt.innerText = ing.name;
        document.getElementById('addItemSelect').appendChild(opt);
    });

    charSelect.addEventListener('change', (e) => {
        selectedCharId = e.target.value;
        selectedCharName = e.target.options[e.target.selectedIndex].text;
        loadData();
        resetSlots();
        // Hide log on char change
        logArea.classList.add('hidden');
    });
});

// --- Tab System ---
function switchTab(tab) {
    const invEl = document.getElementById('inventoryList');
    const potEl = document.getElementById('potionList');
    const btnIng = document.getElementById('tabIngBtn');
    const btnPot = document.getElementById('tabPotBtn');
    const gmPanel = document.getElementById('gmPanel');

    if (tab === 'ingredient') {
        invEl.classList.remove('hidden');
        potEl.classList.add('hidden');
        gmPanel.classList.remove('hidden');
        btnIng.className = 'tab-btn active pb-3 text-sm font-semibold text-green-400 flex items-center gap-2';
        btnPot.className = 'tab-btn pb-3 text-sm font-semibold text-gray-400 hover:text-gray-200 flex items-center gap-2';
    } else {
        invEl.classList.add('hidden');
        potEl.classList.remove('hidden');
        gmPanel.classList.add('hidden');
        btnIng.className = 'tab-btn pb-3 text-sm font-semibold text-gray-400 hover:text-gray-200 flex items-center gap-2';
        btnPot.className = 'tab-btn active pb-3 text-sm font-semibold text-green-400 flex items-center gap-2';
    }
}

// --- Data Loading ---
async function loadData() {
    if (!selectedCharId) return;
    invList.innerHTML = potList.innerHTML = '<div class="text-center text-gray-500"><i class="fas fa-sync fa-spin"></i> Loading...</div>';

    // Load Ingredients
    const { data: ingData } = await supabase.from('character_inventories')
        .select('*').eq('character_id', selectedCharId).eq('category', 'ingredient').gt('quantity', 0).order('item_name');
    currentInventory = ingData || [];
    renderInventory();

    // Load Potions
    const { data: potData } = await supabase.from('character_inventories')
        .select('*').eq('character_id', selectedCharId).eq('category', 'potion').gt('quantity', 0).order('item_name');
    currentPotions = potData || [];
    renderPotions();
}

// --- Render Inventory (Ingredients) with +/- ---
function renderInventory() {
    invList.innerHTML = '';
    if (currentInventory.length === 0) {
        invList.innerHTML = '<div class="text-center text-gray-500 py-4">ไม่มีวัตถุดิบ</div>';
        return;
    }

    currentInventory.forEach(item => {
        const stats = INGREDIENTS_DB.find(i => i.name === item.item_name) || { combat: '?', utility: '?', whimsy: '?' };
        const safeName = item.item_name.replace(/'/g, "\\'");
        const div = document.createElement('div');
        div.className = 'bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex justify-between items-center hover:bg-gray-800 transition';
        div.innerHTML = `
            <div>
                <div class="font-bold text-sm text-green-300">${item.item_name}</div>
                <div class="text-xs text-gray-400 mb-1">
                    <span class="mr-1 text-red-300">C:${stats.combat}</span>
                    <span class="mr-1 text-blue-300">U:${stats.utility}</span>
                    <span class="text-purple-300">W:${stats.whimsy}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="adjustQty('${safeName}', -1)" class="bg-gray-700 hover:bg-red-900 text-white w-5 h-5 rounded flex items-center justify-center text-xs">-</button>
                    <span class="text-xs font-bold w-6 text-center text-white bg-gray-900 rounded">${item.quantity}</span>
                    <button onclick="adjustQty('${safeName}', 1)" class="bg-gray-700 hover:bg-green-900 text-white w-5 h-5 rounded flex items-center justify-center text-xs">+</button>
                </div>
            </div>
            <button onclick="addToSlot('${safeName}')" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-medium h-full ml-2 shadow-lg shadow-green-600/20 transition">
                ใส่
            </button>
        `;
        invList.appendChild(div);
    });
}

// --- Render Potion Bag ---
function renderPotions() {
    potList.innerHTML = '';
    if (currentPotions.length === 0) {
        potList.innerHTML = '<div class="text-center text-gray-500 py-4">ไม่มี Potion ที่ปรุงไว้</div>';
        return;
    }

    currentPotions.forEach(item => {
        const safeName = item.item_name.replace(/'/g, "\\'");
        const div = document.createElement('div');
        div.className = 'bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex justify-between items-center hover:bg-gray-800 transition';
        div.innerHTML = `
            <div>
                <div class="font-bold text-sm text-yellow-300">${item.item_name}</div>
                <div class="text-xs text-gray-400">จำนวน: ${item.quantity}</div>
            </div>
            <button onclick="deletePotion('${safeName}')" class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition border border-red-600/30">
                <i class="fas fa-trash"></i> ลบ
            </button>
        `;
        potList.appendChild(div);
    });
}

// --- Adjust Quantity Logic ---
async function adjustQty(name, delta) {
    const item = currentInventory.find(i => i.item_name === name);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 0) return; // Prevent negative

    // Optimistic Update
    item.quantity = newQty;
    if (newQty === 0) {
        currentInventory = currentInventory.filter(i => i.item_name !== name);
    }
    renderInventory();

    // DB Update
    if (newQty > 0) {
        await supabase.from('character_inventories')
            .update({ quantity: newQty })
            .eq('character_id', selectedCharId).eq('item_name', name);
    } else {
        await supabase.from('character_inventories')
            .delete()
            .eq('character_id', selectedCharId).eq('item_name', name);
    }
}

async function deletePotion(name) {
    if (!confirm(`ต้องการลบ ${name} ใช่หรือไม่?`)) return;

    // Find DB ID for specific deletion or just quantity decrement
    // Here logic implies removing 1 qty
    const item = currentPotions.find(i => i.item_name === name);
    const newQty = item.quantity - 1;

    if (newQty > 0) {
        await supabase.from('character_inventories').update({ quantity: newQty }).eq('character_id', selectedCharId).eq('item_name', name);
    } else {
        await supabase.from('character_inventories').delete().eq('character_id', selectedCharId).eq('item_name', name).eq('category', 'potion');
    }
    loadData(); // Refresh full data
}

// --- Crafting Logic ---

function addToSlot(itemName) {
    const invItem = currentInventory.find(i => i.item_name === itemName);
    const usedCount = craftingSlots.filter(s => s && s.name === itemName).length;

    if (!invItem || usedCount >= invItem.quantity) {
        alert('วัตถุดิบไม่พอ'); return;
    }
    const emptyIndex = craftingSlots.findIndex(s => s === null);
    if (emptyIndex === -1) { alert('ช่องเต็ม'); return; }

    craftingSlots[emptyIndex] = INGREDIENTS_DB.find(i => i.name === itemName);
    updateSlotsUI();
}

function removeIngredient(index) {
    craftingSlots[index] = null;
    updateSlotsUI();
}

function resetSlots() {
    craftingSlots = [null, null, null];
    selectedAttribute = null;
    tieBreakerDiv.classList.add('hidden');
    document.getElementById('previewResult').classList.add('hidden');
    craftBtn.disabled = true;
    updateSlotsUI();
}

function updateSlotsUI() {
    let totalC = 0, totalU = 0, totalW = 0;
    let filledCount = 0;

    craftingSlots.forEach((item, index) => {
        const el = document.getElementById(`slot${index + 1}`);
        if (item) {
            el.innerHTML = `<div class="text-center"><div class="text-xs font-bold text-white">${item.name}</div></div>`;
            el.classList.add('filled');
            totalC += parseInt(item.combat);
            totalU += parseInt(item.utility);
            totalW += parseInt(item.whimsy);
            filledCount++;
        } else {
            el.innerHTML = `<span class="text-gray-500 text-sm">วัตถุดิบ ${index + 1}</span>`;
            el.classList.remove('filled');
        }
    });

    document.getElementById('totalCombat').innerText = totalC;
    document.getElementById('totalUtility').innerText = totalU;
    document.getElementById('totalWhimsy').innerText = totalW;

    if (filledCount === 3) {
        // Check for Tie
        const maxVal = Math.max(totalC, totalU, totalW);
        const candidates = [];
        if (totalC === maxVal) candidates.push('Combat');
        if (totalU === maxVal) candidates.push('Utility');
        if (totalW === maxVal) candidates.push('Whimsical');

        if (candidates.length > 1) {
            // Tie found -> Show Selector
            tieBreakerDiv.classList.remove('hidden');
            tieButtonsDiv.innerHTML = '';

            candidates.forEach(type => {
                const btn = document.createElement('button');
                btn.className = `px-4 py-2 rounded-lg text-sm font-medium border transition ${selectedAttribute === type ? 'bg-yellow-600 text-white border-yellow-500 shadow-lg shadow-yellow-600/20' : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white'}`;

                // Icon mapping
                let icon = '';
                if (type === 'Combat') icon = '<i class="fas fa-fist-raised"></i>';
                if (type === 'Utility') icon = '<i class="fas fa-tools"></i>';
                if (type === 'Whimsical') icon = '<i class="fas fa-hat-wizard"></i>';

                btn.innerHTML = `${icon} ${type}`;
                btn.onclick = () => {
                    selectedAttribute = type;
                    updateSlotsUI(); // Re-run to update selection visual and preview
                };
                tieButtonsDiv.appendChild(btn);
            });

            // If user hasn't selected yet, disable craft
            if (!selectedAttribute) {
                craftBtn.disabled = true;
                craftBtn.classList.add('bg-gray-700', 'text-gray-400');
                document.getElementById('previewResult').classList.add('hidden');
                return;
            }
        } else {
            // No tie -> Auto select
            selectedAttribute = candidates[0];
            tieBreakerDiv.classList.add('hidden');
        }

        // Show Preview
        craftBtn.disabled = false;
        craftBtn.classList.remove('bg-gray-700', 'text-gray-400');
        craftBtn.classList.add('bg-green-600', 'text-white', 'hover:bg-green-500');

        // Find Result using selectedAttribute (needs to convert Whimsical -> Whimsy if needed, but DB uses keys)
        // Adjust DB key in data.js to match: "Whimsical" or "Whimsy"
        // Let's assume DB keys are: Combat, Utility, Whimsical
        const result = findPotion(selectedAttribute, maxVal);

        if (result) {
            document.getElementById('previewResult').classList.remove('hidden');
            document.getElementById('potionName').innerText = result.name;
            document.getElementById('potionDesc').innerText = result.desc;
            craftingSlots.resultPotion = result;
        }

    } else {
        craftBtn.disabled = true;
        craftBtn.classList.add('bg-gray-700', 'text-gray-400');
        tieBreakerDiv.classList.add('hidden');
        document.getElementById('previewResult').classList.add('hidden');
        selectedAttribute = null;
    }
}

async function craftPotion() {
    loading.classList.remove('hidden');
    logArea.classList.add('hidden');

    try {
        // 1. Deduct Ingredients
        const usage = {};
        craftingSlots.forEach(item => { if (item) usage[item.name] = (usage[item.name] || 0) + 1; });

        for (const [name, qty] of Object.entries(usage)) {
            const item = currentInventory.find(i => i.item_name === name);
            const newQty = item.quantity - qty;
            if (newQty > 0) {
                await supabase.from('character_inventories').update({ quantity: newQty }).eq('character_id', selectedCharId).eq('item_name', name);
            } else {
                await supabase.from('character_inventories').delete().eq('character_id', selectedCharId).eq('item_name', name);
            }
        }

        // 2. Add Potion
        const potionName = craftingSlots.resultPotion.name;
        const { data: exist } = await supabase.from('character_inventories')
            .select('quantity').eq('character_id', selectedCharId).eq('item_name', potionName).eq('category', 'potion').single();

        if (exist) {
            await supabase.from('character_inventories').update({ quantity: exist.quantity + 1 }).eq('character_id', selectedCharId).eq('item_name', potionName);
        } else {
            await supabase.from('character_inventories').insert({ character_id: selectedCharId, item_name: potionName, quantity: 1, category: 'potion' });
        }

        // 3. Generate Log
        const usedIngs = craftingSlots.map(s => s.name).join(', ');
        const logText = `ชื่อตัวละคร: ${selectedCharName}\nวัตถุดิบที่ใช้: ${usedIngs}\nPotion ที่ได้: ${potionName}`;

        logContent.innerText = logText;
        logArea.classList.remove('hidden');

        // Reset
        resetSlots();
        loadData(); // Refresh Tabs

    } catch (err) {
        console.error(err);
        alert('Error Crafting');
    } finally {
        loading.classList.add('hidden');
    }
}

function copyLog() {
    const text = document.getElementById('logContent').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert('คัดลอกเรียบร้อย! นำไปแปะใน Discord ได้เลย');
    });
}

// GM Tool
async function addManualItem() {
    const itemName = document.getElementById('addItemSelect').value;
    if (!itemName || !selectedCharId) return;

    // Check local first to save bandwidth? or direct DB
    const { data: exist } = await supabase.from('character_inventories')
        .select('quantity').eq('character_id', selectedCharId).eq('item_name', itemName).eq('category', 'ingredient').single();

    if (exist) {
        await supabase.from('character_inventories').update({ quantity: exist.quantity + 1 }).eq('character_id', selectedCharId).eq('item_name', itemName);
    } else {
        await supabase.from('character_inventories').insert({ character_id: selectedCharId, item_name: itemName, quantity: 1, category: 'ingredient' });
    }
    loadData();
}