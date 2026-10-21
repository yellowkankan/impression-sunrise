/* 02 撑阳伞的女人 · 风与彩色的阴影 */
(() => {
const W = 1610, H = 2000;
const FULL = { src: 'p', cx: 0.5, cy: 0.5, z: 1, fit: 0.98 };
const api = Walk.start({
  no: '02', pageTitle: '走进《撑阳伞的女人》', label: '《撑阳伞的女人》互动漫游',
  title: '撑阳伞的女人', fr: 'Femme à l’ombrelle', ambience: 'wind', fogColor: [232, 238, 244],
  files: [{ key: 'p', url: 'parasol.jpg', low: 'parasol-m.jpg', kb: 560 }],
  prepare(api, IMG) { api.addSource('p', IMG.p, W, H, DATA.parasol); },
  run
});

/* 风：一群顺着笔触方向飘的细线，鼠标划过的地方会多起一阵 */
let windOn = false; const parts = [];
function spawn(x, y) { parts.push({ x, y, life: 0, max: 50 + Math.random() * 60, trail: [] }); if (parts.length > 220) parts.shift(); }
api.overlay((F, t, tr) => {
  if (!windOn || api.reduce) return;
  const s = api.SRC.p; if (!s) return;
  const x0 = Math.max(0, tr.ox), x1 = Math.min(api.SW, tr.ox + W * tr.k), y0 = Math.max(0, tr.oy), y1 = Math.min(api.SH, tr.oy + H * tr.k);
  for (let i = 0; i < 3; i++) spawn(x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0));
  F.lineCap = 'round';
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i], ix = (p.x - tr.ox) / tr.k, iy = (p.y - tr.oy) / tr.k;
    let a = s.ang(ix, iy); if (a == null) a = 0; let dx = Math.cos(a), dy = Math.sin(a); if (dx < 0) { dx = -dx; dy = -dy; }
    const sp = 2.2 * api.DPR; p.trail.push([p.x, p.y]); if (p.trail.length > 9) p.trail.shift();
    p.x += dx * sp + 0.6 * api.DPR; p.y += dy * sp; p.life++;
    if (p.life > p.max || p.x > x1 || p.x < x0 || p.y < y0 || p.y > y1) { parts.splice(i, 1); continue; }
    const c = s.col(ix, iy), fade = Math.sin(p.life / p.max * Math.PI);
    F.strokeStyle = api.rgba([c[0] + 70, c[1] + 70, c[2] + 70], (0.32 * fade).toFixed(3)); F.lineWidth = 2.2 * api.DPR;
    F.beginPath(); p.trail.forEach(([x, y], k) => k ? F.lineTo(x, y) : F.moveTo(x, y)); F.lineTo(p.x, p.y); F.stroke();
  }
});
api.onMove((x, y, dx, dy) => { if (windOn && Math.hypot(dx, dy) > 3) for (let i = 0; i < 2; i++) spawn(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40); });

const PLACES = [
  { name: '被风吹乱的面纱', x: 960, y: 390, rx: 120, ry: 130, lx: 1150, ly: 300, dot: 0, view: { src: 'p', cx: 0.6, cy: 0.19, z: 2.6 }, pos: 'bl', lines: [
    '风把她的面纱吹到了脸上。', '五官糊成一片，莫奈也没有去补清楚。', '他要画的不是卡米耶长什么样，<br>是这<em>一阵风</em>。'] },
  { name: '儿子让', x: 445, y: 1190, rx: 120, ry: 170, dot: 1, view: { src: 'p', cx: 0.28, cy: 0.6, z: 2.6 }, pos: 'br', lines: [
    '七八岁的让，戴着一顶草帽。', '他站在坡的另一边，只露出半个身子，所以看上去离我们更远。', '几笔肉色、几笔蓝灰，就是一个孩子的脸。'] },
  { name: '云', x: 330, y: 620, rx: 270, ry: 260, dot: 2, view: { src: 'p', cx: 0.2, cy: 0.3, z: 2.0 }, pos: 'br', lines: [
    '天空不是平涂的一层蓝。', '一笔笔白色的云带着刷子的痕迹，像被风推着往右跑。', '画布左边，有的地方连底色都露了出来。'] },
  { name: '草地', x: 760, y: 1700, rx: 430, ry: 210, lx: 600, ly: 1640, dot: 3, view: { src: 'p', cx: 0.45, cy: 0.86, z: 2.4 }, pos: 'tl', lines: [
    '草是一把一把扫上去的：绿、黄、紫、蓝。', '几乎每一笔的方向都不一样，像正被风吹得东倒西歪。', '那些亮黄色的小点，是野花。'] }
];

