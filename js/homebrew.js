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
    recipes: { table: 'hb_recipes', title: 'Recipes', icon: '🧪', hasCategory: true },
    bestiary: { table: 'hb_bestiary', title: 'Bestiary', icon: '🐉' },
    loot_tables: { table: 'hb_loot_tables', title: 'Loot Tables', icon: '🎲' },
    wiki: { table: 'hb_wiki', title: 'Wiki', icon: '📖' },
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
                    <button onclick="openCategoryModal('${cat.id}')" class="p-1.5 text-gray-500 hover:text-amber-400 transition" title="แก้ไขหมวด">✏️</button>
                    <button onclick="deleteCategory('${cat.id}')" class="p-1.5 text-gray-500 hover:text-red-400 transition" title="ลบหมวด">🗑️</button>
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
            <button onclick="openFormModal('${e.id}')" class="p-1.5 text-gray-500 hover:text-amber-400 transition text-sm">✏️</button>
            <button onclick="deleteItem('${e.id}')" class="p-1.5 text-gray-500 hover:text-red-400 transition text-sm">🗑️</button>
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
                    <p class="text-xs text-gray-500">${t.description || ''}</p>
                </div>
                ${isDM ? `<div class="flex gap-1 shrink-0 ml-2">
                    <button onclick="openLootDetail('${t.id}')" class="p-1.5 text-gray-500 hover:text-amber-400 transition">✏️</button>
                    <button onclick="deleteItem('${t.id}')" class="p-1.5 text-gray-500 hover:text-red-400 transition">🗑️</button>
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
                        <button onclick="event.stopPropagation(); openFormModal('${w.id}')" class="p-1 text-gray-500 hover:text-amber-400 transition">✏️</button>
                        <button onclick="event.stopPropagation(); deleteItem('${w.id}')" class="p-1 text-gray-500 hover:text-red-400 transition">🗑️</button>
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

    return `
    <div onclick="openDetailModal('${item.id}')" class="glass-panel rounded-xl overflow-hidden cursor-pointer group hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col">
        ${hasImage ? `<div class="aspect-[16/9] bg-gray-800 overflow-hidden">
            <img src="${item.image_url}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-full text-gray-600 text-3xl\\'>${TAB_CONFIG[activeTab].icon}</div>'">
        </div>` : ''}
        <div class="p-4 flex-1 flex flex-col">
            <h3 class="font-bold text-white group-hover:text-purple-200 transition truncate">${item.name}</h3>
            <p class="text-xs text-gray-500 mt-1 line-clamp-2 flex-1">${item.description || ''}</p>
            ${badges ? `<div class="flex flex-wrap gap-1.5 mt-3">${badges}</div>` : ''}
        </div>
        ${isDM ? `<div class="px-4 pb-3 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
            <button onclick="event.stopPropagation(); openFormModal('${item.id}')" class="p-1.5 text-gray-500 hover:text-amber-400 transition text-sm" title="แก้ไข">✏️</button>
            <button onclick="event.stopPropagation(); deleteItem('${item.id}')" class="p-1.5 text-gray-500 hover:text-red-400 transition text-sm" title="ลบ">🗑️</button>
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
        if (item.challenge_rating) badges += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">${item.challenge_rating} XP</span>`;
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
        body += `<div class="aspect-[16/9] bg-gray-800 rounded-xl overflow-hidden mb-4">
            <img src="${item.image_url}" alt="${item.name}" class="w-full h-full object-cover">
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
        formHtml = `
            <div class="space-y-4">
                <div><label class="block text-xs text-gray-500 mb-1">หัวข้อ</label>
                    <input id="f_title" value="${item ? item.title : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อหัวข้อ Wiki"></div>
                <div><label class="block text-xs text-gray-500 mb-1">เนื้อหา (รองรับ Markdown)</label>
                    <textarea id="f_content" rows="12" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-y font-mono text-sm" placeholder="# หัวข้อ\n\nเนื้อหา...">${item ? item.content || '' : ''}</textarea></div>
            </div>`;
    } else if (activeTab === 'loot_tables') {
        formHtml = `
            <div class="space-y-4">
                <div><label class="block text-xs text-gray-500 mb-1">ชื่อตาราง</label>
                    <input id="f_name" value="${item ? item.name : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ชื่อ Loot Table"></div>
                <div><label class="block text-xs text-gray-500 mb-1">คำอธิบาย</label>
                    <textarea id="f_description" rows="2" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-none" placeholder="คำอธิบาย">${item ? item.description || '' : ''}</textarea></div>
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
                    <div><label class="block text-xs text-gray-500 mb-1">Challenge Rating / XP</label>
                        <input id="f_challenge_rating" value="${item ? item.challenge_rating || '' : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="เช่น 1/4, 5, 20"></div>
                    <div><label class="block text-xs text-gray-500 mb-1">URL รูปภาพ</label>
                        <input id="f_image_url" value="${item ? item.image_url || '' : ''}" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="https://..."></div>
                </div>
                <div><label class="block text-xs text-gray-500 mb-1">คำอธิบาย</label>
                    <textarea id="f_description" rows="2" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-none" placeholder="คำอธิบายสั้นๆ">${item ? item.description || '' : ''}</textarea></div>
                <div><label class="block text-xs text-gray-500 mb-1">Stats (JSON: {"STR": 15, "DEX": 10, ...})</label>
                    <textarea id="f_stats" rows="2" class="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition resize-none font-mono text-sm" placeholder='{"STR": 10, "DEX": 10}'>${JSON.stringify(stats, null, 2)}</textarea></div>
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

    body.innerHTML = formHtml;
    document.getElementById('formSaveBtn').onclick = () => saveForm(editId);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeFormModal() {
    const modal = document.getElementById('formModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
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
        let stats = {};
        try { stats = JSON.parse(document.getElementById('f_stats').value || '{}'); } catch (e) { return alert('Stats JSON ไม่ถูกต้อง'); }
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
