(function () {
  'use strict';

  const { PRIZES, GRID, PATTERNS } = window.AdventData;

  const K = {
    opened: 'advent.opened',
    kind: 'advent.kind',       // 'grid' | 'map'
    pattern: 'advent.pattern', // id патерну або 'custom'
    edit: 'advent.edit',       // '1' | '0'
    custom: 'advent.custom',
    snap: 'advent.snap',
  };

  // DOM
  const board = document.getElementById('board');
  const radios = Array.from(document.querySelectorAll('input[name="kind"]'));
  const patternBtn = document.getElementById('patternBtn');
  const patternName = document.getElementById('patternName');
  const editBtn = document.getElementById('editBtn');
  const resetBtn = document.getElementById('resetBtn');
  const editbar = document.getElementById('editbar');
  const snapToggle = document.getElementById('snapToggle');
  const copyCoordsBtn = document.getElementById('copyCoordsBtn');
  const clearCustomBtn = document.getElementById('clearCustomBtn');
  const doneEditBtn = document.getElementById('doneEditBtn');

  const patternModal = document.getElementById('patternModal');
  const patternGrid = document.getElementById('patternGrid');
  const createOwnBtn = document.getElementById('createOwnBtn');

  const prizeModal = document.getElementById('prizeModal');
  const modalDay = document.getElementById('modalDay');
  const modalImg = document.getElementById('modalImg');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');

  // Стан
  let opened = loadOpened();
  let kind = localStorage.getItem(K.kind) === 'map' ? 'map' : 'grid';
  let pattern = localStorage.getItem(K.pattern) || PATTERNS[0].id;
  let customPositions = loadCustom();
  let snap = localStorage.getItem(K.snap) === '1';
  let edit = localStorage.getItem(K.edit) === '1' && kind === 'map' && pattern === 'custom';

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- Збереження ---------- */
  function loadOpened() {
    try { return new Set(JSON.parse(localStorage.getItem(K.opened) || '[]')); }
    catch (_) { return new Set(); }
  }
  function saveOpened() { localStorage.setItem(K.opened, JSON.stringify([...opened])); }
  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(K.custom)) || null; } catch (_) { return null; }
  }
  function saveCustom() { localStorage.setItem(K.custom, JSON.stringify(customPositions)); }
  function saveState() {
    localStorage.setItem(K.kind, kind);
    localStorage.setItem(K.pattern, pattern);
    localStorage.setItem(K.edit, edit ? '1' : '0');
  }

  /* ---------- Лейаути ---------- */
  function gridSeed(cols) {
    const rows = Math.ceil(PRIZES.length / cols);
    const pos = {};
    PRIZES.forEach((p, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      pos[p.day] = {
        x: +(((c + 0.5) / cols) * 100).toFixed(1),
        y: +(((r + 0.5) / rows) * 100).toFixed(1),
      };
    });
    return pos;
  }
  function seedFrom(layout) {
    if (!layout) return gridSeed(6);
    if (layout.type === 'free') {
      const o = {};
      Object.keys(layout.positions).forEach((d) => { o[d] = { ...layout.positions[d] }; });
      return o;
    }
    const cols = layout.cols || 6;
    const rows = Math.ceil(PRIZES.length / cols);
    const pos = {};
    PRIZES.forEach((p) => {
      const g = layout.positions[p.day];
      pos[p.day] = {
        x: +(((g.col - 0.5) / cols) * 100).toFixed(1),
        y: +(((g.row - 0.5) / rows) * 100).toFixed(1),
      };
    });
    return pos;
  }
  function customLayout() {
    return { id: 'custom', name: 'Мій лейаут', type: 'free', positions: customPositions || gridSeed(6) };
  }
  function patternById(id) { return PATTERNS.find((p) => p.id === id); }
  function activeLayout() {
    if (kind === 'grid') return GRID;
    if (pattern === 'custom') return customLayout();
    return patternById(pattern) || PATTERNS[0];
  }

  /* ---------- «Сьогодні» (адвент у грудні) ---------- */
  function todayDay() {
    const now = new Date();
    if (now.getMonth() === 11 && now.getDate() >= 1 && now.getDate() <= 24) return now.getDate();
    return null;
  }

  /* ---------- Прев'ю патерну (SVG з крапками) ---------- */
  function patternPreview(layout) {
    const w = 104, h = 68;
    let dots = '';
    PRIZES.forEach((p) => {
      const pos = layout.positions[p.day];
      if (!pos) return;
      const cx = (pos.x / 100) * w;
      const cy = (pos.y / 100) * h;
      dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.2" fill="currentColor" />`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" class="h-full w-full">${dots}</svg>`;
  }

  /* ---------- Рендер контролів ---------- */
  function render() {
    radios.forEach((r) => { r.checked = (r.value === kind); });

    const isMap = kind === 'map';
    const isCustom = isMap && pattern === 'custom';
    patternBtn.classList.toggle('hidden', !isMap);
    editBtn.classList.toggle('hidden', !(isCustom && !edit));
    editbar.style.display = edit ? 'flex' : 'none';
    snapToggle.checked = snap;

    if (isMap) {
      patternName.textContent = isCustom ? 'Мій лейаут' : (patternById(pattern) ? patternById(pattern).name : '—');
    }
    renderBoard();
  }

  /* ---------- Рендер поля ---------- */
  function renderBoard() {
    board.innerHTML = '';
    const layout = activeLayout();
    const isGrid = layout.type === 'grid';

    board.className = 'board ' + (isGrid ? 'board--grid' : 'board--map')
      + (layout.long ? ' board--long' : '')
      + (edit ? ' is-edit' : '');

    if (isGrid) {
      const cols = layout.cols || 6;
      board.style.display = 'grid';
      board.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      board.style.gap = '12px';
      board.style.height = '';
      const sorted = [...PRIZES].sort((a, b) => {
        const pa = layout.positions[a.day], pb = layout.positions[b.day];
        return pa.row - pb.row || pa.col - pb.col;
      });
      sorted.forEach((prize) => board.appendChild(createCell(prize, true)));
    } else {
      board.style.display = 'block';
      board.style.gridTemplateColumns = '';
      board.style.gap = '';
      board.style.height = layout.long
        ? Math.max(PRIZES.length * 120, window.innerHeight * 2.2) + 'px'
        : '';
      PRIZES.forEach((prize) => {
        const pos = layout.positions[prize.day];
        if (!pos) return;
        const cell = createCell(prize, false);
        cell.style.setProperty('--x', pos.x + '%');
        cell.style.setProperty('--y', pos.y + '%');
        cell.querySelector('.cell__coord').textContent = `${Math.round(pos.x)},${Math.round(pos.y)}`;
        board.appendChild(cell);
      });
      sizeMapCells();
    }
  }

  function createCell(prize, isGrid) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell group' + (isGrid ? ' aspect-square w-full' : '');
    cell.dataset.day = prize.day;
    cell.setAttribute('aria-label', `День ${prize.day}`);
    if (opened.has(prize.day)) cell.classList.add('is-open');

    const todayRing = todayDay() === prize.day ? ' ring-2 ring-amber-400' : ' ring-1 ring-white/10';
    cell.innerHTML = `
      <div class="cell__inner shadow-lg">
        <div class="cell__face cell__front bg-slate-800 transition group-hover:ring-white/25${todayRing}">
          <span class="text-2xl font-semibold text-slate-200">${prize.day}</span>
        </div>
        <div class="cell__face cell__back bg-slate-100">
          <img src="${prize.image}" alt="${prize.title}" loading="lazy" class="max-h-[78%] max-w-[78%] object-contain" />
        </div>
      </div>
      <span class="cell__coord absolute left-1/2 -bottom-2 -translate-x-1/2 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"></span>`;

    cell.addEventListener('click', () => { if (!edit) openPrize(prize); });
    return cell;
  }

  function sizeMapCells() {
    if (activeLayout().type !== 'free') return;
    const w = board.clientWidth || board.offsetWidth;
    const size = Math.max(58, Math.min(118, w / 8.5));
    board.style.setProperty('--cell-size', size + 'px');
  }

  /* ---------- Перетягування (редагування) ---------- */
  let drag = null;
  board.addEventListener('pointerdown', (e) => {
    if (!edit) return;
    const cell = e.target.closest('.cell');
    if (!cell || !board.contains(cell)) return;
    e.preventDefault();
    drag = { cell, day: +cell.dataset.day, badge: cell.querySelector('.cell__coord'), moved: false };
    cell.classList.add('is-dragging');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  });
  function onDragMove(e) {
    if (!drag) return;
    const rect = board.getBoundingClientRect();
    let x = clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 98);
    let y = clamp(((e.clientY - rect.top) / rect.height) * 100, 2, 98);
    if (snap) { const s = 2.5; x = Math.round(x / s) * s; y = Math.round(y / s) * s; }
    x = +x.toFixed(1); y = +y.toFixed(1);
    drag.moved = true;
    drag.cell.style.setProperty('--x', x + '%');
    drag.cell.style.setProperty('--y', y + '%');
    customPositions[drag.day] = { x, y };
    if (drag.badge) drag.badge.textContent = `${Math.round(x)},${Math.round(y)}`;
  }
  function onDragEnd() {
    if (!drag) return;
    drag.cell.classList.remove('is-dragging');
    if (drag.moved) saveCustom();
    drag = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragEnd);
  }

  /* ---------- Модалка призу ---------- */
  let prizeTimer = null;
  function openPrize(prize) {
    const firstTime = !opened.has(prize.day);
    opened.add(prize.day);
    saveOpened();
    const cell = board.querySelector(`.cell[data-day="${prize.day}"]`);
    if (cell) cell.classList.add('is-open');
    clearTimeout(prizeTimer);
    prizeTimer = setTimeout(() => showPrize(prize), firstTime ? 420 : 120);
  }
  function showPrize(prize) {
    modalDay.textContent = `День ${prize.day}`;
    modalImg.src = prize.image;
    modalImg.alt = prize.title;
    modalTitle.textContent = prize.title;
    modalDesc.textContent = prize.description || '';
    openModal(prizeModal);
  }

  /* ---------- Модалки (загальне) ---------- */
  function openModal(el) { el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  function closeModal(el) { el.style.display = 'none'; document.body.style.overflow = ''; }

  prizeModal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close-prize')) closeModal(prizeModal); });
  patternModal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close-pattern')) closeModal(patternModal); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (prizeModal.style.display === 'flex') closeModal(prizeModal);
    else if (patternModal.style.display === 'flex') closeModal(patternModal);
  });

  /* ---------- Модалка вибору патерну ---------- */
  function openPatternModal() {
    patternGrid.innerHTML = '';

    PATTERNS.forEach((p) => {
      patternGrid.appendChild(patternCard(p.name, p, pattern === p.id, () => choosePattern(p.id)));
    });
    if (customPositions) {
      patternGrid.appendChild(patternCard('✏️ Мій лейаут', customLayout(), pattern === 'custom', () => choosePattern('custom')));
    }
    openModal(patternModal);
  }
  function patternCard(label, layout, active, onClick) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'group flex flex-col items-center gap-2 rounded-xl bg-slate-800 p-3 ring-1 transition hover:ring-amber-400/60 '
      + (active ? 'ring-amber-400' : 'ring-white/10');
    card.innerHTML = `<div class="h-16 w-full text-slate-500 transition group-hover:text-amber-300">${patternPreview(layout)}</div>
      <span class="text-xs text-slate-300">${label}</span>`;
    card.addEventListener('click', onClick);
    return card;
  }
  function choosePattern(id) {
    kind = 'map';
    pattern = id;
    edit = false;
    saveState();
    closeModal(patternModal);
    render();
  }
  function startOwn() {
    if (!customPositions) {
      const src = (pattern && pattern !== 'custom') ? (patternById(pattern) || GRID) : GRID;
      customPositions = seedFrom(src);
      saveCustom();
    }
    kind = 'map';
    pattern = 'custom';
    edit = true;
    saveState();
    closeModal(patternModal);
    render();
    toast('Перетягуй призи, щоб розставити ✏️');
  }

  /* ---------- Тост ---------- */
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 translate-y-3 rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-100 opacity-0 shadow-2xl ring-1 ring-white/10 transition-all duration-200';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.remove('opacity-0', 'translate-y-3'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('opacity-0', 'translate-y-3'), 2200);
  }

  /* ---------- Дії ---------- */
  function copyCoords() {
    const pos = customPositions || gridSeed(6);
    const lines = PRIZES.map((p) => `      ${p.day}: { x: ${pos[p.day].x}, y: ${pos[p.day].y} },`).join('\n');
    const text = `{\n  id: 'custom',\n  name: 'Мій лейаут',\n  type: 'free',\n  positions: {\n${lines}\n  },\n}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast('Координати скопійовано 📋'),
        () => window.prompt('Скопіюй координати:', text)
      );
    } else {
      window.prompt('Скопіюй координати:', text);
    }
  }

  /* ---------- Слухачі ---------- */
  radios.forEach((r) => r.addEventListener('change', () => {
    if (r.value === 'grid') { kind = 'grid'; edit = false; saveState(); render(); }
    else { kind = 'map'; saveState(); render(); openPatternModal(); }
  }));

  patternBtn.addEventListener('click', openPatternModal);
  createOwnBtn.addEventListener('click', startOwn);
  editBtn.addEventListener('click', () => {
    if (!customPositions) { customPositions = seedFrom(GRID); saveCustom(); }
    edit = true; saveState(); render();
  });
  doneEditBtn.addEventListener('click', () => { edit = false; saveState(); render(); toast('Готово ✓'); });

  snapToggle.addEventListener('change', () => {
    snap = snapToggle.checked;
    localStorage.setItem(K.snap, snap ? '1' : '0');
  });
  copyCoordsBtn.addEventListener('click', copyCoords);
  clearCustomBtn.addEventListener('click', () => {
    customPositions = gridSeed(6);
    saveCustom();
    renderBoard();
    toast('Вирівняно в сітку');
  });

  resetBtn.addEventListener('click', () => {
    if (opened.size === 0) { toast('Немає відкритих віконець 🤷'); return; }
    let ok = true;
    try { ok = window.confirm('Скинути всі відкриті віконця?'); } catch (_) { ok = true; }
    if (!ok) return;
    opened = new Set();
    saveOpened();
    closeModal(prizeModal);
    renderBoard();
    toast('Прогрес скинуто 🔄');
  });

  let resizeRAF = null;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(() => {
      const layout = activeLayout();
      if (layout.long) board.style.height = Math.max(PRIZES.length * 120, window.innerHeight * 2.2) + 'px';
      sizeMapCells();
    });
  });

  /* ---------- Старт ---------- */
  render();
})();
