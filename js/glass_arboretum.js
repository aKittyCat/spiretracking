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

    // Display user email
    document.getElementById('userEmail').textContent = user.email;

    const { data: chars } = await supabase.from('characters').select('id, name').eq('user_id', user.id);
    chars.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.innerText = c.name;
        charSelect.appendChild(opt);
    });

    // Check if admin and load all characters
    checkAdminAndLoadAllCharacters();

    // Initialize Searchable Dropdown for GM Item List
    initSearchableDropdown();

    // Initialize Ingredients Grid
    renderIngredientsGrid();
    updateIngredientStats();

    // Initialize Potions Grid
    initPotionsData();
    renderPotionsGrid();
    updatePotionStats();

    // Initialize Boons Grid
    renderBoonsGrid();
    updateBoonStats();

    charSelect.addEventListener('change', (e) => {
        selectedCharId = e.target.value;
        selectedCharName = e.target.options[e.target.selectedIndex].text;

        // Reset admin selection when using normal dropdown
        const adminWrapper = document.getElementById('adminCharSelectWrapper');
        if (adminWrapper && !adminWrapper.classList.contains('hidden')) {
            document.getElementById('adminSelectedCharName').innerText = 'เลือกตัวละครผู้เล่น...';
        }

        loadData();
        resetSlots();
        // Hide log on char change
        logArea.classList.add('hidden');
    });
});

// --- Main Page Navigation ---
function switchMainPage(page) {
    const pageCrafter = document.getElementById('page-crafter');
    const pageGuide = document.getElementById('page-guide');
    const pageIngredients = document.getElementById('page-ingredients');
    const pagePotions = document.getElementById('page-potions');
    const pageBoons = document.getElementById('page-boons');
    const btnCrafter = document.getElementById('mainTabCrafter');
    const btnGuide = document.getElementById('mainTabGuide');
    const btnIngredients = document.getElementById('mainTabIngredients');
    const btnPotions = document.getElementById('mainTabPotions');
    const btnBoons = document.getElementById('mainTabBoons');

    // Hide all pages
    pageCrafter.classList.add('hidden');
    pageGuide.classList.add('hidden');
    pageIngredients.classList.add('hidden');
    pagePotions.classList.add('hidden');
    pageBoons.classList.add('hidden');

    // Deactivate all buttons
    btnCrafter.classList.remove('active', 'text-green-400');
    btnCrafter.classList.add('text-gray-400');
    btnGuide.classList.remove('active', 'text-green-400');
    btnGuide.classList.add('text-gray-400');
    btnIngredients.classList.remove('active', 'text-green-400');
    btnIngredients.classList.add('text-gray-400');
    btnPotions.classList.remove('active', 'text-green-400');
    btnPotions.classList.add('text-gray-400');
    btnBoons.classList.remove('active', 'text-green-400');
    btnBoons.classList.add('text-gray-400');

    // Show selected page and activate button
    if (page === 'crafter') {
        pageCrafter.classList.remove('hidden');
        btnCrafter.classList.add('active', 'text-green-400');
        btnCrafter.classList.remove('text-gray-400');
    } else if (page === 'guide') {
        pageGuide.classList.remove('hidden');
        btnGuide.classList.add('active', 'text-green-400');
        btnGuide.classList.remove('text-gray-400');
    } else if (page === 'ingredients') {
        pageIngredients.classList.remove('hidden');
        btnIngredients.classList.add('active', 'text-green-400');
        btnIngredients.classList.remove('text-gray-400');
    } else if (page === 'potions') {
        pagePotions.classList.remove('hidden');
        btnPotions.classList.add('active', 'text-green-400');
        btnPotions.classList.remove('text-gray-400');
    } else if (page === 'boons') {
        pageBoons.classList.remove('hidden');
        btnBoons.classList.add('active', 'text-green-400');
        btnBoons.classList.remove('text-gray-400');
    }
}

