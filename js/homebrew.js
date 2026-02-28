// =====================================================
// Homebrew (DM) Manager — js/homebrew.js
// =====================================================

let isDM = false;
let currentUser = null;
let activeTab = 'status_effects';
let currentData = [];
let searchQuery = '';

// Tab configuration
const TAB_CONFIG = {
    status_effects: { table: 'hb_status_effects', catTable: 'hb_status_categories', title: 'Status Effects', icon: '⚡', hasCategory: true },
    races: { table: 'hb_races', title: 'Races', icon: '🧝' },
    classes: { table: 'hb_classes', title: 'Classes', icon: '⚔️' },
    items: { table: 'hb_items', title: 'Items', icon: '🎒', hasCategory: true },
    skills: { table: 'hb_skills', title: 'Skills', icon: '✨', hasCategory: true },
    recipes: { table: 'hb_recipes', title: 'Recipes', icon: '⚒️', hasCategory: true },
    bestiary: { table: 'hb_bestiary', title: 'Bestiary', icon: '🐉' },
    loot_tables: { table: 'hb_loot_tables', title: 'Loot Tables', icon: '🎲' },
    wiki: { table: 'hb_wiki', title: 'Wiki', icon: '📖' },
};

// CR to XP mapping (D&D 5e)
const CR_XP_MAP = {
    '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
    '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
    '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
    '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
    '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
    '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
    '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000
};

// =====================================================
// Init
// =====================================================
async function init() {
    if (typeof supabase === 'undefined') {
        alert('❌ ไม่พบ Supabase Client!');
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    currentUser = session.user;
    document.getElementById('userEmail').textContent = currentUser.email;

    // Check DM
    const { data } = await supabase.rpc('is_dm');
    isDM = !!data;
    if (isDM) {
        document.querySelectorAll('.dm-only').forEach(el => el.style.display = '');
    }

    switchTab('status_effects');
}

// =====================================================
// Tab Switching
// =====================================================
function switchTab(tab) {
    activeTab = tab;
    searchQuery = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('bg-purple-600/20', 'text-purple-200', 'border-purple-500/40');
        el.classList.add('text-gray-400', 'border-transparent');
    });
    const activeEl = document.getElementById(`tab-${tab}`);
    if (activeEl) {
        activeEl.classList.add('bg-purple-600/20', 'text-purple-200', 'border-purple-500/40');
        activeEl.classList.remove('text-gray-400', 'border-transparent');
    }

    // Update header
    const cfg = TAB_CONFIG[tab];
    document.getElementById('pageTitle').innerHTML = `<span>${cfg.icon}</span> ${cfg.title}`;

    // Show/hide create button
    const createBtn = document.getElementById('createBtn');
    if (createBtn) {
        createBtn.style.display = isDM ? 'flex' : 'none';
        createBtn.onclick = () => openFormModal(null);
    }

    loadData();
}

// =====================================================
// Data Loading
// =====================================================
async function loadData() {
    const cfg = TAB_CONFIG[activeTab];
    const contentEl = document.getElementById('mainContent');
    contentEl.innerHTML = `<div class="flex items-center justify-center py-20"><div class="w-10 h-10 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin"></div></div>`;

    try {
        if (activeTab === 'status_effects') {
            await loadStatusEffects();
        } else if (activeTab === 'loot_tables') {
            await loadLootTables();
        } else if (activeTab === 'wiki') {
            await loadWiki();
        } else {
            // Generic card-based load
            let query = supabase.from(cfg.table).select('*').order('created_at', { ascending: false });
            const { data, error } = await query;
            if (error) throw error;
            currentData = data || [];
            renderCards();
        }
    } catch (err) {
        contentEl.innerHTML = `<div class="text-center py-20 text-red-400">❌ โหลดข้อมูลไม่สำเร็จ: ${err.message}</div>`;
    }
}

// =====================================================
// Status Effects (grouped by category)
// =====================================================
async function loadStatusEffects() {
    const [cats, effects] = await Promise.all([
        supabase.from('hb_status_categories').select('*').order('sort_order'),
        supabase.from('hb_status_effects').select('*').order('name')
    ]);
    if (cats.error) throw cats.error;
    if (effects.error) throw effects.error;

    const categories = cats.data || [];
    const allEffects = effects.data || [];
    currentData = allEffects;

    renderStatusEffects(categories, allEffects);
}

function renderStatusEffects(categories, allEffects) {
    const contentEl = document.getElementById('mainContent');
    const q = searchQuery.toLowerCase();

    // Filter
    const filtered = q ? allEffects.filter(e =>
        e.name.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q)
    ) : allEffects;

    let html = '';

    // DM: Add category button
    if (isDM) {
        html += `<div class="mb-6 flex gap-2">
            <button onclick="openCategoryModal(null)" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm border border-gray-700 transition flex items-center gap-2">
                <span>📁</span> เพิ่มหมวดหมู่
            </button>
        </div>`;
    }

    if (categories.length === 0 && filtered.length === 0) {
        html += `<div class="text-center py-16 text-gray-500"><p class="text-4xl mb-2">⚡</p><p>ยังไม่มี Status Effects</p></div>`;
        contentEl.innerHTML = html;
        return;
    }

    categories.forEach(cat => {
        const catEffects = filtered.filter(e => e.category_id === cat.id);
        html += `
        <div class="mb-6">
            <div class="flex items-center justify-between mb-3 px-1">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-bold text-white">${cat.name}</h3>
                    <span class="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">${catEffects.length}</span>
                </div>
                ${isDM ? `<div class="flex gap-1">
                    <button onclick="openCategoryModal('${cat.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 hover:scale-110 transition-all duration-200" title="แก้ไขหมวด">✏️</button>
                    <button onclick="deleteCategory('${cat.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:scale-110 transition-all duration-200" title="ลบหมวด">🗑️</button>
                </div>` : ''}
            </div>
            <div class="glass-panel rounded-xl overflow-hidden">
                ${catEffects.length === 0 ?
                `<p class="text-gray-600 text-sm p-4">ไม่มีสถานะในหมวดนี้</p>` :
                `<div class="divide-y divide-gray-800">${catEffects.map(e => renderStatusRow(e)).join('')}</div>`
            }
            </div>
        </div>`;
    });

    // Uncategorized
    const uncategorized = filtered.filter(e => !e.category_id);
    if (uncategorized.length > 0) {
        html += `<div class="mb-6">
            <div class="flex items-center gap-2 mb-3 px-1">
                <h3 class="text-lg font-bold text-gray-400">ไม่มีหมวด</h3>
                <span class="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">${uncategorized.length}</span>
            </div>
            <div class="glass-panel rounded-xl overflow-hidden">
                <div class="divide-y divide-gray-800">${uncategorized.map(e => renderStatusRow(e)).join('')}</div>
            </div>
        </div>`;
    }

    contentEl.innerHTML = html;
}

