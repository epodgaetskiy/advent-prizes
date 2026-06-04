(function () {
  'use strict';

  const { PRIZES, LAYOUTS: PRESETS } = window.AdventData;
  const STORAGE_OPENED = 'advent.opened';
  const STORAGE_LAYOUT = 'advent.layout';
  const STORAGE_MODE = 'advent.mode';
  const STORAGE_CUSTOM = 'advent.custom';
  const STORAGE_SNAP = 'advent.snap';
  const CUSTOM_ID = 'custom';

  const board = document.getElementById('board');
  const layoutControls = document.getElementById('layoutControls');
  const resetBtn = document.getElementById('resetBtn');
  const modeToggle = document.getElementById('modeToggle');
  const editbar = document.getElementById('editbar');
  const snapToggle = document.getElementById('snapToggle');
  const copyCoordsBtn = document.getElementById('copyCoordsBtn');
  const clearCustomBtn = document.getElementById('clearCustomBtn');

  // Модалка
  const modal = document.getElementById('modal');
  const modalDay = document.getElementById('modalDay');
  const modalImg = document.getElementById('modalImg');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');

  // Стан
  let opened = loadOpened();
  let mode = localStorage.getItem(STORAGE_MODE) === 'edit' ? 'edit' : 'view';
  let snap = localStorage.getItem(STORAGE_SNAP) === '1';
  let customPositions = loadCustom();
  let currentLayoutId = loadLayoutId();

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- Збереження ---------- */
  function loadOpened() {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_OPENED) || '[]')); }
    catch (_) { return new Set(); }
  }
  function saveOpened() {
    localStorage.setItem(STORAGE_OPENED, JSON.stringify([...opened]));
  }
  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(STORAGE_CUSTOM)) || null; }
    catch (_) { return null; }
  }
  function saveCustom() {
    localStorage.setItem(STORAGE_CUSTOM, JSON.stringify(customPositions));
  }
  function loadLayoutId() {
    const saved = localStorage.getItem(STORAGE_LAYOUT);
    if (saved === CUSTOM_ID) return CUSTOM_ID;
    return PRESETS.find((l) => l.id === saved) ? saved : PRESETS[0].id;
  }

  /* ---------- Лейаути ---------- */
  // Рівна сітка → вільні координати (центри клітинок у %)
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

  // Будь-який лейаут → вільні координати (для «засіювання» мого лейауту)
  function seedFrom(layout) {
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
    return {
      id: CUSTOM_ID,
      name: '✏️ Мій лейаут',
      type: 'free',
      positions: customPositions || gridSeed(6),
    };
  }
  function getLayout(id) {
    if (id === CUSTOM_ID) return customLayout();
    return PRESETS.find((l) => l.id === id) || PRESETS[0];
  }
  function allLayouts() {
    return [...PRESETS, customLayout()];
  }

  /* ---------- «Сьогодні» (під час адвенту в грудні) ---------- */
  function todayDay() {
    const now = new Date();
    if (now.getMonth() === 11 && now.getDate() >= 1 && now.getDate() <= 24) return now.getDate();
    return null;
  }

  /* ---------- Перемикання режиму ---------- */
  function setMode(next) {
    if (next === 'edit') {
      // Якщо зараз обрано готовий пресет — «форкаємо» його у мій лейаут
      if (currentLayoutId !== CUSTOM_ID) {
        customPositions = seedFrom(getLayout(currentLayoutId));
        saveCustom();
        currentLayoutId = CUSTOM_ID;
        localStorage.setItem(STORAGE_LAYOUT, CUSTOM_ID);
      } else if (!customPositions) {
        customPositions = gridSeed(6);
        saveCustom();
      }
    }
    mode = next;
    localStorage.setItem(STORAGE_MODE, next);
    renderControls();
    renderBoard();
  }

  /* ---------- Кнопки керування ---------- */
  function renderControls() {
    layoutControls.innerHTML = '';
    allLayouts().forEach((layout) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (layout.id === currentLayoutId ? ' is-active' : '');
      btn.textContent = layout.name;
      btn.addEventListener('click', () => onPickLayout(layout));
      layoutControls.appendChild(btn);
    });

    modeToggle.textContent = mode === 'edit' ? '👁 Перегляд' : '✏️ Редагувати';
    modeToggle.classList.toggle('is-active', mode === 'edit');
    editbar.hidden = mode !== 'edit';
    snapToggle.checked = snap;
  }

  function onPickLayout(layout) {
    if (mode === 'edit' && layout.id !== CUSTOM_ID) {
      // У режимі редагування пресет = «взяти за основу»
      if (!confirm(`Взяти розкладку «${layout.name}» за основу? Поточний мій лейаут буде замінено.`)) return;
      customPositions = seedFrom(layout);
      saveCustom();
      currentLayoutId = CUSTOM_ID;
    } else {
      currentLayoutId = layout.id;
    }
    localStorage.setItem(STORAGE_LAYOUT, currentLayoutId);
    renderControls();
    renderBoard();
  }

  /* ---------- Клітинки ---------- */
  function createCell(prize) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.day = prize.day;
    cell.setAttribute('aria-label', `День ${prize.day}`);
    if (opened.has(prize.day)) cell.classList.add('is-open');
    if (todayDay() === prize.day) cell.classList.add('is-today');

    cell.innerHTML = `
      <div class="cell__inner">
        <div class="cell__face cell__front"><span class="cell__num">${prize.day}</span></div>
        <div class="cell__face cell__back"><img src="${prize.image}" alt="${prize.title}" loading="lazy" /></div>
      </div>
      <span class="cell__coord"></span>`;

    cell.addEventListener('click', () => { if (mode !== 'edit') onOpen(prize, cell); });
    return cell;
  }

  function renderBoard() {
    board.innerHTML = '';
    const layout = getLayout(currentLayoutId);
    const isGrid = layout.type === 'grid';

    board.className = 'board ' + (isGrid ? 'board--grid' : 'board--free')
      + (layout.long ? ' board--long' : '')
      + (mode === 'edit' ? ' is-edit' : '');

    // Довга стрічка: явно задаємо висоту поля більшу за екран → з'являється прокрутка
    if (layout.long) {
      board.style.height = Math.max(PRIZES.length * 120, window.innerHeight * 2.2) + 'px';
    } else {
      board.style.height = '';
    }

    if (isGrid) {
      board.style.setProperty('--cols', layout.cols || 6);
      const sorted = [...PRIZES].sort((a, b) => {
        const pa = layout.positions[a.day], pb = layout.positions[b.day];
        return pa.row - pb.row || pa.col - pb.col;
      });
      sorted.forEach((prize) => board.appendChild(createCell(prize)));
    } else {
      PRIZES.forEach((prize) => {
        const pos = layout.positions[prize.day];
        if (!pos) return;
        const cell = createCell(prize);
        cell.style.setProperty('--x', pos.x + '%');
        cell.style.setProperty('--y', pos.y + '%');
        const badge = cell.querySelector('.cell__coord');
        badge.textContent = `${Math.round(pos.x)},${Math.round(pos.y)}`;
        board.appendChild(cell);
      });
      sizeFreeCells();
    }
  }

  /* Розмір клітинок у вільному режимі — масштабується під ширину поля */
  function sizeFreeCells() {
    if (getLayout(currentLayoutId).type !== 'free') return;
    const w = board.clientWidth || board.offsetWidth;
    const size = Math.max(58, Math.min(120, w / 8.5));
    board.style.setProperty('--cell-size', size + 'px');
  }

  /* ---------- Перетягування (режим редагування) ----------
     Делегування на рівні board + глобальні слухачі move/up,
     щоб перетягування не «зривалось» при швидкому русі. */
  let drag = null; // { cell, day, badge, moved }

  function onDragStart(e) {
    if (mode !== 'edit') return;
    const cell = e.target.closest('.cell');
    if (!cell || !board.contains(cell)) return;
    e.preventDefault();
    drag = {
      cell,
      day: +cell.dataset.day,
      badge: cell.querySelector('.cell__coord'),
      moved: false,
    };
    cell.classList.add('is-dragging');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  }

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

  board.addEventListener('pointerdown', onDragStart);

  /* ---------- Відкриття призу (режим перегляду) ---------- */
  let modalTimer = null;
  function onOpen(prize, cell) {
    const firstTime = !opened.has(prize.day);
    opened.add(prize.day);
    saveOpened();
    cell.classList.add('is-open');
    clearTimeout(modalTimer);
    modalTimer = setTimeout(() => showModal(prize), firstTime ? 420 : 120);
  }

  function showModal(prize) {
    modalDay.textContent = `День ${prize.day}`;
    modalImg.src = prize.image;
    modalImg.alt = prize.title;
    modalTitle.textContent = prize.title;
    modalDesc.textContent = prize.description || '';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* ---------- Тост ---------- */
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
  }

  /* ---------- Дії панелі редагування ---------- */
  function copyCoords() {
    const pos = customPositions || gridSeed(6);
    const lines = PRIZES.map((p) => {
      const c = pos[p.day];
      return `      ${p.day}: { x: ${c.x}, y: ${c.y} },`;
    }).join('\n');
    const text = `{\n  id: 'custom',\n  name: 'Мій лейаут',\n  type: 'free',\n  positions: {\n${lines}\n  },\n}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast('Координати скопійовано в буфер 📋'),
        () => window.prompt('Скопіюй координати (Ctrl/Cmd+C):', text)
      );
    } else {
      window.prompt('Скопіюй координати (Ctrl/Cmd+C):', text);
    }
  }

  /* ---------- Слухачі панелей ---------- */
  modeToggle.addEventListener('click', () => setMode(mode === 'edit' ? 'view' : 'edit'));

  snapToggle.addEventListener('change', () => {
    snap = snapToggle.checked;
    localStorage.setItem(STORAGE_SNAP, snap ? '1' : '0');
  });

  copyCoordsBtn.addEventListener('click', copyCoords);

  clearCustomBtn.addEventListener('click', () => {
    if (!confirm('Очистити мій лейаут і вирівняти призи в сітку?')) return;
    customPositions = gridSeed(6);
    saveCustom();
    renderBoard();
    toast('Мій лейаут вирівняно в сітку');
  });

  resetBtn.addEventListener('click', () => {
    if (opened.size === 0) { toast('Немає відкритих віконець 🤷'); return; }
    // confirm може бути заблокований у деяких браузерах — тоді просто скидаємо
    let ok = true;
    try { ok = window.confirm('Скинути всі відкриті віконця?'); } catch (_) { ok = true; }
    if (!ok) return;
    opened = new Set();
    saveOpened();
    closeModal();
    renderBoard();
    toast('Прогрес скинуто 🔄');
  });

  let resizeRAF = null;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(() => {
      const layout = getLayout(currentLayoutId);
      if (layout.long) {
        board.style.height = Math.max(PRIZES.length * 120, window.innerHeight * 2.2) + 'px';
      }
      sizeFreeCells();
    });
  });

  /* ---------- Старт ---------- */
  // У режимі редагування завжди працюємо з «моїм лейаутом»
  if (mode === 'edit') {
    currentLayoutId = CUSTOM_ID;
    if (!customPositions) { customPositions = gridSeed(6); saveCustom(); }
  }
  renderControls();
  renderBoard();
})();
