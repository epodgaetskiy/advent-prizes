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
  const trunk = [[42, 92], [50, 95], [58, 92]];
  let t = 0;
  while (day <= PRIZES.length && t < trunk.length) {
    positions[day++] = { x: trunk[t][0], y: trunk[t][1] };
    t++;
  }
  // якщо ще лишились — рівномірно знизу
  let extra = 0;
  while (day <= PRIZES.length) {
    positions[day++] = { x: 15 + extra * 18, y: 88 };
    extra++;
  }
  return positions;
}

/* ----- допоміжне: «розкидані» координати (детерміновано) ----- */
function buildScatterPositions() {
  const positions = {};
  // псевдовипадкові, але фіксовані значення — щоб розкладка не «стрибала»
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  PRIZES.forEach((p) => {
    positions[p.day] = {
      x: 8 + rnd() * 84,
      y: 8 + rnd() * 84,
    };
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
    id: 'scatter',
    name: '✨ Розкидані',
    type: 'free',
    positions: buildScatterPositions(),
  },
  {
    id: 'wave',
    name: '🌊 Хвиля',
    type: 'free',
    positions: (() => {
      const positions = {};
      PRIZES.forEach((p, i) => {
        const x = 6 + (i / (PRIZES.length - 1)) * 88;
        const y = 50 + Math.sin(i / 1.6) * 34;
        positions[p.day] = { x, y };
      });
      return positions;
    })(),
  },
];

// Доступ із app.js
window.AdventData = { PRIZES, LAYOUTS };
