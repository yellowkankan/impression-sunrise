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
  await puzzle();
  await cataract();
  await ending();
}

/* ---------- 游戏一：分不清上下的拼图 ----------
   画被切成 4 × 3 块，打乱位置，有的还上下颠倒。拖动交换位置，点一下翻转。 */
let dim = 0;
api.overlay(F => { if (dim > 0.01) { F.fillStyle = `rgba(17,25,23,${dim})`; F.fillRect(0, 0, api.SW, api.SH); } });
async function puzzle() {
  await api.say(['先拼一幅睡莲。', '画被切成了 12 块，打乱了位置，<em>有的还上下颠倒</em>。', { t: api.coarse ? '拖动一块到另一块上，两块交换；轻点一块，把它倒过来。' : '拖动一块到另一块上，两块交换；单击一块，把它倒过来。', cls: 'small' }], 'tl', 1200);
  await api.waitTap('点击画面，开始拼'); api.clearWords();
  dim = 0.86;
  const t0 = performance.now(); let moves = 0, hints = 0;
  await new Promise(done => {
    const C = 4, R = 3, n = C * R, im = api.IMG.l, pw = W / C, ph = H / R;
    const perm = [...Array(n).keys()], rot = Array(n).fill(0);
    do { perm.sort(() => Math.random() - 0.5); for (let i = 0; i < n; i++) rot[i] = Math.random() < 0.5 ? 1 : 0; } while (perm.filter((p, i) => p === i && !rot[p]).length > 2);
    const box = document.createElement('div'); box.id = 'puzzle'; api.stage.appendChild(box);
    box.addEventListener('pointerdown', e => e.stopPropagation());
    box.innerHTML = '<div class="board"></div><div class="bar"><button type="button" class="peek">按住看原画</button><button type="button" class="hint">提示一块</button></div>';
    const board = box.querySelector('.board'), peek = box.querySelector('.peek');
    const size = () => { const maxW = Math.min(innerWidth * 0.94, 900), maxH = innerHeight * (innerHeight < 500 ? 0.74 : 0.6), w = Math.min(maxW, maxH * W / H); board.style.width = w + 'px'; board.style.height = (w * H / W) + 'px'; };
    size(); addEventListener('resize', size);
    const cells = [];
    for (let s = 0; s < n; s++) { const c = document.createElement('div'); c.className = 'cell'; board.appendChild(c); cells.push(c); }
    const pieces = [];
    for (let p = 0; p < n; p++) {
      const cv = document.createElement('canvas'); cv.width = 320; cv.height = Math.round(320 * ph / pw); cv.className = 'piece';
      cv.getContext('2d').drawImage(im, (p % C) * pw, Math.floor(p / C) * ph, pw, ph, 0, 0, cv.width, cv.height);
      pieces.push(cv);
    }
    const render = () => { perm.forEach((p, s) => { const cv = pieces[p]; if (cv.parentNode !== cells[s]) cells[s].appendChild(cv); cv.classList.toggle('flip', !!rot[p]); cells[s].classList.toggle('good', p === s && !rot[p]); }); };
    render();
    const badge = () => api.badge(`${moves}<small>步 · 已对 ${perm.filter((p, i) => p === i && !rot[p]).length} / ${n}</small>`); badge();
    const check = () => { badge(); if (perm.every((p, i) => p === i && !rot[p])) finish(); };
    let drag = null;
    board.addEventListener('pointerdown', e => {
      const cell = e.target.closest('.cell'); if (!cell) return; const s = cells.indexOf(cell);
      drag = { s, x: e.clientX, y: e.clientY, moved: false, cv: pieces[perm[s]] }; try { board.setPointerCapture(e.pointerId); } catch (err) {}
    });
    board.addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; drag.cv.classList.add('lift'); }
      if (drag.moved) drag.cv.style.translate = `${dx}px ${dy}px`;
    });
    const up = e => {
      if (!drag) return; const d = drag; drag = null; d.cv.classList.remove('lift'); d.cv.style.translate = '';
      if (!d.moved) { rot[perm[d.s]] ^= 1; moves++; render(); check(); return; }
      const el = document.elementFromPoint(e.clientX, e.clientY), cell = el && el.closest && el.closest('.cell'), t = cells.indexOf(cell);
      if (t >= 0 && t !== d.s) { [perm[d.s], perm[t]] = [perm[t], perm[d.s]]; moves++; render(); check(); }
    };
    board.addEventListener('pointerup', up); board.addEventListener('pointercancel', () => { if (drag) { drag.cv.classList.remove('lift'); drag.cv.style.translate = ''; drag = null; } });
    const showPeek = on => box.classList.toggle('peeking', on);
    peek.addEventListener('pointerdown', () => showPeek(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => peek.addEventListener(ev, () => showPeek(false)));
    board.style.setProperty('--img', `url(${im.src})`);
    box.querySelector('.hint').onclick = () => {
      const s = perm.findIndex((p, i) => p !== i || rot[p]); if (s < 0) return;
      const want = perm.indexOf(s); [perm[s], perm[want]] = [perm[want], perm[s]]; rot[s] = 0; hints++; moves++; render(); check();
    };
    const finish = () => { box.classList.add('done'); setTimeout(() => { removeEventListener('resize', size); box.remove(); done(); }, 1300); };
  });
  const sec = Math.round((performance.now() - t0) / 1000); api.badge(null); dim = 0;
  await api.paintTo(FULL, { quick: true });
  await api.say([`拼好了！用了 ${Math.floor(sec / 60)} 分 ${sec % 60} 秒，${moves} 步${hints ? `，提示 ${hints} 次` : ''}。`, '是不是常常分不清哪一块是正的？', '因为这幅画里<em>没有天，没有岸，也没有地平线</em>，只有一片水面。那些蓝色和白色，是倒映在水里的天空和云。'], 'tl', 1500);
  await api.waitTap();
  layer = await api.image('real'); layerTarget = 1;
  await api.say(['把倒影都拿掉，只留下真东西：', '睡莲的叶子和花，只占画面的大约 <em>' + DATA.lilyRealPct + '%</em>。剩下的八成多，全是水和倒影。', { t: '比例由程序按颜色估算，只是个大概。', cls: 'small' }], 'tl', 1400);
  await api.waitTap(); layerTarget = 0; api.clearWords();
}

