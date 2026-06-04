/**
 * Дані Адвент-календаря.
 *
 * PRIZES — список призів. Кожен приз має:
 *   day         — номер дня (1..24), він же підпис на дверцятах
 *   title       — назва призу (показується після відкриття)
 *   description — короткий опис
 *   image       — шлях до картинки призу (можна замінити своїм файлом у /images)
 *
 * LAYOUTS — варіанти РОЗКЛАДКИ призів. Перемикаються кнопками у шапці.
 *   Кожен варіант має:
 *     id    — унікальний ключ
 *     name  — підпис на кнопці
 *     type  — 'grid' (рівна сітка) або 'free' (вільні координати x/y у %)
 *     cols  — к-сть колонок (тільки для type:'grid')
 *     positions — координати для кожного дня:
 *        • для 'grid':  { day: { row, col } }   row/col починаються з 1
 *        • для 'free':  { day: { x, y } }       x/y у відсотках 0..100 (центр клітинки)
 *
 * Координати у відсотках роблять вільні розкладки адаптивними:
 * вони масштабуються разом із полем і однаково гарно лягають на десктоп і мобілку.
 */

const PRIZES = [
  { day: 1,  title: 'Знижка 10%',        description: 'Промокод на перше замовлення', image: 'images/prize-01.svg' },
  { day: 2,  title: 'Безкоштовна кава',  description: 'Будь-який напій у партнерів',  image: 'images/prize-02.svg' },
  { day: 3,  title: 'Стікерпак',         description: 'Набір фірмових стікерів',       image: 'images/prize-03.svg' },
  { day: 4,  title: 'Книга',             description: 'Електронна книга на вибір',     image: 'images/prize-04.svg' },
  { day: 5,  title: 'Знижка 15%',        description: 'На наступну покупку',           image: 'images/prize-05.svg' },
  { day: 6,  title: 'Плейліст',          description: 'Святковий музичний плейліст',   image: 'images/prize-06.svg' },
  { day: 7,  title: 'Шоколадка',         description: 'Солодкий подарунок',            image: 'images/prize-07.svg' },
  { day: 8,  title: 'Шпалери',           description: 'Набір шпалер на телефон',       image: 'images/prize-08.svg' },
  { day: 9,  title: 'Знижка 20%',        description: 'Лімітована пропозиція',         image: 'images/prize-09.svg' },
  { day: 10, title: 'Подвійні бали',     description: 'x2 бонуси на тиждень',          image: 'images/prize-10.svg' },
  { day: 11, title: 'Свічка',            description: 'Ароматична зимова свічка',      image: 'images/prize-11.svg' },
  { day: 12, title: 'Чашка',             description: 'Фірмова керамічна чашка',       image: 'images/prize-12.svg' },
  { day: 13, title: 'Знижка 25%',        description: 'На улюблену категорію',         image: 'images/prize-13.svg' },
  { day: 14, title: 'Листівка',          description: 'Персональна е-листівка',        image: 'images/prize-14.svg' },
  { day: 15, title: 'Шкарпетки',         description: 'Теплі новорічні шкарпетки',     image: 'images/prize-15.svg' },
  { day: 16, title: 'Брелок',            description: 'Святковий брелок',              image: 'images/prize-16.svg' },
  { day: 17, title: 'Знижка 30%',        description: 'Майже половина свята позаду',   image: 'images/prize-17.svg' },
  { day: 18, title: 'Печиво',            description: 'Імбирне печиво',                image: 'images/prize-18.svg' },
  { day: 19, title: 'Гірлянда',          description: 'LED-гірлянда',                  image: 'images/prize-19.svg' },
  { day: 20, title: 'Подарунок',         description: 'Сюрприз-бокс',                  image: 'images/prize-20.svg' },
  { day: 21, title: 'Знижка 40%',        description: 'Передсвяткова знижка',          image: 'images/prize-21.svg' },
  { day: 22, title: 'Іграшка',           description: 'Ялинкова прикраса',             image: 'images/prize-22.svg' },
  { day: 23, title: 'Дзвіночок',         description: 'Срібний дзвіночок',             image: 'images/prize-23.svg' },
  { day: 24, title: 'ГОЛОВНИЙ ПРИЗ',     description: 'Великий новорічний подарунок!', image: 'images/prize-24.svg' },
];

