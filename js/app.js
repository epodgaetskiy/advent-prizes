(function () {
  'use strict';

  const { PRIZES, GRID, PATTERNS } = window.AdventData;

  const K = {
    kind: 'advent.kind',
    pattern: 'advent.pattern',
    custom: 'advent.custom',
    snap: 'advent.snap',
  };

  // DOM — інлайн
  const radios = Array.from(document.querySelectorAll('input[name="kind"]'));
  const patternRow = document.getElementById('patternRow');
  const patternThumb = document.getElementById('patternThumb');
  const patternName = document.getElementById('patternName');
  const choosePatternBtn = document.getElementById('choosePatternBtn');

  // DOM — модал
  const cfgModal = document.getElementById('cfgModal');
  const sidebar = document.getElementById('sidebar');
  const patternList = document.getElementById('patternList');
  const wsTabEdit = document.getElementById('wsTabEdit');
  const wsTabPreview = document.getElementById('wsTabPreview');
  const wsLayoutName = document.getElementById('wsLayoutName');
  const deviceToggle = document.getElementById('deviceToggle');
  const editPane = document.getElementById('editPane');
  const previewPane = document.getElementById('previewPane');
  const snapToggle = document.getElementById('snapToggle');
  const copyCoordsBtn = document.getElementById('copyCoordsBtn');
  const clearCustomBtn = document.getElementById('clearCustomBtn');
  const editorBoard = document.getElementById('editorBoard');
  const previewBoard = document.getElementById('previewBoard');
  const deviceWrap = document.getElementById('deviceWrap');
  const saveOwnBtn = document.getElementById('saveOwnBtn');
  const autosaveHint = document.getElementById('autosaveHint');
  const pvTabs = Array.from(document.querySelectorAll('.pv-tab'));

  // Стан
  let kind = localStorage.getItem(K.kind) === 'map' ? 'map' : 'grid';
  let pattern = localStorage.getItem(K.pattern) || PATTERNS[0].id;
  let customPositions = loadCustom();
  let snap = localStorage.getItem(K.snap) === '1';

  // Стан модалу
  let device = 'desktop';
  let gridMode = false;       // прев'ю сітки (без сайдбара/редагування)
  let working = pattern;      // обраний у модалі патерн (або 'custom')
  let editingDraft = null;    // координати, що редагуються
  let wsTab = 'preview';
  let previewLayout = null;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- Збереження ---------- */
  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(K.custom)) || null; } catch (_) { return null; }
  }
  function saveCustom() { localStorage.setItem(K.custom, JSON.stringify(customPositions)); }
  function saveState() {
    localStorage.setItem(K.kind, kind);
    localStorage.setItem(K.pattern, pattern);
  }

  /* ---------- Координати ---------- */
  function gridSeed(cols) {
    const rows = Math.ceil(PRIZES.length / cols);
    const pos = {};
    PRIZES.forEach((p, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      pos[p.day] = { x: +(((c + 0.5) / cols) * 100).toFixed(1), y: +(((r + 0.5) / rows) * 100).toFixed(1) };
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
      pos[p.day] = { x: +(((g.col - 0.5) / cols) * 100).toFixed(1), y: +(((g.row - 0.5) / rows) * 100).toFixed(1) };
    });
    return pos;
  }
  function customLayout() {
    return { id: 'custom', name: 'Custom', type: 'free', positions: customPositions || gridSeed(6) };
  }
  function draftLayout() {
    return { id: 'custom', name: 'Custom', type: 'free', positions: editingDraft };
  }
  function patternById(id) { return PATTERNS.find((p) => p.id === id); }
  function layoutOf(id) {
    if (id === '__grid__') return GRID;
    if (id === 'custom') return customLayout();
    return patternById(id) || PATTERNS[0];
  }
  function selectedMapLayout() {
    if (pattern === 'custom' && customPositions) return customLayout();
    return patternById(pattern) || PATTERNS[0];
  }
  function isValidSelection() {
    return (pattern === 'custom' && !!customPositions) || !!patternById(pattern);
  }

  /* ---------- SVG-прев'ю (крапки) ---------- */
  function previewSVG(layout) {
    const w = 104, h = 68;
    let dots = '';
    PRIZES.forEach((p) => {
      const pos = layout.positions[p.day];
      if (!pos) return;
      dots += `<circle cx="${((pos.x / 100) * w).toFixed(1)}" cy="${((pos.y / 100) * h).toFixed(1)}" r="3" fill="currentColor" />`;
    });
    return `<svg viewBox="0 0 ${w} ${h}">${dots}</svg>`;
  }

  /* ---------- Інлайн ---------- */
  function renderInline() {
    radios.forEach((r) => { r.checked = (r.value === kind); });
    const isMap = kind === 'map';
    patternRow.hidden = !isMap;
    if (isMap) {
      const layout = selectedMapLayout();
      patternThumb.innerHTML = previewSVG(layout);
      patternName.textContent = layout.name;
    }
  }

  /* ---------- Модал ---------- */
  function openModal() { cfgModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  function closeModal() {
    if (editingDraft) autosaveTick(); // зберегти останні зміни перед закриттям
    stopAutosave();
    cfgModal.style.display = 'none';
    document.body.style.overflow = '';
  }
  cfgModal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cfgModal.style.display === 'flex') closeModal(); });

  function openConfig(tab) {
    gridMode = false;
    kind = 'map';
    if (!isValidSelection()) pattern = PATTERNS[0].id;
    working = pattern;
    editingDraft = null;
    saveState();
    renderInline();
    sidebar.hidden = false;
    sidebar.style.display = '';
    wsTabEdit.style.display = '';
    buildSidebar();
    openModal();
    selectTab(tab || 'preview');
  }
  function openGridPreview() {
    gridMode = true;
    editingDraft = null;
    sidebar.style.display = 'none';
    wsTabEdit.style.display = 'none';
    openModal();
    selectTab('preview');
  }

  function setWsTabActive(which) {
    [[wsTabEdit, which === 'edit'], [wsTabPreview, which === 'preview']].forEach(([t, on]) => {
      t.classList.toggle('bg-white', on);
      t.classList.toggle('shadow-sm', on);
      t.classList.toggle('text-ink', on);
      t.classList.toggle('text-sub', !on);
    });
  }
  function selectTab(which) {
    if (which === 'edit' && gridMode) which = 'preview';
    wsTab = which;
    setWsTabActive(which);
    if (which === 'edit') {
      if (!editingDraft) editingDraft = seedFrom(layoutOf(working));
      editPane.style.display = 'flex';
      previewPane.style.display = 'none';
      deviceToggle.style.display = 'none';
      snapToggle.checked = snap;
      renderEditor();
      wsLayoutName.textContent = 'Editing: ' + (working === 'custom' ? 'Custom' : layoutOf(working).name);
      startAutosave();
    } else {
      stopAutosave();
      editPane.style.display = 'none';
      previewPane.style.display = 'block';
      deviceToggle.style.display = 'inline-flex';
      previewLayout = editingDraft ? draftLayout() : (gridMode ? GRID : layoutOf(working));
      renderPreview();
      wsLayoutName.textContent = previewLayout.name;
    }
    updateSaveBtn();
  }
  function updateSaveBtn() { saveOwnBtn.style.display = editingDraft ? '' : 'none'; }

  /* ---------- Автозбереження кожні 5 c (під час редагування) ---------- */
  let autosaveTimer = null;
  let lastSavedSig = null;
  let hintTimer = null;
  function startAutosave() {
    stopAutosave();
    lastSavedSig = editingDraft ? JSON.stringify(editingDraft) : null;
    autosaveTimer = setInterval(autosaveTick, 5000);
  }
  function stopAutosave() {
    if (autosaveTimer) { clearInterval(autosaveTimer); autosaveTimer = null; }
  }
  function autosaveTick() {
    if (!editingDraft) return;
    const sig = JSON.stringify(editingDraft);
    if (sig === lastSavedSig) return; // без змін — не зберігаємо
    lastSavedSig = sig;
    customPositions = JSON.parse(sig);
    saveCustom();
    pattern = 'custom';
    working = 'custom';
    kind = 'map';
    saveState();
    renderInline();
    buildSidebar();
    flashSaved();
  }
  function flashSaved() {
    autosaveHint.textContent = '✓ Auto-saved';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { autosaveHint.textContent = ''; }, 1800);
  }

  /* ---------- Сайдбар патернів ---------- */
  function buildSidebar() {
    patternList.innerHTML = '';
    PATTERNS.forEach((p) => patternList.appendChild(sideItem(p.name, p, working === p.id, () => selectWorking(p.id))));
    if (customPositions) {
      patternList.appendChild(sideItem('Custom', customLayout(), working === 'custom', () => selectWorking('custom')));
    }
  }
  function sideItem(label, layout, active, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition hover:bg-gray-50'
      + (active ? ' bg-gray-100 font-medium ring-1 ring-line' : '');
    b.innerHTML = `<span class="h-7 w-10 shrink-0 ${active ? 'text-primary' : 'text-sub'}">${previewSVG(layout)}</span><span>${label}</span>`;
    b.addEventListener('click', onClick);
    return b;
  }
  function selectWorking(id) {
    working = id;
    pattern = id;
    kind = 'map';
    editingDraft = null;
    saveState();
    renderInline();
    buildSidebar();
    selectTab(wsTab); // лишаємось на тій самій вкладці, оновлюємо вміст
  }

  /* ---------- Редактор ---------- */
  function renderEditor() {
    editorBoard.innerHTML = '';
    PRIZES.forEach((prize) => {
      const pos = editingDraft[prize.day];
      if (!pos) return;
      const cell = document.createElement('div');
      cell.className = 'ed-cell';
      cell.dataset.day = prize.day;
      cell.style.setProperty('--x', pos.x + '%');
      cell.style.setProperty('--y', pos.y + '%');
      cell.innerHTML = `<span>${prize.day}</span><span class="ed-cell__coord">${Math.round(pos.x)},${Math.round(pos.y)}</span>`;
      editorBoard.appendChild(cell);
    });
  }
  let drag = null;
  editorBoard.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.ed-cell');
    if (!cell) return;
    e.preventDefault();
    drag = { cell, day: +cell.dataset.day, badge: cell.querySelector('.ed-cell__coord') };
    cell.classList.add('is-dragging');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  });
  function onDragMove(e) {
    if (!drag) return;
    const rect = editorBoard.getBoundingClientRect();
    let x = clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 98);
    let y = clamp(((e.clientY - rect.top) / rect.height) * 100, 2, 98);
    if (snap) { const s = 2.5; x = Math.round(x / s) * s; y = Math.round(y / s) * s; }
    x = +x.toFixed(1); y = +y.toFixed(1);
    drag.cell.style.setProperty('--x', x + '%');
    drag.cell.style.setProperty('--y', y + '%');
    editingDraft[drag.day] = { x, y };
    drag.badge.textContent = `${Math.round(x)},${Math.round(y)}`;
  }
  function onDragEnd() {
    if (!drag) return;
    drag.cell.classList.remove('is-dragging');
    drag = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragEnd);
  }

  /* ---------- Прев'ю Desktop / Mobile ---------- */
  function pvCell(prize) {
    const el = document.createElement('div');
    el.className = 'pv-cell';
    el.textContent = prize.day;
    return el;
  }
  function renderPreview() {
    deviceWrap.className = 'device mx-auto w-fit device--' + device;
    pvTabs.forEach((t) => {
      const on = t.dataset.device === device;
      t.classList.toggle('bg-white', on);
      t.classList.toggle('shadow-sm', on);
      t.classList.toggle('text-ink', on);
      t.classList.toggle('text-sub', !on);
    });
    const layout = previewLayout;
    const el = previewBoard;
    el.innerHTML = ''; // прибрати клітинки попереднього патерну
    el.className = '';
    el.removeAttribute('style');
    const w = el.clientWidth || (device === 'mobile' ? 228 : 500);
    if (layout.type === 'grid') {
      const cols = device === 'mobile' ? 3 : (layout.cols || 6);
      el.className = 'board--pv-grid';
      el.style.display = 'grid';
      el.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      el.style.gap = '6px';
      const sorted = [...PRIZES].sort((a, b) => {
        const pa = layout.positions[a.day], pb = layout.positions[b.day];
        return pa.row - pb.row || pa.col - pb.col;
      });
      sorted.forEach((p) => el.appendChild(pvCell(p)));
    } else {
      el.className = 'board--pv-map';
      el.style.position = 'relative';
      // звичайна мапа заповнює екран пристрою; довга стрічка — вища за екран (скрол)
      el.style.height = layout.long
        ? (PRIZES.length * (device === 'mobile' ? 40 : 34)) + 'px'
        : '100%';
      // розмір призу залежить від обох вимірів поля → клітинки не налазять
      let size;
      if (layout.long) {
        size = device === 'mobile' ? 30 : 26;
      } else {
        const h = el.clientHeight || w * 0.6;
        const base = Math.min(w, h);
        size = device === 'mobile' ? base / 9 : base / 8;
      }
      size = Math.max(18, Math.round(size));
      el.style.setProperty('--pv-size', size + 'px');
      PRIZES.forEach((p) => {
        const pos = layout.positions[p.day];
        if (!pos) return;
        const c = pvCell(p);
        c.style.setProperty('--x', pos.x + '%');
        c.style.setProperty('--y', pos.y + '%');
        el.appendChild(c);
      });
    }
  }

  /* ---------- Дії ---------- */
  function saveOwn() {
    if (!editingDraft) return;
    customPositions = editingDraft;
    saveCustom();
    kind = 'map';
    pattern = 'custom';
    working = 'custom';
    editingDraft = null;
    saveState();
    renderInline();
    buildSidebar();
    selectTab('preview');
  }
  function copyCoords() {
    const pos = editingDraft || gridSeed(6);
    const lines = PRIZES.map((p) => `      ${p.day}: { x: ${pos[p.day].x}, y: ${pos[p.day].y} },`).join('\n');
    const text = `{\n  id: 'custom',\n  name: 'Custom',\n  type: 'free',\n  positions: {\n${lines}\n  },\n}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(null, () => window.prompt('Copy coordinates:', text));
    } else {
      window.prompt('Copy coordinates:', text);
    }
  }

  /* ---------- Слухачі ---------- */
  radios.forEach((r) => r.addEventListener('change', () => {
    if (r.value === 'grid') { kind = 'grid'; saveState(); renderInline(); }
    else { openConfig('preview'); }
  }));
  choosePatternBtn.addEventListener('click', () => openConfig('preview'));

  wsTabEdit.addEventListener('click', () => selectTab('edit'));
  wsTabPreview.addEventListener('click', () => selectTab('preview'));
  saveOwnBtn.addEventListener('click', saveOwn);
  clearCustomBtn.addEventListener('click', () => { editingDraft = gridSeed(6); renderEditor(); });
  copyCoordsBtn.addEventListener('click', copyCoords);
  snapToggle.addEventListener('change', () => {
    snap = snapToggle.checked;
    localStorage.setItem(K.snap, snap ? '1' : '0');
  });
  pvTabs.forEach((t) => t.addEventListener('click', () => { device = t.dataset.device; renderPreview(); }));

  /* ---------- Старт ---------- */
  if (!isValidSelection()) { pattern = PATTERNS[0].id; saveState(); } // підчистити старий патерн (wave/scatter)
  working = pattern;
  renderInline();
})();
