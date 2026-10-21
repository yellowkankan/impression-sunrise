/* 04 睡莲 · 水与倒影 */
(() => {
const W = 1000, H = 645;
const FULL = { src: 'l', cx: 0.5, cy: 0.5, z: 1, fit: 1 };
const api = Walk.start({
  no: '04', pageTitle: '走进《睡莲》', label: '《睡莲》互动漫游', title: '睡莲', fr: 'Nymphéas', ambience: 'water', fogColor: [214, 224, 236],
  files: [{ key: 'l', url: 'lilies.jpg', kb: 190 }, { key: 'real', url: 'real.jpg', kb: 110, lazy: true }],
  prepare(api, IMG) { api.addSource('l', IMG.l, W, H, DATA.lilies); },
  run
});

/* 水波：鼠标或手指划过水面，荡开一圈圈涟漪 */
const rings = [];
api.onMove((x, y, dx, dy) => { if (Math.hypot(dx, dy) > 4 && (!rings.length || Math.hypot(rings[rings.length - 1].x - x, rings[rings.length - 1].y - y) > 30 * api.DPR)) rings.push({ x, y, r: 4, life: 0 }); });
api.overlay((F, t) => {
  if (api.reduce) return;
  if (Math.random() < 0.012) rings.push({ x: Math.random() * api.SW, y: api.SH * (0.3 + Math.random() * 0.7), r: 2, life: 0 });
  F.lineWidth = 1.6 * api.DPR;
  for (let i = rings.length - 1; i >= 0; i--) {
    const g = rings[i]; g.life++; g.r += 0.9 * api.DPR; const a = Math.max(0, 0.45 - g.life / 140);
    if (a <= 0) { rings.splice(i, 1); continue; }
    for (let k = 0; k < 2; k++) { const rr = g.r - k * 12 * api.DPR; if (rr <= 0) continue; F.strokeStyle = `rgba(236,242,250,${(a * (1 - k * 0.45)).toFixed(3)})`; F.beginPath(); F.ellipse(g.x, g.y, rr, rr * 0.34, 0, 0, Math.PI * 2); F.stroke(); }
  }
});

/* 按住时叠一层：只看实物，或者用晚年的眼睛看 */
let layer = null, layerA = 0, layerTarget = 0;
api.overlay(F => { layerA += (layerTarget - layerA) * 0.08; if (layer && layerA > 0.01) api.drawView(F, api.view, layer, layerA); });

async function run(api) {
  api.setFog(0.7, true, 0.02);
  api.paintTo(FULL, { from: 'black' });
  await api.say([{ t: '睡莲', cls: 'title dark' }, { t: 'Nymphéas', cls: 'fr dark' }, { t: '克劳德·莫奈，1906', cls: 'small dark' }], 'c nobg', 700);
  await api.waitTap('点击任意处，走到池塘边　建议戴上耳机', true);
  api.soundOn(); api.setFog(0.06, false, 0.008); api.clearWords(); await api.sleep(600);
  await api.say(['1883 年，莫奈搬到巴黎西北边的小村子吉维尼，在那里住到去世。', '十年后，他买下房子旁边的一块地，引来河水，挖了一个池塘，种满睡莲，还在上面架了一座日本式的小桥。', '接下来将近 30 年，他画了大约 250 幅睡莲。', { t: api.coarse ? '用手指划一划水面。' : '用鼠标划一划水面。', cls: 'small' }], 'bl', 1800);
  await api.waitTap();
  await upside();
  await realOrReflection();
  await cataract();
  await ending();
}

/* 哪边是上？把画整个倒过来 */
async function upside() {
  await api.say(['先看看：这幅画里，天在哪里？'], 'bl');
  await api.waitTap('点击画面，把画倒过来');
  const cvs = api.stage.querySelectorAll('canvas');
  cvs.forEach(c => { c.classList.add('spin'); c.style.transform = 'rotate(180deg)'; });
  api.clearWords(); await api.sleep(api.reduce ? 50 : 1500);
  await api.say(['倒过来，几乎看不出区别。', '因为画里没有天，没有岸，也没有地平线，只有一片水面。', '那些蓝色和白色，是倒映在水里的天空和云。'], 'bl');
  await api.waitTap('点击画面，把画转回来');
  cvs.forEach(c => { c.style.transform = ''; });
  api.clearWords(); await api.sleep(api.reduce ? 50 : 1500);
  cvs.forEach(c => c.classList.remove('spin'));
}

/* 实物还是倒影？点哪里，就告诉你那里是什么 */
const KIND = { F: ['睡莲花 · 实物', 'real'], P: ['睡莲叶 · 实物', 'real'], S: ['天空和云 · 倒影', 'sky'], W: ['水面，映着蓝天 · 倒影', 'sky'], T: ['岸边的树 · 倒影', 'tree'] };
async function realOrReflection() {
  await api.say(['你看到的东西，有多少是真的？', '点画面上任意地方：是睡莲本身，还是水里的倒影？'], 'tl');
  const found = new Set(), M = DATA.lilyMap;
  await new Promise(res => {
    api.onTapAt = (ix, iy, sx, sy) => {
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
      const ch = M.d[Math.min(M.h - 1, Math.floor(iy / H * M.h)) * M.w + Math.min(M.w - 1, Math.floor(ix / W * M.w))], [label, kind] = KIND[ch] || KIND.W;
      api.chip(sx, sy, api.SRC.l.avg(ix, iy, 4), label, kind === 'real'); found.add(kind);
      const need = ['real', 'sky', 'tree'].filter(k => !found.has(k)), names = { real: '真正的睡莲', sky: '天空的倒影', tree: '岸边树木的倒影' };
      api.hint(need.length ? `还没找到：${need.map(k => names[k]).join('、')}` : '');
      if (!need.length) { api.onTapAt = null; res(); }
    };
    api.hint('还没找到：真正的睡莲、天空的倒影、岸边树木的倒影');
  });
  await api.sleep(1000); api.clearChips();
  const realIm = await api.image('real'); layer = realIm;
  await api.say(['三种都找到了。'], 'tl');
  api.hint('按住画面不放，只看“真的东西”');
  let held = false;
  await new Promise(res => {
    api.onHold = down => {
      layerTarget = down ? 1 : 0;
      if (down && !held) { held = true; api.hint(''); api.say(['真正的睡莲叶和花，只占画面的大约 <em>' + DATA.lilyRealPct + '%</em>。', '剩下的八成多，全是水和倒影。', { t: '比例由程序按颜色估算，只是个大概。', cls: 'small' }], 'tl', 1200); }
      if (!down && held) { api.onHold = null; res(); }
    };
  });
  await api.sleep(600);
  await api.say(['莫奈越画越少画岸，越画越少画天。', '到最后，他只画水面：上面漂着的，和水里映着的。'], 'tl');
  await api.waitTap(); api.clearWords();
}

/* 晚年的眼睛：白内障让一切发黄、发糊（示意） */
function cataractLayer() {
  const im = api.IMG.l, sw = 250, sh = Math.round(250 * H / W), small = api.mk(sw, sh), sx = small.getContext('2d');
  sx.drawImage(im, 0, 0, sw, sh);
  const c = api.mk(W, H), x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.drawImage(small, 0, 0, W, H);
  const id = x.getImageData(0, 0, W, H), d = id.data;
  for (let p = 0; p < d.length; p += 4) { const r = d[p], g = d[p + 1], b = d[p + 2], l = 0.3 * r + 0.59 * g + 0.11 * b; d[p] = l * 0.55 + r * 0.45 + 28; d[p + 1] = l * 0.5 + g * 0.42 + 8; d[p + 2] = (l * 0.4 + b * 0.25) * 0.75; }
  x.putImageData(id, 0, 0); return c;
}
async function cataract() {
  layer = cataractLayer(); layerA = 0; layerTarget = 0;
  await api.say(['晚年，莫奈的眼睛得了白内障。', '在他眼里，世界越来越黄、越来越模糊，蓝色几乎看不见了。'], 'bl');
  api.hint('按住画面不放，用他晚年的眼睛看');
  await new Promise(res => { let held = false; api.onHold = down => { layerTarget = down ? 1 : 0; if (down) { held = true; api.hint(''); } else if (held) { api.onHold = null; res(); } }; });
  await api.sleep(700);
  await api.say(['1923 年，82 岁的他做了手术，重新看清了蓝色。', '他又回到池塘边，一直画到 1926 年去世。', { t: '“白内障视角”只是示意，不是医学上的模拟。', cls: 'small' }], 'bl');
  await api.waitTap(); api.clearWords(); layer = null;
}

async function ending() {
  await api.paintTo({ src: 'l', cx: 0.5, cy: 0.5, z: 1.25 });
  await api.say(['第一次世界大战结束后，他决定把一组巨大的睡莲送给国家。', '如今它们挂在巴黎橘园美术馆的两间椭圆形展厅里，把人整个围在中间。', '就像站在池塘里。'], 'bl', 1700);
  await api.waitTap();
  await api.say(['从一个港口的早晨，到一片池塘的水面。', '他追了一辈子的，始终是光。', { t: '图像来自一幅印刷复制品，画面上的印刷标记已去除，颜色可能与原作略有出入。', cls: 'small' }], 'c', 1600);
  const v = await api.endChoice(); api.clearWords();
  if (v === 'all') { location.reload(); return; }
  await api.paintTo(FULL); await realOrReflection(); await ending();
}
})();
