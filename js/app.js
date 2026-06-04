(function () {
  'use strict';

  const { PRIZES, LAYOUTS } = window.AdventData;
  const STORAGE_OPENED = 'advent.opened';
  const STORAGE_LAYOUT = 'advent.layout';

  const board = document.getElementById('board');
  const layoutControls = document.getElementById('layoutControls');
  const resetBtn = document.getElementById('resetBtn');

  // Модалка
  const modal = document.getElementById('modal');
  const modalDay = document.getElementById('modalDay');
  const modalImg = document.getElementById('modalImg');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');

  // Стан
  let opened = loadOpened();
  let currentLayout = loadLayout();

  const prizeByDay = Object.fromEntries(PRIZES.map((p) => [p.day, p]));

  /* ---------- Збереження ---------- */
  function loadOpened() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_OPENED) || '[]'));
    } catch (_) {
      return new Set();
    }
  }
  function saveOpened() {
    localStorage.setItem(STORAGE_OPENED, JSON.stringify([...opened]));
  }
  function loadLayout() {
    const saved = localStorage.getItem(STORAGE_LAYOUT);
    return LAYOUTS.find((l) => l.id === saved) || LAYOUTS[0];
  }

  /* ---------- «Сьогодні» (під час адвенту в грудні) ---------- */
  function todayDay() {
    const now = new Date();
    if (now.getMonth() === 11 && now.getDate() >= 1 && now.getDate() <= 24) {
      return now.getDate();
    }
    return null;
  }

  /* ---------- Кнопки варіантів ---------- */
  function renderControls() {
    layoutControls.innerHTML = '';
    LAYOUTS.forEach((layout) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (layout.id === currentLayout.id ? ' is-active' : '');
      btn.textContent = layout.name;
      btn.addEventListener('click', () => {
        currentLayout = layout;
        localStorage.setItem(STORAGE_LAYOUT, layout.id);
        renderControls();
        renderBoard();
      });
      layoutControls.appendChild(btn);
    });
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
        <div class="cell__face cell__front">
          <span class="cell__num">${prize.day}</span>
        </div>
        <div class="cell__face cell__back">
          <img src="${prize.image}" alt="${prize.title}" loading="lazy" />
        </div>
      </div>`;

    cell.addEventListener('click', () => onOpen(prize, cell));
    return cell;
  }

  function renderBoard() {
    board.innerHTML = '';
    const isGrid = currentLayout.type === 'grid';

    board.className = 'board ' + (isGrid ? 'board--grid' : 'board--free');

    if (isGrid) {
      board.style.setProperty('--cols', currentLayout.cols || 6);
      // У сітці порядок визначається row/col → сортуємо за (row, col)
      const sorted = [...PRIZES].sort((a, b) => {
        const pa = currentLayout.positions[a.day];
        const pb = currentLayout.positions[b.day];
        return pa.row - pb.row || pa.col - pb.col;
      });
      sorted.forEach((prize) => board.appendChild(createCell(prize)));
    } else {
      PRIZES.forEach((prize) => {
        const pos = currentLayout.positions[prize.day];
        if (!pos) return;
        const cell = createCell(prize);
        cell.style.setProperty('--x', pos.x + '%');
        cell.style.setProperty('--y', pos.y + '%');
        board.appendChild(cell);
      });
      sizeFreeCells();
    }
  }

  /* Розмір клітинок у вільному режимі — масштабується під ширину поля */
  function sizeFreeCells() {
    if (currentLayout.type !== 'free') return;
    const w = board.clientWidth || board.offsetWidth;
    // ~9 клітинок умовно по ширині; межі тримають їх читабельними
    const size = Math.max(58, Math.min(120, w / 8.5));
    board.style.setProperty('--cell-size', size + 'px');
  }

  /* ---------- Відкриття призу ---------- */
  let modalTimer = null;
  function onOpen(prize, cell) {
    const firstTime = !opened.has(prize.day);
    opened.add(prize.day);
    saveOpened();
    cell.classList.add('is-open');

    // Невелика затримка, щоб встигла програтись анімація перевертання
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

  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ---------- Скидання ---------- */
  resetBtn.addEventListener('click', () => {
    if (!confirm('Скинути всі відкриті віконця?')) return;
    opened = new Set();
    saveOpened();
    renderBoard();
  });

  /* ---------- Реакція на зміну розміру ---------- */
  let resizeRAF = null;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(sizeFreeCells);
  });

  /* ---------- Старт ---------- */
  renderControls();
  renderBoard();
})();
