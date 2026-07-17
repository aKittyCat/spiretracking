// ══════════════════════════════════════════════════════
//  lore.js  —  โลจิคทั้งหมดของ lore.html
// ══════════════════════════════════════════════════════

// ── NPC Walker State ──────────────────────────────────
const walkers = [];
let npcAnimFrame = 0;
let npcAnimTick = 0;
let npcLoopId = null;

// ── NPC Walker: Init ──────────────────────────────────
function initNpcWalkers() {
    const container = document.getElementById('npc-walkers');
    if (!container) return;
    container.innerHTML = '';
    walkers.length = 0;

    NPC_DATA.forEach((npc, i) => {
        const canvas = document.createElement('canvas');
        canvas.width = npc.frameW;
        canvas.height = npc.frameH;
        canvas.style.cssText = `
            image-rendering: pixelated;
            width:  ${npc.frameW * 2.5}px;
            height: ${npc.frameH * 2.5}px;
            position: absolute;
            bottom: 0;
            cursor: pointer;
            transition: filter 0.2s;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.8));
        `;
        canvas.title = npc.name;
        canvas.dataset.npcId = npc.id;

        canvas.addEventListener('mouseenter', () => {
            canvas.style.filter = 'drop-shadow(0 0 12px rgba(197,160,89,0.9))';
        });
        canvas.addEventListener('mouseleave', () => {
            canvas.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))';
        });
        canvas.addEventListener('click', () => openNpcModal(npc));

        // Name label above sprite
        const label = document.createElement('div');
        label.textContent = npc.name.split(',')[0];
        label.style.cssText = `
            position: absolute;
            bottom: ${npc.frameH * 2.5 + 4}px;
            white-space: nowrap;
            font-size: 0.7rem;
            color: #c5a059;
            text-shadow: 0 1px 4px #000;
            font-family: 'Cinzel', serif;
            pointer-events: none;
        `;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:absolute;bottom:0;';
        wrapper.appendChild(label);
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        const img = new Image();
        img.src = npc.sprite;

        const startX = 80 + i * 220;
        const dir = (i % 2 === 0) ? 1 : -1;   // 1 = right, -1 = left
        const speed = 0.6 + Math.random() * 0.4;

        walkers.push({ npc, canvas, img, wrapper, label, x: startX, dir, speed });
    });
}

// ── NPC Walker: Draw loop ─────────────────────────────
function drawWalkers() {
    npcAnimTick++;
    if (npcAnimTick % 12 === 0) npcAnimFrame = (npcAnimFrame + 1) % 3;

    const sceneW = document.getElementById('npc-scene')?.offsetWidth || 800;

    walkers.forEach(w => {
        w.x += w.dir * w.speed;
        const maxX = w.npc.frameW * 2.5;
        if (w.x > sceneW - maxX) { w.x = sceneW - maxX; w.dir = -1; }
        if (w.x < 0) { w.x = 0; w.dir = 1; }

        w.wrapper.style.left = w.x + 'px';
        w.label.style.left = '50%';
        w.label.style.transform = 'translateX(-50%)';

        const ctx = w.canvas.getContext('2d');
        ctx.clearRect(0, 0, w.npc.frameW, w.npc.frameH);

        if (w.img.complete && w.img.naturalWidth > 0) {
            // row1 = walk-left, row2 = walk-right
            const row = w.dir > 0 ? 2 : 1;
            const col = npcAnimFrame;
            ctx.drawImage(
                w.img,
                col * w.npc.frameW, row * w.npc.frameH,
                w.npc.frameW, w.npc.frameH,
                0, 0,
                w.npc.frameW, w.npc.frameH
            );
        }
    });
}

function startNpcLoop() {
    if (npcLoopId) return;
    function loop() {
        drawWalkers();
        npcLoopId = requestAnimationFrame(loop);
    }
    npcLoopId = requestAnimationFrame(loop);
}

function stopNpcLoop() {
    if (npcLoopId) { cancelAnimationFrame(npcLoopId); npcLoopId = null; }
}

// ── NPC Mobile Grid ───────────────────────────────────
function initNpcMobileGrid() {
    const grid = document.getElementById('npc-mobile-grid');
    if (!grid) return;
    grid.innerHTML = '';

    NPC_DATA.forEach(npc => {
        // Card wrapper
        const card = document.createElement('div');
        card.className = 'npc-card';
        card.addEventListener('click', () => openNpcModal(npc));

        // Portrait canvas — draw first frame
        const canvas = document.createElement('canvas');
        canvas.width = npc.pFrameW;
        canvas.height = npc.pFrameH;
        card.appendChild(canvas);

        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, npc.pFrameW, npc.pFrameH, 0, 0, npc.pFrameW, npc.pFrameH);
        };
        img.src = npc.portrait;

        // Name label
        const nameEl = document.createElement('div');
        nameEl.className = 'npc-card-name';
        nameEl.textContent = npc.name.split(',')[0];
        card.appendChild(nameEl);

        grid.appendChild(card);
    });
}