async function run(api) {
  api.dots(4);
  api.setFog(0.85, true, 0.02);
  api.paintTo(FULL, { from: 'black' });
  await api.say([{ t: '撑阳伞的女人', cls: 'title dark' }, { t: 'Femme à l’ombrelle', cls: 'fr dark' }, { t: '克劳德·莫奈，1875', cls: 'small dark' }], 'c nobg', 700);
  await api.waitTap('点击任意处，走上那片小坡　建议戴上耳机', true);
  api.soundOn(); windOn = true; api.setFog(0.85, false, 0.0015);
  await api.say([{ t: '1875 年夏天，巴黎近郊的阿让特伊。', cls: 'dark' }, { t: '起风了。', cls: 'dark' }, { t: api.coarse ? '用手指吹一阵风。' : '晃动鼠标，吹一阵风。', cls: 'dark small' }], 'c nobg', 1300);
  await new Promise(res => { const chk = setInterval(() => { if (api.fogCleared() > 0.4) { clearInterval(chk); api.onTap = null; api.hint(''); res(); } }, 200);
    setTimeout(() => { api.hint('点击画面继续'); api.onTap = () => { clearInterval(chk); api.onTap = null; api.hint(''); res(); }; }, 7000); });
  api.setFog(0, false, 0.02); api.clearWords(); await api.sleep(700);
  await api.say(['莫奈的妻子卡米耶，和七八岁的儿子让，走上一个长满野草的小坡。', '莫奈站在坡下，抬头画下了这一刻。', { t: '所以我们是仰着头看她的：她身后只有天空，像是站在云里。', cls: 'small' }], 'bl');
  await api.waitTap();
  api.clearWords();
  await api.explore(PLACES, { home: FULL, fog: 0, intro: ['画里有面纱、孩子、云和草地。', '点它们，凑近看看风留下的痕迹。'] });
  await dress();
  await ending();
}

/* 白裙子：点一点，看看到底是什么颜色 */
function colorName(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); let h = 0;
  if (d) { h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4); if (h < 0) h += 360; }
  if (s < 0.07 && l > 0.88) return ['纯白', 'white'];
  if (l < 0.35) return ['深色的阴影', 'dark'];
  if (h >= 190 && h < 236) return ['带蓝的白', 'blue'];
  if (h >= 236 && h < 330) return ['淡紫', 'violet'];
  if (h >= 30 && h < 75) return ['暖黄', 'yellow'];
  if (h >= 75 && h < 190) return ['带绿的灰', 'green'];
  return ['粉橙', 'pink'];
}
async function dress() {
  await new Promise(res => {
    api.setTargets([{ name: '白裙子', x: 930, y: 980, rx: 260, ry: 440, go: () => { api.setTargets([]); res(); } }]);
    api.say(['四处都看过了。', '最后一样，是她身上那条<em>白裙子</em>。'], 'bl');
    api.hint(api.coarse ? '点那条白裙子' : '找到那条白裙子，点它');
  });
  api.hint(''); api.clearWords();
  await api.paintTo({ src: 'p', cx: 0.58, cy: 0.5, z: 1.7 });
  await api.say(['她穿的是一条白裙子。', '真的是白色吗？'], 'bl');
  api.hint('点裙子上任意地方，看看那里到底是什么颜色');
  const found = new Set(); let taps = 0;
  await new Promise(res => {
    api.onTapAt = (ix, iy, sx, sy) => {
      const c = api.SRC.p.avg(ix, iy, 6), [name, key] = colorName(c);
      api.chip(sx, sy, c, name, key === 'yellow' || key === 'pink'); taps++;
      if (key !== 'dark') found.add(key);
      const left = Math.max(0, 4 - found.size);
      api.hint(left ? `已经找到 ${found.size} 种颜色，再点 ${left} 处不一样的` : '');
      if (!left || taps >= 9) { api.onTapAt = null; res(); }
    };
  });
  await api.sleep(1200); api.clearChips();
  await api.say(['整条“白裙子”上，几乎找不到纯白。', '我们统计了她衣服上最亮的那些地方：接近纯白的，不到 1%。', '向着太阳的一面偏暖黄；背光的一面偏蓝紫，那是天空映在阴影里的颜色。', { t: '这就是印象派说的“彩色的阴影”：阴影不是把颜色加黑，而是染上了周围的光。', cls: 'small' }], 'tl', 1700);
  await api.waitTap();
  api.clearWords();
}

async function ending() {
  await api.paintTo(FULL);
  await api.say(['四年后，1879 年，卡米耶病逝，只有 32 岁。', '1886 年，莫奈又画了两幅几乎一样的撑伞女人，模特换成了继女苏珊。', '这一次，画里人的脸都看不清。', { t: '那两幅现藏于巴黎奥赛博物馆。这一幅现藏于华盛顿美国国家美术馆，100 × 81 厘米。', cls: 'small' }], 'bl', 1700);
  await api.waitTap();
  await api.say(['他想留住的，是那一阵风，', '和风里的人。'], 'c', 1600);
  const v = await api.endChoice();
  api.clearWords();
  if (v === 'all') { location.reload(); return; }
  PLACES.forEach(p => { p.seen = false; }); api.dots(4);
  await api.explore(PLACES, { home: FULL, fog: 0, intro: ['再逛一逛：面纱、孩子、云和草地。'] });
  await ending();
}
})();
