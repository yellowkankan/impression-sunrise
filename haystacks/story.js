/* 03 干草堆 · 时间 */
(() => {
const HAY = DATA.hay, QUIZ = DATA.hayQuiz;
const NOTES_UNUSED = {
  h02: '光从侧后方照来，草垛的影子是蓝紫色的。', h06: '正午的光又白又亮，连影子都是淡紫色的。', h05: '田里还绿着，草垛是金黄里带着粉。',
  h11: '天边发黄，远山发蓝，草垛暗成一团橙褐。', h01: '晨雾里的太阳把一切染成橙红，草垛只剩一个轮廓。', h03: '雪不是白的：受光的地方粉红，背光的地方蓝紫。',
  h15: '阴天没有影子，雪和天空是同一种灰白。', h04: '夕阳贴着地平线，雪地泛着蓝，草垛顶上一圈亮光。', h10: '雪化了，田里湿漉漉的，逆光给草垛镶上一圈金边。'
};
const files = HAY.map(h => ({ key: h.f, url: h.f + '.jpg', kb: 140, lazy: h.f !== 'h05' })).concat(QUIZ.map(q => ({ key: q.f, url: q.f + '.jpg', kb: 90, lazy: true })));
const viewOf = key => ({ src: key, cx: 0.5, cy: 0.5, z: 1, fit: 0.84, top: 0.2 });
const gameView = key => ({ src: key, cx: 0.5, cy: 0.5, z: 1, fit: 0.72, lift: 0.1, top: 0.14 });
const api = Walk.start({
  no: '03', pageTitle: '走进《干草堆》', label: '《干草堆》系列互动漫游', title: '干草堆', fr: 'Meules', ambience: 'wind', fogColor: [236, 230, 214],
  files,
  prepare(api, IMG) { const h = HAY.find(x => x.f === 'h05'); api.addSource('h05', IMG.h05, h.o.W, h.o.H, h.o); },
  run
});
async function src(key) {
  if (api.SRC[key]) return api.SRC[key];
  const im = await api.image(key); if (!im) return null;
  const h = HAY.find(x => x.f === key); return h ? api.addSource(key, im, h.o.W, h.o.H, h.o) : api.addSource(key, im, im.naturalWidth, im.naturalHeight, null);
}

async function run(api) {
  api.setFog(0.75, true, 0.02);
  api.paintTo(viewOf('h05'), { from: 'black' });
  await api.say([{ t: '干草堆', cls: 'title dark' }, { t: 'Meules', cls: 'fr dark' }, { t: '克劳德·莫奈，1890–1891', cls: 'small dark' }], 'c nobg', 700);
  await api.waitTap('点击任意处，走进吉维尼的田野　建议戴上耳机', true);
  api.soundOn(); api.setFog(0.08, false, 0.01); api.clearWords(); await api.sleep(600);
  await api.say(['1890 年夏末，吉维尼。', '莫奈家门外的田里，堆着收割后的麦秆垛。', '他开始画它们，然后发现自己停不下来。'], 'tl');
  await api.waitTap();
  await api.say(['据他晚年回忆：一开始只带了两块画布，一块画阴天，一块画晴天。', '光一变，就让继女布兰奇回家再拿一块。', '然后，又一块。'], 'tl');
  await api.waitTap();
  api.clearWords();
  await grab();
  await guess();
  await ending();
}

/* ---------- 游戏一：抢光 ----------
   光一直在变（九幅画按时间顺序不停地渐变），田边立着三块画布，每块等着一种光。
   光对上哪块，就赶紧点它；点错、错过都会用掉一块画布。 */
const circ = (a, b, n) => { let d = ((a - b) % n + n) % n; return d > n / 2 ? d - n : d; };
async function grab() {
  await api.say(['现在，你就是莫奈。', '田边立着三块画布，每块等着一种光。光一直在变：<em>光对上哪块画布，就赶紧点它。</em>', { t: '点错了，或者让对的光溜走，都会浪费一块画布。画满 6 幅就算赢。', cls: 'small' }], 'tl', 1300);
  const ready = Promise.all(HAY.map(h => src(h.f)));
  await api.waitTap('点击画面，开始'); api.clearWords(); await ready;
  for (;;) {
    const r = await grabRound();
    if (r.win) { await grabResult(r); return; }
    await api.say([`画布用完了。你画好了 ${r.caught} 幅。`], 'tl');
    const again = await api.ask('再来一次？', ['再来一次', '不了，往下走'], -1, true);
    api.closePanel(); api.clearWords();
    if (again !== 0) { await grabResult(r); return; }
  }
}
function grabRound() {
  return new Promise(resolve => {
    const N = HAY.length, WIN = 0.38, GOAL = 6; let pos = Math.random() * N, speed = 0.42, caught = 0, lives = 3, score = 0, over = false;
    const order = HAY.map((_, i) => i).sort(() => Math.random() - 0.5); let qi = 0;
    const slots = [null, null, null];
    const next = () => { for (let n = 0; n < 40; n++) { const k = order[qi++ % N]; if (!slots.some(s => s && s.k === k)) return k; } return 0; };
    const box = document.createElement('div'); box.id = 'easels'; api.stage.appendChild(box);
    box.addEventListener('pointerdown', e => e.stopPropagation());
    const badge = () => api.badge(`${caught}<small>已画 / ${GOAL} 幅 · 画布 ${'◆'.repeat(Math.max(0, lives))}${'◇'.repeat(3 - Math.max(0, lives))}</small>`);
    const fill = i => {
      const k = next(), h = HAY[k], el = document.createElement('button'); el.type = 'button'; el.className = 'easel';
      el.innerHTML = `<span class="pal">${h.pal.map(p => `<i style="flex:${p[3]};background:rgb(${p[0]},${p[1]},${p[2]})"></i>`).join('')}</span><b>${h.t}</b><em></em>`;
      el.onclick = () => tap(i);
      if (slots[i]) slots[i].el.replaceWith(el); else box.appendChild(el);
      slots[i] = { k, el, inWin: false };
    };
    const flash = (i, msg, cls) => { const s = slots[i], em = s.el.querySelector('em'); em.textContent = msg; s.el.classList.remove('ok', 'bad'); void s.el.offsetWidth; s.el.classList.add(cls); };
    const lose = (i, msg) => { lives--; flash(i, msg, 'bad'); badge(); if (lives <= 0) end(false); };
    const tap = i => {
      if (over) return; const s = slots[i], d = Math.abs(circ(pos, s.k, N));
      if (d <= WIN) {
        const pts = Math.round(60 + 140 * (1 - d / WIN)); score += pts; caught++; speed += 0.05; s.inWin = false; s.done = true;
        flash(i, d < WIN / 3 ? `正好！+${pts}` : `画好了 +${pts}`, 'ok'); badge();
        const el = s.el; setTimeout(() => { if (!over && slots[i] && slots[i].el === el) fill(i); }, 700);
        if (caught >= GOAL) end(true);
      } else lose(i, '光还不对');
    };
    const end = win => { if (over) return; over = true; setTimeout(() => { off(); box.remove(); api.badge(null); api.show(viewOf(HAY[Math.floor(pos) % N].f)); resolve({ win, caught, score }); }, 900); };
    [0, 1, 2].forEach(fill); badge();
    let last = performance.now();
    const off = api.overlay((F, t) => {
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t; if (!over) pos = (pos + speed * dt) % N;
      const a = Math.floor(pos) % N, b = (a + 1) % N, f = pos - Math.floor(pos);
      F.fillStyle = '#111917'; F.fillRect(0, 0, api.SW, api.SH);
      api.drawView(F, gameView(HAY[a].f)); if (f > 0.001) api.drawView(F, gameView(HAY[b].f), null, f);
      if (over) return;
      slots.forEach((s, i) => { if (!s || s.done) return; const d = circ(pos, s.k, N); if (Math.abs(d) <= WIN) s.inWin = true; else if (s.inWin && d > WIN) { s.inWin = false; lose(i, '错过了'); } });
    });
  });
}
async function grabResult(r) {
  await api.say([r.win ? `六幅都画好了，得分 <em>${r.score}</em>。` : `你画好了 ${r.caught} 幅。`, '这就是莫奈在田边的一天：几块画布轮流支在架子上，光对上哪一块，就接着画哪一块。', { t: '一个秋冬，他就这样画出了二十几幅干草堆。', cls: 'small' }], 'tl', 1400);
  await api.waitTap(); api.clearWords();
}

/* ---------- 游戏二：猜时间 ----------
   每轮一幅干草堆：把太阳拖到你觉得的时刻，再选季节。只用标题里写明了时间的画。 */
const GUESS = [
  { k: 'h02', t: 0.22, s: ['夏末', '秋'], name: '早晨', clue: '光从侧后方斜斜地照来，影子拉得很长，还是蓝紫色的：早上的太阳还很低。' },
  { k: 'h06', t: 0.5, s: ['夏末', '秋'], name: '正午', clue: '影子缩成短短一小块，整片田都晒得发白：太阳快到头顶了。' },
  { k: 'h11', t: 0.88, s: ['秋'], name: '秋日，一天将尽', clue: '天边一抹黄，远山已经暗下来，草垛背着光：一天快结束了。' },
  { k: 'h03', t: 0.22, s: ['冬'], name: '雪景，早晨', clue: '雪受光的地方泛粉，影子是长长的蓝紫色：清晨的太阳还很低。' },
  { k: 'h04', t: 0.92, s: ['冬'], name: '雪景，日落', clue: '天边烧成橙红，太阳贴着地平线：日落。' },
  { k: 'h10', t: 0.9, s: ['解冻'], name: '解冻，日落', clue: '雪化了，地面湿漉漉地反着光，太阳在背后落下。' },
  { k: 'h12', t: 0.25, s: ['夏末'], name: '夏末，早晨', clue: '金黄的麦茬，树还绿着，空气里浮着一层晨雾。' },
  { k: 'h07', t: 0.22, s: ['冬'], name: '雪景，早晨', clue: '低低的阳光把雪染成粉色，草垛的影子又长又蓝。' }
];
const SEASONS = ['夏末', '秋', '冬', '解冻'];
const clock = t => { const m = Math.round((6 + t * 12) * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
async function guess() {
  await api.say(['第二个游戏：猜时间。', '只看光和颜色，猜猜每一幅画的是一天里的几点、一年里的哪个季节。', { t: '一共 5 轮，每轮满分 1000。', cls: 'small' }], 'tl', 1300);
  await api.waitTap(); api.clearWords();
  await Promise.all(GUESS.map(g => src(g.k)));
  const rounds = GUESS.slice().sort(() => Math.random() - 0.5).slice(0, 5); let total = 0;
  for (let r = 0; r < rounds.length; r++) {
    const g = rounds[r]; api.badge(`${total}<small>第 ${r + 1} / 5 轮</small>`);
    await api.paintTo(Object.assign(viewOf(g.k), { fit: 0.66, lift: 0.14, top: 0.12 }), { quick: true });
    const { t, season } = await guessPanel();
    const dt = Math.abs(t - g.t), tp = Math.max(0, Math.round(600 * (1 - dt / 0.45))), sp = g.s.includes(season) ? 400 : 0, pts = tp + sp; total += pts;
    api.badge(`${total}<small>第 ${r + 1} / 5 轮 · +${pts}</small>`);
    showAnswer(g.t);
    const meta = HAY.find(h => h.f === g.k) || QUIZ.find(q => q.f === g.k);
    await api.say([`答案：${g.name}，约 ${clock(g.t)}，${g.s[0]}。你猜的是 ${clock(t)}，${season}。<em>+${pts}</em>`, g.clue, { t: `莫奈《${meta.fr}》，${meta.y}，${meta.where}`, cls: 'small' }], 'tl', 1100);
    await api.waitTap(r < rounds.length - 1 ? '点击画面，下一幅' : '点击画面，看总分'); api.clearWords(); hidePanel();
  }
  api.badge(null);
  const title = total >= 4000 ? '光的猎手' : total >= 2600 ? '莫奈的学徒' : '刚到吉维尼的游客';
  await api.say([`总分 <em>${total}</em> / 5000。`, `你的称号：<em>${title}</em>。`, total >= 4000 ? '你已经能从颜色里读出时间了，就像莫奈一样。' : '诀窍是看影子：影子越长、越蓝，太阳就越低。'], 'tl', 1200);
  await api.waitTap(); api.clearWords();
}
let gp = null;
function guessPanel() {
  if (!gp) { gp = document.createElement('div'); gp.id = 'guess'; api.stage.appendChild(gp); gp.addEventListener('pointerdown', e => e.stopPropagation()); }
  gp.innerHTML = `<div class="sky"><div class="arc"></div><div class="ans"></div><div class="sun" tabindex="0" role="slider" aria-label="一天中的时刻"></div><span class="l">清晨</span><span class="m">正午</span><span class="r">黄昏</span><div class="time"></div></div>
    <div class="seasons">${SEASONS.map(s => `<button type="button">${s}</button>`).join('')}</div><button type="button" class="go" disabled>先选季节</button>`;
  gp.classList.add('on');
  const sky = gp.querySelector('.sky'), sun = gp.querySelector('.sun'), timeEl = gp.querySelector('.time'), go = gp.querySelector('.go'); let t = 0.5, season = null;
  const place = () => { sun.style.left = (t * 100) + '%'; sun.style.top = ((1 - Math.sin(Math.PI * t)) * 70 + 8) + '%'; timeEl.textContent = clock(t); };
  const fromEvent = e => { const r = sky.getBoundingClientRect(); t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); place(); };
  let dragging = false;
  sky.addEventListener('pointerdown', e => { dragging = true; try { sky.setPointerCapture(e.pointerId); } catch (err) {} fromEvent(e); });
  sky.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
  sky.addEventListener('pointerup', () => { dragging = false; });
  sun.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { t = Math.max(0, Math.min(1, t + (e.key === 'ArrowRight' ? 0.03 : -0.03))); place(); e.preventDefault(); e.stopPropagation(); } });
  place();
  return new Promise(res => {
    gp.querySelectorAll('.seasons button').forEach(b => b.onclick = () => { season = b.textContent; gp.querySelectorAll('.seasons button').forEach(x => x.classList.toggle('on', x === b)); go.disabled = false; go.textContent = '就是这个时候'; });
    go.onclick = () => { go.disabled = true; gp.querySelectorAll('button').forEach(b => b.disabled = true); res({ t, season }); };
  });
}
function showAnswer(t) { const a = gp.querySelector('.ans'); a.style.left = (t * 100) + '%'; a.style.top = ((1 - Math.sin(Math.PI * t)) * 70 + 8) + '%'; a.classList.add('on'); }
function hidePanel() { if (gp) gp.classList.remove('on'); }

async function ending() {
  const ims = await Promise.all(HAY.map(h => api.image(h.f)));
  const c = api.mk(1500, 1000), x = c.getContext('2d'); x.fillStyle = '#1a2321'; x.fillRect(0, 0, 1500, 1000);
  ims.forEach((im, i) => { if (!im) return; const cw = 480, ch = 316, gx = 15 + (i % 3) * 490, gy = 18 + Math.floor(i / 3) * 326, s = Math.min(cw / im.naturalWidth, ch / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; x.drawImage(im, gx + (cw - w) / 2, gy + (ch - h) / 2, w, h); });
  api.addSource('grid', c, 1500, 1000, null);
  await api.paintTo({ src: 'grid', fit: 0.94, top: 0.12 });
  await api.say(['1891 年 5 月，画商迪朗-吕埃尔把其中 15 幅挂在一起展出，很快就被买光了。', '人们第一次在同一间屋子里，看见了<em>时间</em>。'], 'bl', 1600);
  await api.waitTap();
  await api.say([{ t: '« l’instantanéité, surtout l’enveloppe, la même lumière répandue partout »', cls: 'fr' }, '“瞬间，尤其是包裹着一切的那层空气，同一种光洒满每一处。”', { t: '莫奈写给朋友杰弗鲁瓦的信，1890 年 10 月。这就是他画这一系列时想抓住的东西。', cls: 'small' }], 'bl', 1600);
  const v = await api.endChoice(); api.clearWords();
  if (v === 'all') { location.reload(); return; }
  await guess(); await ending();
}
})();