// ── NPC Modal ─────────────────────────────────────────
function openNpcModal(npc) {
    document.getElementById('npc-modal-name').textContent = npc.name;
    document.getElementById('npc-modal-race').textContent = npc.race;
    document.getElementById('npc-modal-desc').textContent = npc.desc;
    document.getElementById('npc-modal-bg').textContent = npc.bg;
    document.getElementById('npc-modal-role').textContent = npc.role;
    document.getElementById('npc-modal-char').textContent = npc.char;
    document.getElementById('npc-modal-ideal').textContent = npc.ideal;
    document.getElementById('npc-modal-bond').textContent = npc.bond;
    document.getElementById('npc-modal-flaw').textContent = npc.flaw;

    // Draw first frame of portrait only
    const pCanvas = document.getElementById('npc-portrait-canvas');
    pCanvas.width = npc.pFrameW;
    pCanvas.height = npc.pFrameH;
    // Let CSS control display size — don't override with inline style

    const pImg = new Image();
    pImg.onload = () => {
        const ctx = pCanvas.getContext('2d');
        ctx.clearRect(0, 0, npc.pFrameW, npc.pFrameH);
        ctx.drawImage(pImg, 0, 0, npc.pFrameW, npc.pFrameH, 0, 0, npc.pFrameW, npc.pFrameH);
    };
    pImg.src = npc.portrait;

    document.getElementById('npc-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeNpcModal(e) {
    // ถ้าถูกเรียกจาก onclick overlay ต้องตรวจว่า click ที่ backdrop จริงๆ
    if (e && e.target !== document.getElementById('npc-modal')) return;
    document.getElementById('npc-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ── Page Switcher ─────────────────────────────────────
function switchPage(page) {
    const pages = ['lore', 'gallery', 'spire', 'npc'];
    const titles = {
        lore: 'The Spire Lore',
        gallery: 'Archives',
        spire: 'Inside The Spire',
        npc: 'Spire Residents',
    };

    pages.forEach(p => {
        const el = document.getElementById('page-' + p);
        const btn = document.getElementById('btn-' + p);
        if (el) el.style.display = 'none';
        if (btn) { btn.classList.remove('active', 'text-white'); btn.classList.add('text-gray-400'); }
    });

    const target = document.getElementById('page-' + page);
    const activeBtn = document.getElementById('btn-' + page);
    if (target) target.style.display = 'block';
    if (activeBtn) { activeBtn.classList.add('active', 'text-white'); activeBtn.classList.remove('text-gray-400'); }
    document.getElementById('page-title').innerText = titles[page] || '';

    if (page === 'npc') {
        setTimeout(() => setNpcView(currentNpcView), 50);
    } else {
        stopNpcLoop();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── NPC View Toggle ───────────────────────────────────
let currentNpcView = 'grid'; // Default to grid

function setNpcView(mode) {
    currentNpcView = mode;
    const btnGrid = document.getElementById('btn-npc-grid');
    const btnWalker = document.getElementById('btn-npc-walker');
    const gridView = document.getElementById('npc-mobile-grid');
    const walkerView = document.getElementById('npc-scene');

    if (!btnGrid || !walkerView) return;

    if (mode === 'grid') {
        gridView.style.display = 'grid';
        walkerView.style.display = 'none';

        btnGrid.className = 'px-4 py-2 border border-[#c5a059] text-[#c5a059] rounded-full font-bold transition bg-[#c5a059]/10 text-sm';
        btnWalker.className = 'px-4 py-2 border border-gray-600 text-gray-400 rounded-full font-bold transition hover:border-[#c5a059] hover:text-[#c5a059] text-sm';

        stopNpcLoop();
        initNpcMobileGrid();
    } else {
        gridView.style.display = 'none';
        walkerView.style.display = 'block';

        btnWalker.className = 'px-4 py-2 border border-[#c5a059] text-[#c5a059] rounded-full font-bold transition bg-[#c5a059]/10 text-sm';
        btnGrid.className = 'px-4 py-2 border border-gray-600 text-gray-400 rounded-full font-bold transition hover:border-[#c5a059] hover:text-[#c5a059] text-sm';

        initNpcWalkers();
        startNpcLoop();
    }
}

// ── Spire Sub-page Switcher ───────────────────────────
function switchSpireArea(area) {
    document.querySelectorAll('.spire-area-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.spire-area-btn').forEach(btn => {
        btn.classList.remove('border-gold', 'text-gold', 'font-bold');
        btn.classList.add('border-transparent', 'text-gray-400');
    });

    document.getElementById('area-' + area).classList.remove('hidden');

    const activeBtn = document.getElementById('btn-area-' + area);
    activeBtn.classList.remove('border-transparent', 'text-gray-400');
    activeBtn.classList.add('border-gold', 'text-gold', 'font-bold');
}

// ── Gallery Lightbox ──────────────────────────────────
function openModal(imgSrc) {
    document.getElementById('modal-img').src = imgSrc;
    document.getElementById('image-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('image-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ── Escape key closes modals ──────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        document.getElementById('npc-modal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// ── Auth Guard ────────────────────────────────────────
(async function checkAuth() {
    try {
        if (typeof supabase === 'undefined') { console.error('Supabase not initialized'); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) window.location.href = 'index.html';
    } catch (err) {
        console.error('Auth check failed:', err);
    }
})();