function renderStatusRow(e) {
    const typeBadge = e.type === 'Buff'
        ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">BUFF</span>`
        : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">DEBUFF</span>`;

    return `<div class="flex items-center justify-between p-4 hover:bg-white/5 transition group">
        <div class="flex items-center gap-3 min-w-0 flex-1">
            ${typeBadge}
            <div class="min-w-0">
                <p class="font-semibold text-white text-sm truncate">${e.name}</p>
                <p class="text-xs text-gray-500 truncate">${e.description || '-'}</p>
            </div>
        </div>
        ${isDM ? `<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2">
            <button onclick="openFormModal('${e.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 hover:scale-110 transition-all duration-200 text-sm">✏️</button>
            <button onclick="deleteItem('${e.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:scale-110 transition-all duration-200 text-sm">🗑️</button>
        </div>` : ''}
    </div>`;
}

// =====================================================
// Loot Tables
// =====================================================
async function loadLootTables() {
    const [tables, items] = await Promise.all([
        supabase.from('hb_loot_tables').select('*').order('created_at', { ascending: false }),
        supabase.from('hb_loot_items').select('*').order('sort_order')
    ]);
    if (tables.error) throw tables.error;
    if (items.error) throw items.error;

    currentData = tables.data || [];
    const allItems = items.data || [];
    renderLootTables(currentData, allItems);
}

function renderLootTables(tables, allItems) {
    const contentEl = document.getElementById('mainContent');
    const q = searchQuery.toLowerCase();
    const filtered = q ? tables.filter(t => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) : tables;

    if (filtered.length === 0) {
        contentEl.innerHTML = `<div class="text-center py-16 text-gray-500"><p class="text-4xl mb-2">🎲</p><p>ยังไม่มี Loot Tables</p></div>`;
        return;
    }

    let html = '<div class="space-y-4">';
    filtered.forEach(t => {
        const items = allItems.filter(i => i.loot_table_id === t.id);
        html += `
        <div class="glass-panel rounded-xl overflow-hidden">
            <div class="flex items-center justify-between p-4 border-b border-gray-800">
                <div>
                    <h3 class="font-bold text-white">${t.name}</h3>
                    ${t.description ? `<div class="text-xs text-gray-400 mt-1 prose prose-invert prose-sm max-w-none">${typeof marked !== 'undefined' ? marked.parse(t.description) : t.description}</div>` : ''}
                </div>
                ${isDM ? `<div class="flex gap-1 shrink-0 ml-2">
                    <button onclick="openLootDetail('${t.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 hover:scale-110 transition-all duration-200">✏️</button>
                    <button onclick="deleteItem('${t.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:scale-110 transition-all duration-200">🗑️</button>
                </div>` : ''}
            </div>
            <div class="overflow-x-auto">
                ${items.length > 0 ? `
                <table class="w-full text-sm">
                    <thead><tr class="bg-gray-800/50 text-gray-400 text-xs uppercase">
                        <th class="text-left px-4 py-2">ไอเทม</th>
                        <th class="text-left px-4 py-2">จำนวน</th>
                        <th class="text-right px-4 py-2">Drop Rate</th>
                    </tr></thead>
                    <tbody class="divide-y divide-gray-800/50">${items.map(i => `
                        <tr class="hover:bg-white/5 transition">
                            <td class="px-4 py-2 text-white">${i.item_name}</td>
                            <td class="px-4 py-2 text-gray-400">${i.quantity || '1'}</td>
                            <td class="px-4 py-2 text-right"><span class="text-amber-400 font-mono">${i.drop_rate}%</span></td>
                        </tr>`).join('')}
                    </tbody>
                </table>` : `<p class="text-gray-600 text-sm p-4">ยังไม่มีไอเทมในตาราง</p>`}
            </div>
        </div>`;
    });
    html += '</div>';
    contentEl.innerHTML = html;
}

// =====================================================
// Wiki
// =====================================================
async function loadWiki() {
    const { data, error } = await supabase.from('hb_wiki').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    currentData = data || [];
    renderWiki();
}

