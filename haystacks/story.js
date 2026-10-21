/* 03 干草堆 · 时间 */
(() => {
const HAY = DATA.hay, QUIZ = DATA.hayQuiz;
const NOTES = {
  h02: '光从侧后方照来，草垛的影子是蓝紫色的。', h06: '正午的光又白又亮，连影子都是淡紫色的。', h05: '田里还绿着，草垛是金黄里带着粉。',
  h11: '天边发黄，远山发蓝，草垛暗成一团橙褐。', h01: '晨雾里的太阳把一切染成橙红，草垛只剩一个轮廓。', h03: '雪不是白的：受光的地方粉红，背光的地方蓝紫。',
  h15: '阴天没有影子，雪和天空是同一种灰白。', h04: '夕阳贴着地平线，雪地泛着蓝，草垛顶上一圈亮光。', h10: '雪化了，田里湿漉漉的，逆光给草垛镶上一圈金边。'
};
const files = HAY.map(h => ({ key: h.f, url: h.f + '.jpg', kb: 140, lazy: h.f !== 'h05' })).concat(QUIZ.map(q => ({ key: q.f, url: q.f + '.jpg', kb: 90, lazy: true })));
const viewOf = key => ({ src: key, cx: 0.5, cy: 0.5, z: 1, fit: 0.84, top: 0.2 });
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
  await scrub();
  await quiz();
  await ending();
}

/* 拖动时间：九幅画沿着一条时间线排开，拖到哪里，画面就渐变到哪里 */
async function scrub() {
  HAY.forEach(h => src(h.f));
  const ribbon = api.$('#ribbon'), cap = api.$('#cap'), N = HAY.length;
  ribbon.innerHTML = '<div class="bar">' + HAY.map((h, i) => `<button class="tick" type="button" style="left:${i / (N - 1) * 100}%" aria-label="${h.t}"></button>`).join('') + '<div class="sunmark"></div></div><div class="ends"><span>夏末</span><span>秋</span><span>冬</span><span>解冻</span></div>';
  const ticks = [...ribbon.querySelectorAll('.tick')], sun = ribbon.querySelector('.sunmark');
  let pos = 2, target = 2, shown = -1; const seen = new Set();
  ticks.forEach((b, i) => b.onclick = () => { target = i; });
  ribbon.classList.add('on');
  const setCap = i => {
    const h = HAY[i]; cap.innerHTML = `<div class="t">${h.t}</div><div class="m"><i>${h.fr}</i><br>${h.y} · ${h.where}</div><div class="n">${NOTES[h.f]}</div><div class="pal">${h.pal.map(p => `<span style="flex:${p[3]};background:rgb(${p[0]},${p[1]},${p[2]})"></span>`).join('')}</div>`;
    cap.classList.add('on');
  };
  const off = api.overlay((F, t) => {
    pos += (target - pos) * (api.reduce ? 1 : 0.12); if (Math.abs(target - pos) < 0.002) pos = target;
    const a = Math.floor(pos), b = Math.min(N - 1, a + 1), f = pos - a;
    F.fillStyle = '#111917'; F.fillRect(0, 0, api.SW, api.SH);
    const A = api.SRC[HAY[a].f], Bs = api.SRC[HAY[b].f];
    if (A) api.drawView(F, viewOf(HAY[a].f));
    if (Bs && f > 0.001) api.drawView(F, viewOf(HAY[b].f), null, f);
    sun.style.left = (pos / (N - 1) * 100) + '%';
    const near = Math.round(pos);
    if (Math.abs(pos - near) < 0.18) { if (near !== shown) { shown = near; setCap(near); } if (!seen.has(near)) { seen.add(near); ticks[near].classList.add('seen'); } }
  });
  await api.say(['同一堆干草，九种光。', api.coarse ? '左右拖动画面，让时间流过它。' : '左右拖动画面（或按 ← →），让时间流过它。'], 'bl');
  await api.sleep(1200); api.clearWords();
  let start = 0;
  api.drag = { start: () => { start = target; }, move: (x, y, dx) => { target = api.clamp(start + dx / (api.SW * 0.09), 0, N - 1); }, end: () => { target = Math.round(target); } };
  const key = e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { target = api.clamp(Math.round(target) + (e.key === 'ArrowRight' ? 1 : -1), 0, N - 1); e.preventDefault(); e.stopImmediatePropagation(); } };
  addEventListener('keydown', key, true);
  await new Promise(res => { const chk = setInterval(() => { if (seen.size >= N) { clearInterval(chk); res(); } }, 300); });
  await api.waitTap('九种光都看过了。点击画面继续');
  removeEventListener('keydown', key, true); api.drag = null;
  ribbon.classList.remove('on'); cap.classList.remove('on');
  const last = HAY[Math.round(pos)].f; api.show(viewOf(last)); off();
}

/* 只看颜色，猜时间 */
async function quiz() {
  const R = [
    { k: 'h12', q: '这是哪个季节？', o: ['夏末', '深冬', '初春'], a: 0, why: '金黄的麦茬，远处的树还是绿的。它的标题就叫《夏末，早晨》。' },
    { k: 'h07', q: '这是一天里的什么时候？', o: ['清晨', '正午', '深夜'], a: 0, why: '光很低，从侧面照过来，影子拉得很长，雪泛着粉色。它的标题是《雪景，早晨》。' },
    { k: 'h13', q: '雪地上那些大片的蓝色是什么？', o: ['草垛的影子，映着天空的蓝', '莫奈调错了颜色', '雪化成的水'], a: 0, why: '影子里没有直射的阳光，只有天空反射来的蓝光。莫奈画的是他看见的颜色，而不是“雪应该是白的”。' }
  ];
  await api.say(['现在考考你。', '只看颜色，猜猜画的是什么时候。'], 'tl');
  await api.waitTap(); api.clearWords();
  for (const r of R) {
    await src(r.k);
    await api.paintTo(viewOf(r.k));
    const qd = QUIZ.find(q => q.f === r.k);
    await api.ask(r.q, r.o, r.a);
    await api.sleep(500); api.closePanel();
    await api.say([r.why, { t: `莫奈《${qd.fr}》，${qd.y}，${qd.where}`, cls: 'small' }], 'tl', 1200);
    await api.waitTap(); api.clearWords();
  }
}

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
  await scrub(); await ending();
}
})();