// --- Ingredients Grid ---
function renderIngredientsGrid(filteredData = null) {
    const grid = document.getElementById('ingredientsGrid');
    const data = filteredData || INGREDIENTS_DB;

    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-search text-4xl mb-3 block"></i>ไม่พบวัตถุดิบที่ค้นหา</div>';
        return;
    }

    // Sort by name
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(ing => {
        const card = document.createElement('div');
        card.className = `bg-gray-900/50 p-4 rounded-xl border border-gray-800 hover:border-gray-600 transition rarity-badge-${ing.rarity}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="font-semibold text-white text-sm">${ing.name}</span>
                <span class="text-xs px-2 py-0.5 rounded-full rarity-${ing.rarity} font-medium">${getRarityLabel(ing.rarity)}</span>
            </div>
            <div class="flex gap-3 text-sm">
                <span class="text-red-400"><i class="fas fa-fist-raised"></i> ${ing.combat}</span>
                <span class="text-blue-400"><i class="fas fa-tools"></i> ${ing.utility}</span>
                <span class="text-purple-400"><i class="fas fa-hat-wizard"></i> ${ing.whimsy}</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getRarityLabel(rarity) {
    switch (rarity) {
        case 'C': return 'Common';
        case 'U': return 'Uncommon';
        case 'R': return 'Rare';
        case 'VR': return 'Very Rare';
        default: return rarity;
    }
}

function filterIngredients() {
    const searchTerm = document.getElementById('ingredientSearch').value.toLowerCase();
    const rarityFilter = document.getElementById('rarityFilter').value;

    let filtered = INGREDIENTS_DB.filter(ing => {
        const matchesSearch = ing.name.toLowerCase().includes(searchTerm);
        const matchesRarity = !rarityFilter || ing.rarity === rarityFilter;
        return matchesSearch && matchesRarity;
    });

    renderIngredientsGrid(filtered);
}

function updateIngredientStats() {
    const total = INGREDIENTS_DB.length;
    const common = INGREDIENTS_DB.filter(i => i.rarity === 'C').length;
    const uncommon = INGREDIENTS_DB.filter(i => i.rarity === 'U').length;
    const rare = INGREDIENTS_DB.filter(i => i.rarity === 'R').length;

    document.getElementById('totalIngredients').textContent = total;
    document.getElementById('commonCount').textContent = common;
    document.getElementById('uncommonCount').textContent = uncommon;
    document.getElementById('rareCount').textContent = rare;
}

// --- Potions Grid ---
let allPotionsFlat = [];

function initPotionsData() {
    allPotionsFlat = [];
    ['Combat', 'Utility', 'Whimsical'].forEach(type => {
        if (POTIONS_DB[type]) {
            Object.entries(POTIONS_DB[type]).forEach(([num, potion]) => {
                allPotionsFlat.push({
                    num: parseInt(num),
                    type: type,
                    name: potion.name,
                    rarity: potion.rarity,
                    desc: potion.desc
                });
            });
        }
    });
}

function renderPotionsGrid(filteredData = null) {
    const grid = document.getElementById('potionsGrid');
    const data = filteredData || allPotionsFlat;

    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = '<div class="text-center text-gray-500 py-10"><i class="fas fa-search text-4xl mb-3 block"></i>ไม่พบยาที่ค้นหา</div>';
        return;
    }

    // Sort by type then by number
    const sorted = [...data].sort((a, b) => {
        const typeOrder = { 'Combat': 1, 'Utility': 2, 'Whimsical': 3 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
            return typeOrder[a.type] - typeOrder[b.type];
        }
        return a.num - b.num;
    });

    sorted.forEach(potion => {
        const card = document.createElement('div');
        card.className = `potion-card bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden potion-type-${potion.type}`;

        const typeColor = {
            'Combat': 'text-red-400',
            'Utility': 'text-blue-400',
            'Whimsical': 'text-purple-400'
        };

        const rarityBadgeClass = {
            'common': 'bg-gray-600/30 text-gray-300',
            'uncommon': 'bg-green-600/30 text-green-300',
            'rare': 'bg-blue-600/30 text-blue-300'
        };

        card.innerHTML = `
            <div class="p-4">
                <div class="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xs px-2 py-0.5 rounded type-badge-${potion.type} font-medium">${potion.type}</span>
                        <span class="text-xs text-gray-500">ค่า Attribute สูงสุด: ${potion.num}</span>
                    </div>
                    <span class="text-xs px-2 py-0.5 rounded ${rarityBadgeClass[potion.rarity] || ''} font-medium capitalize">${potion.rarity}</span>
                </div>
                <h3 class="font-bold text-white text-lg mb-2">${potion.name}</h3>
                <p class="text-sm text-gray-400 leading-relaxed">${potion.desc}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterPotions() {
    const searchTerm = document.getElementById('potionSearch').value.toLowerCase();
    const typeFilter = document.getElementById('potionTypeFilter').value;
    const rarityFilter = document.getElementById('potionRarityFilter').value;

    let filtered = allPotionsFlat.filter(potion => {
        const matchesSearch = potion.name.toLowerCase().includes(searchTerm) || potion.desc.toLowerCase().includes(searchTerm);
        const matchesType = !typeFilter || potion.type === typeFilter;
        const matchesRarity = !rarityFilter || potion.rarity === rarityFilter;
        return matchesSearch && matchesType && matchesRarity;
    });

    renderPotionsGrid(filtered);
}

function updatePotionStats() {
    const total = allPotionsFlat.length;
    const combat = allPotionsFlat.filter(p => p.type === 'Combat').length;
    const utility = allPotionsFlat.filter(p => p.type === 'Utility').length;
    const whimsical = allPotionsFlat.filter(p => p.type === 'Whimsical').length;

    document.getElementById('totalPotionsCount').textContent = total;
    document.getElementById('combatPotionsCount').textContent = combat;
    document.getElementById('utilityPotionsCount').textContent = utility;
    document.getElementById('whimsicalPotionsCount').textContent = whimsical;
}

// --- Boons Grid ---
function renderBoonsGrid(filteredData = null) {
    const grid = document.getElementById('boonsGrid');
    const data = filteredData || BOONS_DB;

    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-search text-4xl mb-3 block"></i>ไม่พบ Boon ที่ค้นหา</div>';
        return;
    }

    // Sort by shards then by name
    const sorted = [...data].sort((a, b) => {
        const shardsA = parseInt(a.shards);
        const shardsB = parseInt(b.shards);
        if (shardsA !== shardsB) return shardsA - shardsB;
        return a.name.localeCompare(b.name);
    });

    sorted.forEach(boon => {
        const card = document.createElement('div');
        const shards = parseInt(boon.shards);

        // Color based on shards cost
        const shardColors = {
            5: { bg: 'border-green-500/40', badge: 'bg-green-500/20 text-green-400', icon: 'text-green-400' },
            10: { bg: 'border-amber-500/40', badge: 'bg-amber-500/20 text-amber-400', icon: 'text-amber-400' },
            15: { bg: 'border-red-500/40', badge: 'bg-red-500/20 text-red-400', icon: 'text-red-400' }
        };
        const colors = shardColors[shards] || shardColors[5];

        card.className = `bg-gray-900/50 p-4 rounded-xl border-2 ${colors.bg} hover:border-opacity-70 transition`;
        card.innerHTML = `
            <div class="flex flex-wrap justify-between items-start gap-2 mb-3">
                <h3 class="font-bold text-white text-lg">${boon.name}</h3>
                <span class="text-xs px-3 py-1 rounded-full ${colors.badge} font-semibold flex items-center gap-1">
                    <i class="fas fa-gem ${colors.icon}"></i> ${boon.shards} Shards
                </span>
            </div>
            <p class="text-sm text-gray-400 leading-relaxed">${boon.desc}</p>
        `;
        grid.appendChild(card);
    });
}

function filterBoons() {
    const searchTerm = document.getElementById('boonSearch').value.toLowerCase();
    const shardFilter = document.getElementById('boonShardFilter').value;

    let filtered = BOONS_DB.filter(boon => {
        const matchesSearch = boon.name.toLowerCase().includes(searchTerm) || boon.desc.toLowerCase().includes(searchTerm);
        const matchesShards = !shardFilter || boon.shards === shardFilter;
        return matchesSearch && matchesShards;
    });

    renderBoonsGrid(filtered);
}

function updateBoonStats() {
    const total = BOONS_DB.length;
    const shards5 = BOONS_DB.filter(b => b.shards === '5').length;
    const shards10 = BOONS_DB.filter(b => b.shards === '10').length;
    const shards15 = BOONS_DB.filter(b => b.shards === '15').length;

    document.getElementById('totalBoonsCount').textContent = total;
    document.getElementById('boons5Count').textContent = shards5;
    document.getElementById('boons10Count').textContent = shards10;
    document.getElementById('boons15Count').textContent = shards15;
}

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
                <div class="font-bold text-sm text-green-300"><i class="fas fa-leaf text-green-500 mr-1 text-xs"></i>${item.item_name}</div>
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
                <div class="font-bold text-sm text-yellow-300"><i class="fas fa-flask text-yellow-500 mr-1 text-xs"></i>${item.item_name}</div>
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

    // Sync crafting slots - remove excess ingredients that exceed new inventory
    syncCraftingSlotsWithInventory();

    renderInventory();
    updateSlotsUI();

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

// Sync crafting slots with inventory - remove items that exceed available quantity
function syncCraftingSlotsWithInventory() {
    const usageCount = {};

    // Count how many of each item is in crafting slots
    craftingSlots.forEach((item, index) => {
        if (item) {
            if (!usageCount[item.name]) usageCount[item.name] = [];
            usageCount[item.name].push(index);
        }
    });

    // Check against available inventory and remove excess
    for (const [itemName, slotIndices] of Object.entries(usageCount)) {
        const invItem = currentInventory.find(i => i.item_name === itemName);
        const availableQty = invItem ? invItem.quantity : 0;

        // If using more than available, remove excess from slots (LIFO - last added first removed)
        if (slotIndices.length > availableQty) {
            const excessCount = slotIndices.length - availableQty;
            // Remove from the end (latest slots first)
            for (let i = 0; i < excessCount; i++) {
                const slotToRemove = slotIndices[slotIndices.length - 1 - i];
                craftingSlots[slotToRemove] = null;
            }
        }
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
            el.innerHTML = `
                <div class="text-center">
                    <div class="text-xs font-bold text-white mb-1">${item.name}</div>
                    <div class="flex justify-center gap-2 text-[10px]">
                        <span class="text-red-400">C:${item.combat}</span>
                        <span class="text-blue-400">U:${item.utility}</span>
                        <span class="text-purple-400">W:${item.whimsy}</span>
                    </div>
                </div>
            `;
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

    // Update Progression Graph (single bar based on ingredient count)
    const progressPercent = (filledCount / 3) * 100;
    document.getElementById('progressBar').style.width = progressPercent + '%';
    document.getElementById('progressLabel').innerText = `${filledCount} / 3`;

    // Reset all stat box highlights
    const statBoxCombat = document.getElementById('statBoxCombat');
    const statBoxUtility = document.getElementById('statBoxUtility');
    const statBoxWhimsy = document.getElementById('statBoxWhimsy');

    const defaultBoxClasses = 'bg-gray-900/50 border-gray-700/30';
    const highlightCombat = 'bg-red-900/30 border-red-500/50 ring-2 ring-red-500/30';
    const highlightUtility = 'bg-blue-900/30 border-blue-500/50 ring-2 ring-blue-500/30';
    const highlightWhimsy = 'bg-purple-900/30 border-purple-500/50 ring-2 ring-purple-500/30';

    // Remove all highlights first
    statBoxCombat.className = 'bg-gray-900/50 rounded-xl p-3 border border-gray-700/30 transition-all';
    statBoxUtility.className = 'bg-gray-900/50 rounded-xl p-3 border border-gray-700/30 transition-all';
    statBoxWhimsy.className = 'bg-gray-900/50 rounded-xl p-3 border border-gray-700/30 transition-all';

    // Check for single highest value and highlight it
    const maxVal = Math.max(totalC, totalU, totalW);
    if (maxVal > 0) {
        const highCount = [totalC, totalU, totalW].filter(v => v === maxVal).length;
        if (highCount === 1) {
            // Only one highest - highlight it
            if (totalC === maxVal) {
                statBoxCombat.className = 'bg-red-900/30 rounded-xl p-3 border-2 border-red-500/50 ring-2 ring-red-500/30 transition-all';
            } else if (totalU === maxVal) {
                statBoxUtility.className = 'bg-blue-900/30 rounded-xl p-3 border-2 border-blue-500/50 ring-2 ring-blue-500/30 transition-all';
            } else if (totalW === maxVal) {
                statBoxWhimsy.className = 'bg-purple-900/30 rounded-xl p-3 border-2 border-purple-500/50 ring-2 ring-purple-500/30 transition-all';
            }
        }
    }

    if (filledCount === 3) {
        // Check for Tie
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

            // Set type badge styling and value
            const potionTypeEl = document.getElementById('potionType');
            const potionValueEl = document.getElementById('potionValue');

            const typeStyles = {
                'Combat': { bg: 'bg-red-600/30 text-red-300', icon: '<i class="fas fa-fist-raised mr-1"></i>' },
                'Utility': { bg: 'bg-blue-600/30 text-blue-300', icon: '<i class="fas fa-tools mr-1"></i>' },
                'Whimsical': { bg: 'bg-purple-600/30 text-purple-300', icon: '<i class="fas fa-hat-wizard mr-1"></i>' }
            };
            const style = typeStyles[selectedAttribute] || typeStyles['Combat'];

            potionTypeEl.className = `text-sm px-3 py-1 rounded-full ${style.bg} font-medium`;
            potionTypeEl.innerHTML = `${style.icon}${selectedAttribute}`;
            potionValueEl.innerText = `Attribute: ${maxVal}`;

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

// --- Searchable Dropdown ---
function initSearchableDropdown() {
    const input = document.getElementById('addItemInput');
    const hidden = document.getElementById('addItemSelect');
    const dropdown = document.getElementById('addItemDropdown');

    // Sort ingredients
    const sortedIngredients = [...INGREDIENTS_DB].sort((a, b) => a.name.localeCompare(b.name));

    function renderDropdownItems(filter = '') {
        dropdown.innerHTML = '';
        const filtered = sortedIngredients.filter(ing =>
            ing.name.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">ไม่พบวัตถุดิบ</div>';
            return;
        }

        filtered.forEach(ing => {
            const item = document.createElement('div');
            item.className = 'p-2.5 cursor-pointer hover:bg-green-600/20 text-sm text-gray-200 transition flex justify-between items-center border-b border-gray-800 last:border-b-0';
            item.innerHTML = `
                <span>${ing.name}</span>
                <span class="text-xs text-gray-500">
                    <span class="text-red-400">C:${ing.combat}</span>
                    <span class="text-blue-400 ml-1">U:${ing.utility}</span>
                    <span class="text-purple-400 ml-1">W:${ing.whimsy}</span>
                </span>
            `;
            item.addEventListener('click', () => {
                input.value = ing.name;
                hidden.value = ing.name;
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(item);
        });
    }

    // Show dropdown on focus
    input.addEventListener('focus', () => {
        renderDropdownItems(input.value);
        dropdown.classList.remove('hidden');
    });

    // Filter on input
    input.addEventListener('input', () => {
        hidden.value = ''; // Reset selected value when typing
        renderDropdownItems(input.value);
        dropdown.classList.remove('hidden');
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

// GM Tool
async function addManualItem() {
    const hidden = document.getElementById('addItemSelect');
    const input = document.getElementById('addItemInput');
    const itemName = hidden.value;
    if (!itemName || !selectedCharId) return;

    // Check local first to save bandwidth? or direct DB
    const { data: exist } = await supabase.from('character_inventories')
        .select('quantity').eq('character_id', selectedCharId).eq('item_name', itemName).eq('category', 'ingredient').single();

    if (exist) {
        await supabase.from('character_inventories').update({ quantity: exist.quantity + 1 }).eq('character_id', selectedCharId).eq('item_name', itemName);
    } else {
        await supabase.from('character_inventories').insert({ character_id: selectedCharId, item_name: itemName, quantity: 1, category: 'ingredient' });
    }

    // Reset searchable dropdown
    input.value = '';
    hidden.value = '';

    loadData();
}

// --- Admin Character Modal ---
let allCharactersAdmin = [];
let adminCharModalPage = 1;
const ADMIN_CHARS_PER_PAGE = 12;

async function checkAdminAndLoadAllCharacters() {
    const { data: isAdmin } = await supabase.rpc('is_admin');

    if (isAdmin) {
        // Show admin button
        document.getElementById('adminCharSelectWrapper').classList.remove('hidden');

        // Load all characters (simplified query)
        const { data: chars, error } = await supabase.from('characters')
            .select('id, name, user_id')
            .order('name');

        if (error) {
            console.error('Error loading characters:', error);
            return;
        }

        if (chars) {
            allCharactersAdmin = chars;
        }
    }
}

function openAdminCharModal() {
    adminCharModalPage = 1;
    document.getElementById('adminCharModalSearch').value = '';
    renderAdminCharModal();
    document.getElementById('adminCharModal').classList.remove('hidden');
}

function closeAdminCharModal() {
    document.getElementById('adminCharModal').classList.add('hidden');
}

function filterAdminCharModal() {
    adminCharModalPage = 1;
    renderAdminCharModal();
}

function renderAdminCharModal() {
    const searchVal = document.getElementById('adminCharModalSearch').value.toLowerCase();
    const grid = document.getElementById('adminCharModalGrid');
    const pagination = document.getElementById('adminCharModalPagination');
    const countEl = document.getElementById('adminCharModalCount');

    // Filter
    const filtered = allCharactersAdmin.filter(c =>
        c.name.toLowerCase().includes(searchVal)
    );

    // Pagination
    const totalPages = Math.ceil(filtered.length / ADMIN_CHARS_PER_PAGE);
    const start = (adminCharModalPage - 1) * ADMIN_CHARS_PER_PAGE;
    const pageData = filtered.slice(start, start + ADMIN_CHARS_PER_PAGE);

    // Update count
    countEl.innerText = filtered.length;

    // Render grid
    grid.innerHTML = '';
    if (pageData.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8"><i class="fas fa-search text-2xl mb-2"></i><p>ไม่พบตัวละคร</p></div>';
    } else {
        pageData.forEach(c => {
            const card = document.createElement('div');
            card.className = 'bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-700/50 hover:border-purple-500/50 cursor-pointer transition-all';
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-white text-sm truncate">${c.name}</div>
                    </div>
                </div>
            `;
            card.onclick = () => selectAdminChar(c);
            grid.appendChild(card);
        });
    }

    // Render pagination
    pagination.innerHTML = '';
    if (totalPages > 1) {
        // Prev
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.className = `px-3 py-1 rounded-lg text-sm ${adminCharModalPage === 1 ? 'text-gray-600 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-600'}`;
        prevBtn.disabled = adminCharModalPage === 1;
        prevBtn.onclick = () => { if (adminCharModalPage > 1) { adminCharModalPage--; renderAdminCharModal(); } };
        pagination.appendChild(prevBtn);

        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.className = 'px-3 py-1 text-sm text-gray-400';
        pageInfo.innerText = `${adminCharModalPage} / ${totalPages}`;
        pagination.appendChild(pageInfo);

        // Next
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.className = `px-3 py-1 rounded-lg text-sm ${adminCharModalPage === totalPages ? 'text-gray-600 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-600'}`;
        nextBtn.disabled = adminCharModalPage === totalPages;
        nextBtn.onclick = () => { if (adminCharModalPage < totalPages) { adminCharModalPage++; renderAdminCharModal(); } };
        pagination.appendChild(nextBtn);
    }
}

function selectAdminChar(char) {
    selectedCharId = char.id;
    selectedCharName = char.name;

    // Update button text
    document.getElementById('adminSelectedCharName').innerText = char.name;

    // Reset normal dropdown when using admin selection
    charSelect.selectedIndex = 0;

    closeAdminCharModal();
    loadData();
    resetSlots();
    logArea.classList.add('hidden');
}

// Logout function
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}