/* ---------- 游戏二：用晚年的眼睛调色 ----------
   画面蒙上一层白内障的黄。每轮要从五管颜料里挑出对的颜色；挑完拿掉滤镜，看看你挑的到底是什么。 */
function cat(c) { const [r, g, b] = c, l = 0.3 * r + 0.59 * g + 0.11 * b; return [l * 0.55 + r * 0.45 + 28, l * 0.5 + g * 0.42 + 8, (l * 0.4 + b * 0.25) * 0.75]; }
function cataractLayer() {
  const im = api.IMG.l, sw = 250, sh = Math.round(250 * H / W), small = api.mk(sw, sh), sx = small.getContext('2d');
  sx.drawImage(im, 0, 0, sw, sh);
  const c = api.mk(W, H), x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.drawImage(small, 0, 0, W, H);
  const id = x.getImageData(0, 0, W, H), d = id.data;
  for (let p = 0; p < d.length; p += 4) { const o = cat([d[p], d[p + 1], d[p + 2]]); d[p] = o[0]; d[p + 1] = o[1]; d[p + 2] = o[2]; }
  x.putImageData(id, 0, 0); return c;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function hsl(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l); const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0) * 255, f(8) * 255, f(4) * 255]; }
// 挑四个“在发黄的眼睛里看起来差不多、其实差很远”的颜色
function decoys(target) {
  const pool = []; for (let h = 0; h < 360; h += 12) for (const s of [30, 55, 80]) for (const l of [30, 45, 60, 72]) pool.push(hsl(h, s, l));
  const ct = cat(target), out = [];
  pool.filter(c => dist(c, target) > 95).sort((a, b) => dist(cat(a), ct) - dist(cat(b), ct)).forEach(c => { if (out.length < 4 && out.every(o => dist(o, c) > 70)) out.push(c); });
  return out;
}
async function cataract() {
  layer = cataractLayer(); layerA = 0; layerTarget = 1;
  await api.say(['晚年，莫奈的眼睛得了白内障。', '在他眼里，世界越来越黄、越来越模糊，蓝色几乎看不见了。', '现在，你就用他的眼睛来调色。'], 'tl', 1500);
  await api.waitTap(); api.clearWords();
  const S = api.SRC.l, ROUNDS = [
    { name: '水的蓝', c: S.avg(500, 250, 14) }, { name: '荷叶的绿', c: S.avg(685, 423, 8) }, { name: '睡莲花的粉红', c: S.avg(600, 435, 4) }];
  let right = 0;
  for (let r = 0; r < ROUNDS.length; r++) {
    const R = ROUNDS[r], opts = decoys(R.c).concat([R.c]).sort(() => Math.random() - 0.5), ans = opts.indexOf(R.c);
    layerTarget = 1; api.badge(`${right}<small>挑对 / ${ROUNDS.length} 管 · 第 ${r + 1} 轮</small>`);
    const pick = await swatches(`第 ${r + 1} 轮：挑出<em>${R.name}</em>`, opts.map(cat));
    layerTarget = 0; await api.sleep(300);
    revealSwatches(opts, ans, pick);
    if (pick === ans) right++;
    api.badge(`${right}<small>挑对 / ${ROUNDS.length} 管</small>`);
    await api.say([pick === ans ? '挑对了。' : '拿掉滤镜一看，你挑的其实是这个颜色。', pick === ans ? '不过你看，另外几管在他眼里几乎一模一样。' : '在发黄的眼睛里，它和真正的颜色几乎分不出来。'], 'tl', 900);
    await api.waitTap(r < ROUNDS.length - 1 ? '点击画面，下一轮' : '点击画面继续'); api.clearWords(); closeSwatches();
  }
  api.badge(null); layer = null;
  await api.say([`三轮里你挑对了 ${right} 管。`, '莫奈那时也一样分不清。据说他只能靠颜料管上的标签，和调色盘上固定的摆放位置来找颜色。', '那几年他的画越来越红、越来越暗。'], 'tl', 1500);
  await api.waitTap();
  await api.say(['1923 年，82 岁的他做了手术，重新看清了蓝色。', '他又回到池塘边，一直画到 1926 年去世。', { t: '游戏里的“白内障视角”只是示意，不是医学上的模拟。', cls: 'small' }], 'bl');
  await api.waitTap(); api.clearWords();
}
let sw = null;
function swatches(q, cols) {
  if (!sw) { sw = document.createElement('div'); sw.id = 'swatches'; api.stage.appendChild(sw); sw.addEventListener('pointerdown', e => e.stopPropagation()); }
  sw.innerHTML = `<div class="q">${q}</div><div class="tubes">${cols.map((c, i) => `<button type="button" aria-label="第 ${i + 1} 管"><i style="background:${api.rgba(c, 1)}"></i><span>${i + 1}</span></button>`).join('')}</div>`;
  sw.classList.add('on');
  return new Promise(res => sw.querySelectorAll('.tubes button').forEach((b, i) => b.onclick = () => { sw.querySelectorAll('button').forEach(x => x.disabled = true); b.classList.add('picked'); res(i); }));
}
function revealSwatches(real, ans, pick) {
  sw.querySelectorAll('.tubes button').forEach((b, i) => { b.querySelector('i').style.background = api.rgba(real[i], 1); b.classList.toggle('ans', i === ans); b.classList.toggle('wrong', i === pick && i !== ans); });
  sw.querySelector('.q').innerHTML += '　<small>滤镜已拿掉</small>';
}
function closeSwatches() { if (sw) sw.classList.remove('on'); }

async function ending() {
  await api.paintTo({ src: 'l', cx: 0.5, cy: 0.5, z: 1.25 });
  await api.say(['第一次世界大战结束后，他决定把一组巨大的睡莲送给国家。', '如今它们挂在巴黎橘园美术馆的两间椭圆形展厅里，把人整个围在中间。', '就像站在池塘里。'], 'bl', 1700);
  await api.waitTap();
  await api.say(['从一个港口的早晨，到一片池塘的水面。', '他追了一辈子的，始终是光。', { t: '图像来自一幅印刷复制品，画面上的印刷标记已去除，颜色可能与原作略有出入。', cls: 'small' }], 'c', 1600);
  const v = await api.endChoice(); api.clearWords();
  if (v === 'all') { location.reload(); return; }
  await api.paintTo(FULL); await puzzle(); await ending();
}
})();
