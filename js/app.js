(function () {
  'use strict';

  const { PRIZES, GRID, PATTERNS } = window.AdventData;

  const K = {
    kind: 'advent.kind',       // 'grid' | 'map'
    pattern: 'advent.pattern', // id патерну або 'custom'
    custom: 'advent.custom',
    snap: 'advent.snap',
  };

  // DOM — інлайн
  const radios = Array.from(document.querySelectorAll('input[name="kind"]'));
  const patternRow = document.getElementById('patternRow');
  const patternThumb = document.getElementById('patternThumb');
  const patternName = document.getElementById('patternName');
  const choosePatternBtn = document.getElementById('choosePatternBtn');

  // DOM — модалка
  const patternModal = document.getElementById('patternModal');
  const modalHeading = document.getElementById('modalHeading');
  const galleryView = document.getElementById('galleryView');
  const editorView = document.getElementById('editorView');
  const patternGrid = document.getElementById('patternGrid');
  const createOwnBtn = document.getElementById('createOwnBtn');
  const editorBoard = document.getElementById('editorBoard');
  const snapToggle = document.getElementById('snapToggle');
  const copyCoordsBtn = document.getElementById('copyCoordsBtn');
  const clearCustomBtn = document.getElementById('clearCustomBtn');
  const backBtn = document.getElementById('backBtn');
  const saveOwnBtn = document.getElementById('saveOwnBtn');

  // Стан
  let kind = localStorage.getItem(K.kind) === 'map' ? 'map' : 'grid';
  let pattern = localStorage.getItem(K.pattern) || PATTERNS[0].id;
  let customPositions = loadCustom();
  let snap = localStorage.getItem(K.snap) === '1';
  let draft = null; // робоча копія координат у редакторі

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
    return { id: 'custom', name: 'Custom', type: 'free', positions: customPositions || gridSeed(6) };
  }
  function patternById(id) { return PATTERNS.find((p) => p.id === id); }

  // Поточно обраний на мапі лейаут (для прев'ю)
  function selectedMapLayout() {
    if (pattern === 'custom' && customPositions) return customLayout();
    return patternById(pattern) || PATTERNS[0];
  }
  function isValidSelection() {
    return (pattern === 'custom' && !!customPositions) || !!patternById(pattern);
  }

  /* ---------- Прев'ю патерну (SVG-крапки) ---------- */
  function previewSVG(layout) {
    const w = 104, h = 68;
    let dots = '';
    PRIZES.forEach((p) => {
      const pos = layout.positions[p.day];
      if (!pos) return;
      const cx = (pos.x / 100) * w;
      const cy = (pos.y / 100) * h;
      dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="currentColor" />`;
    });
    return `<svg viewBox="0 0 ${w} ${h}">${dots}</svg>`;
  }

  /* ---------- Рендер інлайн-контролу ---------- */
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

  /* ---------- Модалка (загальне) ---------- */
  function openModal() { patternModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  function closeModal() { patternModal.style.display = 'none'; document.body.style.overflow = ''; }
  function showGallery() {
    editorView.hidden = true;
    galleryView.hidden = false;
    modalHeading.textContent = 'Choose pattern';
    createOwnBtn.textContent = customPositions ? 'Edit your layout' : 'Create your own';
    buildGallery();
  }
  function showEditor(headingText) {
    galleryView.hidden = true;
    editorView.hidden = false;
    modalHeading.textContent = headingText;
    snapToggle.checked = snap;
    renderEditor();
  }

  patternModal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close-pattern')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && patternModal.style.display === 'flex') closeModal(); });

  /* ---------- Галерея патернів ---------- */
  function buildGallery() {
    patternGrid.innerHTML = '';
    PATTERNS.forEach((p) => patternGrid.appendChild(patternCard(p.name, p, pattern === p.id, () => choosePattern(p.id))));
    if (customPositions) {
      patternGrid.appendChild(patternCard('Custom', customLayout(), pattern === 'custom', () => choosePattern('custom')));
    }
  }
  function patternCard(label, layout, active, onClick) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'preview group flex flex-col items-center gap-2 rounded-lg border border-line p-3 transition hover:border-primary'
      + (active ? ' pattern-card--active' : '');
    card.innerHTML = `<div class="h-16 w-full text-sub transition group-hover:text-primary">${previewSVG(layout)}</div>
      <span class="text-[13px]">${label}</span>`;
    card.addEventListener('click', onClick);
    return card;
  }
  function choosePattern(id) {
    kind = 'map';
    pattern = id;
    saveState();
    closeModal();
    renderInline();
  }

  /* ---------- Редактор (перетягування) ---------- */
  function openEditor(fromCustom) {
    draft = fromCustom && customPositions
      ? seedFrom(customLayout())
      : seedFrom(patternById(pattern) || GRID);
    showEditor(fromCustom && customPositions ? 'Edit layout' : 'Create your own');
  }
  function renderEditor() {
    editorBoard.innerHTML = '';
    PRIZES.forEach((prize) => {
      const pos = draft[prize.day];
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
    draft[drag.day] = { x, y };
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

  function saveOwn() {
    customPositions = draft;
    saveCustom();
    kind = 'map';
    pattern = 'custom';
    saveState();
    closeModal();
    renderInline();
  }

  function copyCoords() {
    const lines = PRIZES.map((p) => `      ${p.day}: { x: ${draft[p.day].x}, y: ${draft[p.day].y} },`).join('\n');
    const text = `{\n  id: 'custom',\n  name: 'Custom',\n  type: 'free',\n  positions: {\n${lines}\n  },\n}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(null, () => window.prompt('Copy coordinates:', text));
    } else {
      window.prompt('Copy coordinates:', text);
    }
  }

  /* ---------- Слухачі ---------- */
  radios.forEach((r) => r.addEventListener('change', () => {
    if (r.value === 'grid') {
      kind = 'grid';
      saveState();
      renderInline();
    } else {
      kind = 'map';
      saveState();
      renderInline();
      if (!isValidSelection()) { showGallery(); openModal(); } // ще нічого не обрано → одразу вибір
    }
  }));

  choosePatternBtn.addEventListener('click', () => { showGallery(); openModal(); });
  createOwnBtn.addEventListener('click', () => openEditor(!!customPositions));
  backBtn.addEventListener('click', showGallery);
  saveOwnBtn.addEventListener('click', saveOwn);
  clearCustomBtn.addEventListener('click', () => { draft = gridSeed(6); renderEditor(); });
  copyCoordsBtn.addEventListener('click', copyCoords);
  snapToggle.addEventListener('change', () => {
    snap = snapToggle.checked;
    localStorage.setItem(K.snap, snap ? '1' : '0');
  });

  /* ---------- Старт ---------- */
  if (!isValidSelection()) pattern = PATTERNS[0].id;
  renderInline();
})();