function renderWiki() {
    const contentEl = document.getElementById('mainContent');
    const q = searchQuery.toLowerCase();
    const filtered = q ? currentData.filter(w => w.title.toLowerCase().includes(q) || (w.content || '').toLowerCase().includes(q)) : currentData;

    if (filtered.length === 0) {
        contentEl.innerHTML = `<div class="text-center py-16 text-gray-500"><p class="text-4xl mb-2">📖</p><p>ยังไม่มี Wiki Pages</p></div>`;
        return;
    }

    let html = '<div class="space-y-4">';
    filtered.forEach(w => {
        const date = new Date(w.updated_at || w.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        const preview = (w.content || '').substring(0, 120).replace(/[#*_`]/g, '') + '...';
        html += `
        <div onclick="openWikiDetail('${w.id}')" class="glass-panel rounded-xl p-5 cursor-pointer hover:bg-white/5 transition group hover:border-purple-500/30">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <h3 class="font-bold text-white group-hover:text-purple-200 transition truncate">${w.title}</h3>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">${preview}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded">${date}</span>
                    ${isDM ? `<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onclick="event.stopPropagation(); openFormModal('${w.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 hover:scale-110 transition-all duration-200">✏️</button>
                        <button onclick="event.stopPropagation(); deleteItem('${w.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:scale-110 transition-all duration-200">🗑️</button>
                    </div>` : ''}
                </div>
            </div>
        </div>`;
    });
    html += '</div>';
    contentEl.innerHTML = html;
}

function openWikiDetail(id) {
    const item = currentData.find(w => w.id === id);
    if (!item) return;

    const modal = document.getElementById('detailModal');
    document.getElementById('detailTitle').textContent = item.title;

    // Render markdown
    let rendered = item.content || '';
    if (typeof marked !== 'undefined') {
        rendered = marked.parse(rendered);
    } else {
        rendered = `<pre class="whitespace-pre-wrap">${rendered}</pre>`;
    }
    document.getElementById('detailBody').innerHTML = `<div class="prose prose-invert prose-sm max-w-none">${rendered}</div>`;
    document.getElementById('detailActions').innerHTML = isDM ? `
        <button onclick="closeDetailModal(); openFormModal('${item.id}')" class="px-4 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg transition text-sm">✏️ แก้ไข</button>
        <button onclick="closeDetailModal(); deleteItem('${item.id}')" class="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition text-sm">🗑️ ลบ</button>
    ` : '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// =====================================================
// Generic Card Rendering (Races, Classes, Items, Skills, Recipes, Bestiary)
// =====================================================
function renderCards() {
    const contentEl = document.getElementById('mainContent');
    const q = searchQuery.toLowerCase();
    let filtered = currentData;

    if (q) {
        filtered = currentData.filter(item =>
            item.name.toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q) ||
            (item.category || '').toLowerCase().includes(q) ||
            (item.monster_type || '').toLowerCase().includes(q)
        );
    }

    if (filtered.length === 0) {
        const cfg = TAB_CONFIG[activeTab];
        contentEl.innerHTML = `<div class="text-center py-16 text-gray-500"><p class="text-4xl mb-2">${cfg.icon}</p><p>ยังไม่มีข้อมูล${cfg.title}</p></div>`;
        return;
    }

    let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">';
    filtered.forEach(item => {
        html += renderCard(item);
    });
    html += '</div>';
    contentEl.innerHTML = html;
}

function renderCard(item) {
    const hasImage = item.image_url && item.image_url.trim();
    const badges = getBadges(item);
    const cfg = TAB_CONFIG[activeTab];

    // Gradient colors per tab for imageless cards
    const gradientMap = {
        races: 'from-emerald-900/40 via-emerald-800/20 to-transparent',
        classes: 'from-rose-900/40 via-rose-800/20 to-transparent',
        items: 'from-indigo-900/40 via-indigo-800/20 to-transparent',
        skills: 'from-cyan-900/40 via-cyan-800/20 to-transparent',
        recipes: 'from-amber-900/40 via-amber-800/20 to-transparent',
        bestiary: 'from-red-900/40 via-red-800/20 to-transparent',
    };
    const gradient = gradientMap[activeTab] || 'from-purple-900/40 via-purple-800/20 to-transparent';

    return `
    <div onclick="openDetailModal('${item.id}')" class="glass-panel rounded-xl overflow-hidden cursor-pointer group hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col">
        ${hasImage ? `<div class="aspect-[16/9] bg-gray-800 overflow-hidden">
            <img src="${item.image_url}" alt="${item.name}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-full text-gray-600 text-3xl\\'>${cfg.icon}</div>'">
        </div>` : `<div class="h-24 bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden">
            <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 16px 16px;"></div>
            <span class="text-4xl opacity-50 group-hover:scale-110 group-hover:opacity-70 transition-all duration-300">${cfg.icon}</span>
        </div>`}
        <div class="p-4 flex-1 flex flex-col">
            <h3 class="font-bold text-white group-hover:text-purple-200 transition truncate">${item.name}</h3>
            <p class="text-xs text-gray-500 mt-1 line-clamp-2 flex-1">${item.description || ''}</p>
            ${badges ? `<div class="flex flex-wrap gap-1.5 mt-3">${badges}</div>` : ''}
        </div>
        ${isDM ? `<div class="px-4 pb-3 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
            <button onclick="event.stopPropagation(); openFormModal('${item.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 hover:scale-110 transition-all duration-200 text-sm" title="แก้ไข">✏️</button>
            <button onclick="event.stopPropagation(); deleteItem('${item.id}')" class="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:scale-110 transition-all duration-200 text-sm" title="ลบ">🗑️</button>
        </div>` : ''}
    </div>`;
}

function getBadges(item) {
    let badges = '';
    if (activeTab === 'items' && item.category) {
        badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${item.category}</span>`;
    }
    if (activeTab === 'skills' && item.category) {
        badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">${item.category}</span>`;
    }
    if (activeTab === 'recipes' && item.category) {
        badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">${item.category}</span>`;
    }
    if (activeTab === 'bestiary') {
        if (item.monster_type) badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">${item.monster_type}</span>`;
        if (item.challenge_rating) {
            const xp = CR_XP_MAP[item.challenge_rating];
            badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">CR ${item.challenge_rating}</span>`;
            if (xp !== undefined) badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">${xp.toLocaleString()} XP</span>`;
        }
    }
    return badges;
}

// =====================================================
// Detail Modal
// =====================================================
function openDetailModal(id) {
    const item = currentData.find(d => d.id === id);
    if (!item) return;

    const modal = document.getElementById('detailModal');
    document.getElementById('detailTitle').textContent = item.name;

    let body = '';

    // Image at top
    if (item.image_url && item.image_url.trim()) {
        body += `<div class="bg-gray-800 rounded-xl overflow-hidden mb-4 flex items-center justify-center" style="max-height: 400px;">
            <img src="${item.image_url}" alt="${item.name}" class="max-w-full max-h-[400px] object-contain">
        </div>`;
    }

    // Badges
    const badges = getBadges(item);
    if (badges) body += `<div class="flex flex-wrap gap-2 mb-4">${badges}</div>`;

    // Description
    if (item.description) body += `<p class="text-gray-300 mb-4">${item.description}</p>`;

    // Bestiary stats
    if (activeTab === 'bestiary' && item.stats && Object.keys(item.stats).length > 0) {
        body += `<div class="mb-4"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Attributes</h4>
            <div class="grid grid-cols-2 gap-2">${Object.entries(item.stats).map(([k, v]) =>
            `<div class="flex justify-between bg-gray-800/50 px-3 py-1.5 rounded-lg"><span class="text-gray-400 text-sm">${k}</span><span class="text-white font-bold text-sm">${v}</span></div>`
        ).join('')}</div></div>`;
    }

    // Recipe data
    if (activeTab === 'recipes' && item.recipe_data) {
        body += `<div class="mb-4"><h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">สูตรคราฟต์</h4>
            <div class="bg-gray-800/50 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap">${item.recipe_data}</div></div>`;
    }

    // Content (markdown)
    if (item.content) {
        let rendered = item.content;
        if (typeof marked !== 'undefined') {
            rendered = marked.parse(rendered);
        } else {
            rendered = `<pre class="whitespace-pre-wrap">${rendered}</pre>`;
        }
        body += `<div class="prose prose-invert prose-sm max-w-none">${rendered}</div>`;
    }

    document.getElementById('detailBody').innerHTML = body;
    document.getElementById('detailActions').innerHTML = isDM ? `
        <button onclick="closeDetailModal(); openFormModal('${item.id}')" class="px-4 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg transition text-sm">✏️ แก้ไข</button>
        <button onclick="closeDetailModal(); deleteItem('${item.id}')" class="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition text-sm">🗑️ ลบ</button>
    ` : '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// =====================================================
// Create / Edit Form Modal
// =====================================================
async function openFormModal(editId) {
    if (!isDM) return;
    const cfg = TAB_CONFIG[activeTab];
    const modal = document.getElementById('formModal');
    const title = document.getElementById('formTitle');
    const body = document.getElementById('formBody');

    const isEdit = !!editId;
    let item = null;
    if (isEdit) {
        item = currentData.find(d => d.id === editId);
    }

    title.textContent = isEdit ? `แก้ไข ${cfg.title}` : `เพิ่ม ${cfg.title} ใหม่`;

    let formHtml = '';

    if (activeTab === 'status_effects') {
        // Load categories for dropdown
        const { data: cats } = await supabase.from('hb_status_categories').select('*').order('sort_order');
        const catOptions = (cats || []).map(c => `<option value="${c.id}" ${item && item.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('');

        formHtml = `
            <div class="space-y-4">
                <div><label class="block text-xs text-gray-500 mb-1">ชื่อสถานะ</label>
                    <input id="f_name" value="${item ? item.name : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อ Status Effect"></div>
                <div><label class="block text-xs text-gray-500 mb-1">คำอธิบาย</label>
                    <textarea id="f_description" rows="3" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-none" placeholder="คำอธิบายสถานะ">${item ? item.description || '' : ''}</textarea></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-xs text-gray-500 mb-1">ประเภท</label>
                        <select id="f_type" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition">
                            <option value="Debuff" ${item && item.type === 'Debuff' ? 'selected' : ''}>Debuff</option>
                            <option value="Buff" ${item && item.type === 'Buff' ? 'selected' : ''}>Buff</option>
                        </select></div>
                    <div><label class="block text-xs text-gray-500 mb-1">หมวดหมู่</label>
                        <select id="f_category_id" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition">
                            <option value="">-- ไม่มีหมวด --</option>${catOptions}
                        </select></div>
                </div>
            </div>`;
    } else if (activeTab === 'wiki') {
        // Widen modal for wiki editor
        document.querySelector('#formModal > div').classList.remove('max-w-xl');
        document.querySelector('#formModal > div').classList.add('max-w-5xl');

        formHtml = `
            <div class="space-y-4">
                <div><label class="block text-xs text-gray-500 mb-1">หัวข้อ</label>
                    <input id="f_title" value="${item ? item.title : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อหัวข้อ Wiki"></div>

                <!-- Markdown Toolbar -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex gap-1">
                            <button type="button" id="wikiTabWrite" onclick="wikiSwitchTab('write')" class="px-3 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white transition">✏️ เขียน</button>
                            <button type="button" id="wikiTabPreview" onclick="wikiSwitchTab('preview')" class="px-3 py-1 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white transition">👁️ Preview</button>
                        </div>
                        <span class="text-[10px] text-gray-600">รองรับ Markdown</span>
                    </div>

                    <!-- Toolbar -->
                    <div id="wikiToolbar" class="flex flex-wrap gap-1 mb-2 p-2 bg-gray-800/60 rounded-xl border border-gray-700/50">
                        <button type="button" onclick="wikiInsert('heading1')" class="wiki-tb-btn" title="Heading 1"><b>H1</b></button>
                        <button type="button" onclick="wikiInsert('heading2')" class="wiki-tb-btn" title="Heading 2"><b>H2</b></button>
                        <button type="button" onclick="wikiInsert('heading3')" class="wiki-tb-btn" title="Heading 3"><b>H3</b></button>
                        <div class="w-px h-6 bg-gray-700 mx-1"></div>
                        <button type="button" onclick="wikiInsert('bold')" class="wiki-tb-btn" title="Bold"><b>B</b></button>
                        <button type="button" onclick="wikiInsert('italic')" class="wiki-tb-btn" title="Italic"><i>I</i></button>
                        <button type="button" onclick="wikiInsert('strikethrough')" class="wiki-tb-btn" title="Strikethrough"><s>S</s></button>
                        <div class="w-px h-6 bg-gray-700 mx-1"></div>
                        <button type="button" onclick="wikiInsert('link')" class="wiki-tb-btn" title="Link">🔗</button>
                        <button type="button" onclick="wikiInsert('image')" class="wiki-tb-btn" title="Image">🖼️</button>
                        <div class="w-px h-6 bg-gray-700 mx-1"></div>
                        <button type="button" onclick="wikiInsert('ul')" class="wiki-tb-btn" title="Bulleted List">• List</button>
                        <button type="button" onclick="wikiInsert('ol')" class="wiki-tb-btn" title="Numbered List">1. List</button>
                        <button type="button" onclick="wikiInsert('quote')" class="wiki-tb-btn" title="Quote">❝ Quote</button>
                        <div class="w-px h-6 bg-gray-700 mx-1"></div>
                        <button type="button" onclick="wikiInsert('code')" class="wiki-tb-btn" title="Code Block">⌨️ Code</button>
                        <button type="button" onclick="wikiInsert('table')" class="wiki-tb-btn" title="Table">📊 Table</button>
                        <button type="button" onclick="wikiInsert('hr')" class="wiki-tb-btn" title="Horizontal Rule">— HR</button>
                    </div>

                    <!-- Split Pane -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3" id="wikiEditorContainer">
                        <!-- Write Pane -->
                        <div id="wikiWritePane">
                            <textarea id="f_content" oninput="wikiUpdatePreview()" class="w-full h-[450px] px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-none font-mono text-sm leading-relaxed" placeholder="# หัวข้อ\n\nเขียนเนื้อหาด้วย Markdown...">${item ? item.content || '' : ''}</textarea>
                        </div>
                        <!-- Preview Pane -->
                        <div id="wikiPreviewPane">
                            <div id="wikiPreview" class="h-[450px] overflow-y-auto px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 prose prose-invert prose-sm max-w-none">
                                <p class="text-gray-500 italic">เริ่มพิมพ์เพื่อดู Preview...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        // Need to set up preview after render
        setTimeout(() => wikiUpdatePreview(), 50);
    } else if (activeTab === 'loot_tables') {
        formHtml = `
            <div class="space-y-4">
                <div><label class="block text-xs text-gray-500 mb-1">ชื่อตาราง</label>
                    <input id="f_name" value="${item ? item.name : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อ Loot Table"></div>
                <div><label class="block text-xs text-gray-500 mb-1">คำอธิบาย (รองรับ Markdown)</label>
                    <textarea id="f_description" rows="6" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-y font-mono text-sm" placeholder="คำอธิบาย...">${item ? item.description || '' : ''}</textarea></div>
            </div>`;
    } else if (activeTab === 'bestiary') {
        const stats = item && item.stats ? item.stats : {};
        formHtml = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-xs text-gray-500 mb-1">ชื่อมอนสเตอร์</label>
                        <input id="f_name" value="${item ? item.name : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อ"></div>
                    <div><label class="block text-xs text-gray-500 mb-1">ประเภท</label>
                        <input id="f_monster_type" value="${item ? item.monster_type || '' : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="Beast, Dragon, Undead..."></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-xs text-gray-500 mb-1">Challenge Rating</label>
                        <select id="f_challenge_rating" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition">
                            <option value="">-- เลือก CR --</option>
                            ${Object.entries(CR_XP_MAP).map(([cr, xp]) =>
            `<option value="${cr}" ${item && item.challenge_rating === cr ? 'selected' : ''}>CR ${cr} (${xp.toLocaleString()} XP)</option>`
        ).join('')}
                        </select></div>
                    <div><label class="block text-xs text-gray-500 mb-1">URL รูปภาพ</label>
                        <input id="f_image_url" value="${item ? item.image_url || '' : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="https://..."></div>
                </div>
                <div><label class="block text-xs text-gray-500 mb-1">คำอธิบาย</label>
                    <textarea id="f_description" rows="2" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-none" placeholder="คำอธิบายสั้นๆ">${item ? item.description || '' : ''}</textarea></div>
                <div>
                    <label class="block text-xs text-gray-500 mb-2">Ability Scores</label>
                    <div class="grid grid-cols-6 gap-2">
                        ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => `
                        <div class="text-center">
                            <div class="text-[10px] font-bold uppercase tracking-wider mb-1 ${stat === 'STR' ? 'text-red-400' :
                stat === 'DEX' ? 'text-green-400' :
                    stat === 'CON' ? 'text-amber-400' :
                        stat === 'INT' ? 'text-blue-400' :
                            stat === 'WIS' ? 'text-purple-400' : 'text-pink-400'
            }">${stat}</div>
                            <input id="f_stat_${stat}" type="number" min="1" max="30" value="${stats[stat] || 10}"
                                class="w-full text-center px-1 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition font-bold text-lg">
                        </div>`).join('')}
                    </div>
                </div>
                <div><label class="block text-xs text-gray-500 mb-1">เนื้อหา (รองรับ Markdown)</label>
                    <textarea id="f_content" rows="6" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-y font-mono text-sm" placeholder="รายละเอียดเพิ่มเติม...">${item ? item.content || '' : ''}</textarea></div>
            </div>`;
    } else if (activeTab === 'recipes') {
        formHtml = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-xs text-gray-500 mb-1">ชื่อ</label>
                        <input id="f_name" value="${item ? item.name : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อสูตร"></div>
                    <div><label class="block text-xs text-gray-500 mb-1">หมวด</label>
                        <input id="f_category" value="${item ? item.category || '' : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="Potion, Weapon..."></div>
                </div>
                <div><label class="block text-xs text-gray-500 mb-1">คำอธิบาย</label>
                    <textarea id="f_description" rows="2" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-none" placeholder="คำอธิบาย">${item ? item.description || '' : ''}</textarea></div>
                <div><label class="block text-xs text-gray-500 mb-1">สูตรคราฟต์</label>
                    <textarea id="f_recipe_data" rows="4" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-y font-mono text-sm" placeholder="วัสดุ: ...">${item ? item.recipe_data || '' : ''}</textarea></div>
                <div><label class="block text-xs text-gray-500 mb-1">URL รูปภาพ</label>
                    <input id="f_image_url" value="${item ? item.image_url || '' : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="https://..."></div>
                <div><label class="block text-xs text-gray-500 mb-1">เนื้อหา (รองรับ Markdown)</label>
                    <textarea id="f_content" rows="6" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-y font-mono text-sm" placeholder="รายละเอียดเพิ่มเติม...">${item ? item.content || '' : ''}</textarea></div>
            </div>`;
    } else {
        // Generic: Races, Classes, Items, Skills
        const hasCategory = activeTab === 'items' || activeTab === 'skills';
        const hasImage = activeTab !== 'skills';
        formHtml = `
            <div class="space-y-4">
                <div class="${hasCategory ? 'grid grid-cols-2 gap-4' : ''}">
                    <div><label class="block text-xs text-gray-500 mb-1">ชื่อ</label>
                        <input id="f_name" value="${item ? item.name : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อ"></div>
                    ${hasCategory ? `<div><label class="block text-xs text-gray-500 mb-1">หมวด</label>
                        <input id="f_category" value="${item ? item.category || '' : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="หมวดหมู่"></div>` : ''}
                </div>
                <div><label class="block text-xs text-gray-500 mb-1">คำอธิบาย</label>
                    <textarea id="f_description" rows="2" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-none" placeholder="คำอธิบายสั้นๆ">${item ? item.description || '' : ''}</textarea></div>
                ${hasImage ? `<div><label class="block text-xs text-gray-500 mb-1">URL รูปภาพ</label>
                    <input id="f_image_url" value="${item ? item.image_url || '' : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="https://..."></div>` : ''}
                <div><label class="block text-xs text-gray-500 mb-1">เนื้อหา (รองรับ Markdown)</label>
                    <textarea id="f_content" rows="6" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-y font-mono text-sm" placeholder="รายละเอียดเพิ่มเติม...">${item ? item.content || '' : ''}</textarea></div>
            </div>`;
    }

    // For non-wiki tabs, wrap form in split layout with preview
    if (activeTab !== 'wiki') {
        // Widen modal
        document.querySelector('#formModal > div').classList.remove('max-w-xl');
        document.querySelector('#formModal > div').classList.add('max-w-5xl');

        body.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div id="formFieldsPane">${formHtml}</div>
                <div id="formPreviewPane">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">👁️ Preview</span>
                        <div class="flex-1 h-px bg-gray-800"></div>
                    </div>
                    <div id="formPreview" class="glass-panel rounded-xl overflow-hidden min-h-[200px]">
                        <div class="flex items-center justify-center py-16 text-gray-600">
                            <p class="text-sm">กรอกข้อมูลเพื่อดู Preview</p>
                        </div>
                    </div>
                </div>
            </div>`;

        // Attach input listeners for live preview
        setTimeout(() => {
            const pane = document.getElementById('formFieldsPane');
            if (pane) {
                pane.querySelectorAll('input, textarea, select').forEach(el => {
                    el.addEventListener('input', updateFormPreview);
                    el.addEventListener('change', updateFormPreview);
                });
            }
            updateFormPreview();
        }, 50);
    } else {
        body.innerHTML = formHtml;
    }

    document.getElementById('formSaveBtn').onclick = () => saveForm(editId);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeFormModal() {
    const modal = document.getElementById('formModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    // Reset modal width (wiki makes it wider)
    const inner = document.querySelector('#formModal > div');
    inner.classList.remove('max-w-5xl');
    inner.classList.add('max-w-xl');
}

// =====================================================
// Save Form
// =====================================================
async function saveForm(editId) {
    const cfg = TAB_CONFIG[activeTab];
    const isEdit = !!editId;
    let payload = {};

    if (activeTab === 'status_effects') {
        payload = {
            name: document.getElementById('f_name').value.trim(),
            description: document.getElementById('f_description').value.trim(),
            type: document.getElementById('f_type').value,
            category_id: document.getElementById('f_category_id').value || null,
        };
        if (!payload.name) return alert('กรุณาระบุชื่อ');
    } else if (activeTab === 'wiki') {
        payload = {
            title: document.getElementById('f_title').value.trim(),
            content: document.getElementById('f_content').value,
            updated_at: new Date().toISOString(),
        };
        if (!payload.title) return alert('กรุณาระบุหัวข้อ');
    } else if (activeTab === 'loot_tables') {
        payload = {
            name: document.getElementById('f_name').value.trim(),
            description: document.getElementById('f_description').value.trim(),
        };
        if (!payload.name) return alert('กรุณาระบุชื่อ');
    } else if (activeTab === 'bestiary') {
        const stats = {};
        ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(s => {
            const val = parseInt(document.getElementById('f_stat_' + s).value);
            if (!isNaN(val)) stats[s] = val;
        });
        payload = {
            name: document.getElementById('f_name').value.trim(),
            description: document.getElementById('f_description').value.trim(),
            content: document.getElementById('f_content').value,
            monster_type: document.getElementById('f_monster_type').value.trim(),
            challenge_rating: document.getElementById('f_challenge_rating').value.trim(),
            stats: stats,
            image_url: document.getElementById('f_image_url').value.trim(),
        };
        if (!payload.name) return alert('กรุณาระบุชื่อ');
    } else if (activeTab === 'recipes') {
        payload = {
            name: document.getElementById('f_name').value.trim(),
            description: document.getElementById('f_description').value.trim(),
            content: document.getElementById('f_content').value,
            category: document.getElementById('f_category').value.trim(),
            recipe_data: document.getElementById('f_recipe_data').value,
            image_url: document.getElementById('f_image_url').value.trim(),
        };
        if (!payload.name) return alert('กรุณาระบุชื่อ');
    } else {
        // Generic: races, classes, items, skills
        payload = {
            name: document.getElementById('f_name').value.trim(),
            description: document.getElementById('f_description').value.trim(),
            content: document.getElementById('f_content').value,
        };
        const catEl = document.getElementById('f_category');
        if (catEl) payload.category = catEl.value.trim();
        const imgEl = document.getElementById('f_image_url');
        if (imgEl) payload.image_url = imgEl.value.trim();
        if (!payload.name) return alert('กรุณาระบุชื่อ');
    }

    // Save button state
    const btn = document.getElementById('formSaveBtn');
    const origText = btn.textContent;
    btn.textContent = 'กำลังบันทึก...';
    btn.disabled = true;

    try {
        if (isEdit) {
            const { error } = await supabase.from(cfg.table).update(payload).eq('id', editId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from(cfg.table).insert(payload);
            if (error) throw error;
        }
        closeFormModal();
        loadData();
    } catch (err) {
        alert('❌ บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
        btn.textContent = origText;
        btn.disabled = false;
    }
}

// =====================================================
// Delete
// =====================================================
async function deleteItem(id) {
    if (!isDM) return;
    if (!confirm('⚠️ คุณแน่ใจหรือไม่ที่จะลบรายการนี้?\nการกระทำนี้ไม่สามารถกู้คืนได้')) return;

    const cfg = TAB_CONFIG[activeTab];
    try {
        const { error } = await supabase.from(cfg.table).delete().eq('id', id);
        if (error) throw error;
        loadData();
    } catch (err) {
        alert('❌ ลบไม่สำเร็จ: ' + err.message);
    }
}

// =====================================================
// Status Category CRUD
// =====================================================
function openCategoryModal(editId) {
    if (!isDM) return;
    const modal = document.getElementById('formModal');
    const title = document.getElementById('formTitle');
    const body = document.getElementById('formBody');

    let catData = null;
    if (editId) {
        // Need to fetch category
    }

    title.textContent = editId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่';
    body.innerHTML = `
        <div class="space-y-4">
            <div><label class="block text-xs text-gray-500 mb-1">ชื่อหมวดหมู่</label>
                <input id="f_cat_name" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อหมวด"></div>
            <div><label class="block text-xs text-gray-500 mb-1">ลำดับ (Sort)</label>
                <input id="f_cat_sort" type="number" value="0" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="0"></div>
        </div>`;

    document.getElementById('formSaveBtn').onclick = () => saveCategoryForm(editId);

    // If editing, load existing data
    if (editId) {
        supabase.from('hb_status_categories').select('*').eq('id', editId).single().then(({ data }) => {
            if (data) {
                document.getElementById('f_cat_name').value = data.name;
                document.getElementById('f_cat_sort').value = data.sort_order || 0;
            }
        });
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function saveCategoryForm(editId) {
    const name = document.getElementById('f_cat_name').value.trim();
    if (!name) return alert('กรุณาระบุชื่อหมวด');
    const sort_order = parseInt(document.getElementById('f_cat_sort').value) || 0;

    const btn = document.getElementById('formSaveBtn');
    btn.textContent = 'กำลังบันทึก...';
    btn.disabled = true;

    try {
        if (editId) {
            const { error } = await supabase.from('hb_status_categories').update({ name, sort_order }).eq('id', editId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('hb_status_categories').insert({ name, sort_order });
            if (error) throw error;
        }
        closeFormModal();
        loadData();
    } catch (err) {
        alert('❌ ' + err.message);
    } finally {
        btn.textContent = 'บันทึก';
        btn.disabled = false;
    }
}

async function deleteCategory(id) {
    if (!isDM) return;
    if (!confirm('⚠️ ลบหมวดนี้? Status Effects ในหมวดนี้จะถูกย้ายเป็น "ไม่มีหมวด"')) return;
    try {
        const { error } = await supabase.from('hb_status_categories').delete().eq('id', id);
        if (error) throw error;
        loadData();
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

// =====================================================
// Loot Table Detail (Edit items)
// =====================================================
async function openLootDetail(tableId) {
    if (!isDM) return;
    const table = currentData.find(t => t.id === tableId);
    if (!table) return;

    const { data: items } = await supabase.from('hb_loot_items').select('*').eq('loot_table_id', tableId).order('sort_order');

    const modal = document.getElementById('formModal');
    document.getElementById('formTitle').textContent = `จัดการไอเทม: ${table.name}`;

    let itemRows = (items || []).map((item, i) => `
        <div class="grid grid-cols-12 gap-2 items-center loot-row" data-id="${item.id}">
            <input class="col-span-5 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm li-name" value="${item.item_name}">
            <input class="col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm li-qty" value="${item.quantity || '1'}">
            <input type="number" class="col-span-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm li-rate" value="${item.drop_rate}" step="0.1">
            <button onclick="this.closest('.loot-row').remove()" class="col-span-2 text-red-400 hover:text-red-300 transition text-sm text-center">🗑️</button>
        </div>
    `).join('');

    document.getElementById('formBody').innerHTML = `
        <div class="space-y-3">
            <div class="grid grid-cols-12 gap-2 text-[10px] text-gray-500 uppercase font-bold px-1">
                <span class="col-span-5">ชื่อไอเทม</span><span class="col-span-2">จำนวน</span><span class="col-span-3">Drop Rate %</span><span class="col-span-2"></span>
            </div>
            <div id="lootItemsList" class="space-y-2">${itemRows}</div>
            <button onclick="addLootItemRow()" class="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-dashed border-gray-700 transition text-sm">+ เพิ่มไอเทม</button>
        </div>`;

    document.getElementById('formSaveBtn').onclick = () => saveLootItems(tableId);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function addLootItemRow() {
    const list = document.getElementById('lootItemsList');
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 items-center loot-row';
    row.dataset.id = '';
    row.innerHTML = `
        <input class="col-span-5 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm li-name" placeholder="ชื่อไอเทม">
        <input class="col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm li-qty" value="1">
        <input type="number" class="col-span-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm li-rate" value="100" step="0.1">
        <button onclick="this.closest('.loot-row').remove()" class="col-span-2 text-red-400 hover:text-red-300 transition text-sm text-center">🗑️</button>
    `;
    list.appendChild(row);
}

async function saveLootItems(tableId) {
    const btn = document.getElementById('formSaveBtn');
    btn.textContent = 'กำลังบันทึก...';
    btn.disabled = true;

    try {
        // Delete existing items
        await supabase.from('hb_loot_items').delete().eq('loot_table_id', tableId);

        // Gather new items
        const rows = document.querySelectorAll('.loot-row');
        const items = [];
        rows.forEach((row, i) => {
            const name = row.querySelector('.li-name').value.trim();
            if (!name) return;
            items.push({
                loot_table_id: tableId,
                item_name: name,
                quantity: row.querySelector('.li-qty').value || '1',
                drop_rate: parseFloat(row.querySelector('.li-rate').value) || 0,
                sort_order: i,
            });
        });

        if (items.length > 0) {
            const { error } = await supabase.from('hb_loot_items').insert(items);
            if (error) throw error;
        }

        closeFormModal();
        loadData();
    } catch (err) {
        alert('❌ ' + err.message);
    } finally {
        btn.textContent = 'บันทึก';
        btn.disabled = false;
    }
}

// =====================================================
// Search
// =====================================================
function handleSearch() {
    searchQuery = document.getElementById('searchInput').value.trim();

    if (activeTab === 'status_effects') {
        loadData(); // Re-render with filter
    } else if (activeTab === 'loot_tables') {
        loadData();
    } else if (activeTab === 'wiki') {
        renderWiki();
    } else {
        renderCards();
    }
}

// =====================================================
// Logout
// =====================================================
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// =====================================================
// Form Preview (non-wiki)
// =====================================================
function updateFormPreview() {
    const preview = document.getElementById('formPreview');
    if (!preview) return;

    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const cfg = TAB_CONFIG[activeTab];

    if (activeTab === 'status_effects') {
        const name = val('f_name') || 'ชื่อสถานะ';
        const desc = val('f_description') || 'คำอธิบาย...';
        const type = val('f_type') || 'Debuff';
        const typeBadge = type === 'Buff'
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">BUFF</span>`
            : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">DEBUFF</span>`;
        preview.innerHTML = `
            <div class="p-4">
                <div class="flex items-center gap-3 mb-3">
                    ${typeBadge}
                    <div>
                        <p class="font-semibold text-white">${name}</p>
                        <p class="text-xs text-gray-500">${desc}</p>
                    </div>
                </div>
            </div>`;
        return;
    }

    if (activeTab === 'loot_tables') {
        const name = val('f_name') || 'ชื่อตาราง';
        const desc = val('f_description') || '';
        preview.innerHTML = `
            <div class="p-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-2xl">🎲</span>
                    <h3 class="font-bold text-white text-lg">${name}</h3>
                </div>
                ${desc ? `<div class="text-sm text-gray-400 prose prose-invert prose-sm max-w-none">${typeof marked !== 'undefined' ? marked.parse(desc) : desc}</div>` : ''}
                <div class="mt-3 border-t border-gray-700 pt-3">
                    <p class="text-xs text-gray-600 italic">ไอเทมในตารางจะแสดงหลังบันทึก</p>
                </div>
            </div>`;
        return;
    }

    // Generic preview for: races, classes, items, skills, recipes, bestiary
    const name = val('f_name') || `${cfg.title} ใหม่`;
    const desc = val('f_description') || '';
    const imageUrl = val('f_image_url') || '';
    const content = val('f_content') || '';

    let html = '';

    // Image
    if (imageUrl.trim()) {
        html += `<div class="bg-gray-800 flex items-center justify-center" style="max-height: 200px; overflow: hidden;">
            <img src="${imageUrl}" alt="Preview" class="max-w-full max-h-[200px] object-contain" onerror="this.parentElement.innerHTML='<div class=\'flex items-center justify-center h-20 text-gray-600 text-2xl\'>${cfg.icon}</div>'">
        </div>`;
    } else {
        // Gradient header
        const gradientMap = {
            races: 'from-emerald-900/40 via-emerald-800/20 to-transparent',
            classes: 'from-rose-900/40 via-rose-800/20 to-transparent',
            items: 'from-indigo-900/40 via-indigo-800/20 to-transparent',
            skills: 'from-cyan-900/40 via-cyan-800/20 to-transparent',
            recipes: 'from-amber-900/40 via-amber-800/20 to-transparent',
            bestiary: 'from-red-900/40 via-red-800/20 to-transparent',
        };
        const g = gradientMap[activeTab] || 'from-purple-900/40 via-purple-800/20 to-transparent';
        html += `<div class="h-16 bg-gradient-to-br ${g} flex items-center justify-center"><span class="text-3xl opacity-50">${cfg.icon}</span></div>`;
    }

    html += `<div class="p-4">`;
    html += `<h3 class="font-bold text-white text-lg">${name}</h3>`;
    if (desc) html += `<p class="text-xs text-gray-500 mt-1">${desc}</p>`;

    // Badges
    let badges = '';
    if (activeTab === 'items') {
        const cat = val('f_category');
        if (cat) badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${cat}</span>`;
    }
    if (activeTab === 'skills') {
        const cat = val('f_category');
        if (cat) badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">${cat}</span>`;
    }
    if (activeTab === 'recipes') {
        const cat = val('f_category');
        if (cat) badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">${cat}</span>`;
    }
    if (activeTab === 'bestiary') {
        const mt = val('f_monster_type');
        const cr = val('f_challenge_rating');
        if (mt) badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">${mt}</span>`;
        if (cr) {
            const xp = CR_XP_MAP[cr];
            badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">CR ${cr}</span>`;
            if (xp !== undefined) badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">${xp.toLocaleString()} XP</span>`;
        }
    }
    if (badges) html += `<div class="flex flex-wrap gap-1.5 mt-2">${badges}</div>`;

    // Bestiary stats
    if (activeTab === 'bestiary') {
        const statColors = { STR: 'text-red-400', DEX: 'text-green-400', CON: 'text-amber-400', INT: 'text-blue-400', WIS: 'text-purple-400', CHA: 'text-pink-400' };
        html += `<div class="grid grid-cols-6 gap-1.5 mt-3">`;
        ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(s => {
            const v = val('f_stat_' + s) || '10';
            const mod = Math.floor((parseInt(v) - 10) / 2);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            html += `<div class="text-center bg-gray-800/60 rounded-lg py-1.5">
                <div class="text-[9px] font-bold ${statColors[s]} uppercase">${s}</div>
                <div class="text-white font-bold text-sm">${v}</div>
                <div class="text-[10px] text-gray-500">${modStr}</div>
            </div>`;
        });
        html += `</div>`;
    }

    // Recipe data
    if (activeTab === 'recipes') {
        const recipe = val('f_recipe_data');
        if (recipe) html += `<div class="mt-3"><div class="text-[10px] text-gray-500 uppercase font-bold mb-1">สูตรคราฟต์</div>
            <div class="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap">${recipe}</div></div>`;
    }

    // Markdown content
    if (content.trim()) {
        let rendered = content;
        if (typeof marked !== 'undefined') {
            rendered = marked.parse(content);
        } else {
            rendered = `<pre class="whitespace-pre-wrap text-sm">${content}</pre>`;
        }
        html += `<div class="mt-3 pt-3 border-t border-gray-700/50 prose prose-invert prose-sm max-w-none">${rendered}</div>`;
    }

    html += `</div>`;
    preview.innerHTML = html;
}

// =====================================================
// Wiki Editor Helpers
// =====================================================
function wikiUpdatePreview() {
    const textarea = document.getElementById('f_content');
    const preview = document.getElementById('wikiPreview');
    if (!textarea || !preview) return;

    const content = textarea.value;
    if (!content.trim()) {
        preview.innerHTML = '<p class="text-gray-500 italic">เริ่มพิมพ์เพื่อดู Preview...</p>';
        return;
    }

    if (typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(content);
    } else {
        preview.innerHTML = `<pre class="whitespace-pre-wrap">${content}</pre>`;
    }
}

function wikiSwitchTab(tab) {
    const writeBtn = document.getElementById('wikiTabWrite');
    const previewBtn = document.getElementById('wikiTabPreview');
    const writePane = document.getElementById('wikiWritePane');
    const previewPane = document.getElementById('wikiPreviewPane');
    const toolbar = document.getElementById('wikiToolbar');
    const container = document.getElementById('wikiEditorContainer');
    if (!writeBtn || !previewBtn) return;

    if (tab === 'write') {
        writeBtn.className = 'px-3 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white transition';
        previewBtn.className = 'px-3 py-1 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white transition';
        writePane.style.display = '';
        toolbar.style.display = '';
        container.classList.add('lg:grid-cols-2');
        container.classList.remove('grid-cols-1-only');
    } else {
        previewBtn.className = 'px-3 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white transition';
        writeBtn.className = 'px-3 py-1 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white transition';
        writePane.style.display = 'none';
        toolbar.style.display = 'none';
        container.classList.remove('lg:grid-cols-2');
        wikiUpdatePreview();
    }
}

function wikiInsert(type) {
    const textarea = document.getElementById('f_content');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    let insert = '';
    let cursorOffset = 0;

    switch (type) {
        case 'heading1': insert = `# ${selected || 'หัวข้อ'}\n`; cursorOffset = 2; break;
        case 'heading2': insert = `## ${selected || 'หัวข้อ'}\n`; cursorOffset = 3; break;
        case 'heading3': insert = `### ${selected || 'หัวข้อ'}\n`; cursorOffset = 4; break;
        case 'bold': insert = `**${selected || 'ข้อความหนา'}**`; cursorOffset = 2; break;
        case 'italic': insert = `*${selected || 'ข้อความเอียง'}*`; cursorOffset = 1; break;
        case 'strikethrough': insert = `~~${selected || 'ข้อความขีดฆ่า'}~~`; cursorOffset = 2; break;
        case 'link': insert = `[${selected || 'ข้อความ'}](url)`; cursorOffset = 1; break;
        case 'image': insert = `![${selected || 'คำอธิบาย'}](url)`; cursorOffset = 2; break;
        case 'ul': insert = `\n- ${selected || 'รายการ'}\n- รายการ\n- รายการ\n`; cursorOffset = 3; break;
        case 'ol': insert = `\n1. ${selected || 'รายการ'}\n2. รายการ\n3. รายการ\n`; cursorOffset = 4; break;
        case 'quote': insert = `\n> ${selected || 'ข้อความอ้างอิง'}\n`; cursorOffset = 3; break;
        case 'code': insert = `\n\`\`\`\n${selected || 'code here'}\n\`\`\`\n`; cursorOffset = 4; break;
        case 'table': insert = `\n| หัวข้อ 1 | หัวข้อ 2 | หัวข้อ 3 |\n|----------|----------|----------|\n| ข้อมูล 1 | ข้อมูล 2 | ข้อมูล 3 |\n`; cursorOffset = 0; break;
        case 'hr': insert = `\n---\n`; cursorOffset = 0; break;
    }

    textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
    textarea.focus();

    const newPos = start + (selected ? insert.length : cursorOffset);
    textarea.selectionStart = textarea.selectionEnd = newPos;

    wikiUpdatePreview();
}