/* ----- допоміжне: рівна сітка row/col у порядку днів ----- */
function buildGridPositions(cols) {
  const positions = {};
  PRIZES.forEach((p, i) => {
    positions[p.day] = { row: Math.floor(i / cols) + 1, col: (i % cols) + 1 };
  });
  return positions;
}

/* ----- допоміжне: форма ялинки з вільних координат ----- */
// Рядки дерева: к-сть клітинок у кожному ярусі (зверху вниз) + стовбур.
const TREE_ROWS = [1, 2, 3, 4, 5, 6]; // 21 клітинка
function buildTreePositions() {
  const positions = {};
  let day = 1;
  const topY = 8;        // відступ зверху, %
  const rowGap = 13;     // крок між ярусами, %
  TREE_ROWS.forEach((count, r) => {
    const y = topY + r * rowGap;
    const spread = 10 + r * 13; // ширина ярусу, %
    for (let c = 0; c < count && day <= PRIZES.length; c++) {
      const x = count === 1 ? 50 : 50 - spread / 2 + (spread * c) / (count - 1);
      positions[day++] = { x, y };
    }
  });
  // решта днів — стовбур/подарунки під ялинкою
  const trunk = [[42, 88], [50, 90], [58, 88]];
  let t = 0;
  while (day <= PRIZES.length && t < trunk.length) {
    positions[day++] = { x: trunk[t][0], y: trunk[t][1] };
    t++;
  }
  let extra = 0;
  while (day <= PRIZES.length) {
    positions[day++] = { x: 18 + extra * 16, y: 86 };
    extra++;
  }
  return positions;
}

/* ----- допоміжне: «змійка» (бустрофедон) ----- */
// 3 горизонтальні смуги, напрямок чергується — як змійка.
function buildSnakePositions() {
  const cols = 8, rows = 3;
  const xL = 8, xR = 92, yT = 22, yB = 78;
  const positions = {};
  PRIZES.forEach((p, i) => {
    const r = Math.floor(i / cols);
    let c = i % cols;
    if (r % 2 === 1) c = cols - 1 - c; // непарні ряди — у зворотному напрямку
    const x = xL + (xR - xL) * (c / (cols - 1));
    const y = yT + (yB - yT) * (r / (rows - 1));
    positions[p.day] = { x: +x.toFixed(1), y: +y.toFixed(1) };
  });
  return positions;
}

const LAYOUTS = [
  {
    id: 'grid',
    name: '🔲 Сітка',
    type: 'grid',
    cols: 6,
    positions: buildGridPositions(6),
  },
  {
    id: 'tree',
    name: '🎄 Ялинка',
    type: 'free',
    positions: buildTreePositions(),
  },
  {
    id: 'snake',
    name: '🐍 Змійка',
    type: 'free',
    positions: buildSnakePositions(),
  },
  {
    id: 'long',
    name: '📜 Довга стрічка',
    type: 'free',
    long: true, // поле вище за екран → сторінка прокручується (реальний кейс)
    positions: (() => {
      const positions = {};
      const n = PRIZES.length;
      PRIZES.forEach((p, i) => {
        const y = +(((i + 0.5) / n) * 100).toFixed(1);   // рівномірно зверху вниз
        const x = +(50 + Math.sin(i * 0.9) * 34).toFixed(1); // звивиста стрічка
        positions[p.day] = { x, y };
      });
      return positions;
    })(),
  },
];

// Доступ із app.js
const GRID = LAYOUTS.find((l) => l.id === 'grid');
const PATTERNS = LAYOUTS.filter((l) => l.type === 'free');
window.AdventData = { PRIZES, GRID, PATTERNS };
