/* 画中漫游引擎：笔触转场、晨雾、文字、在画里点选、声音、加载进度。
   每幅作品的页面调用 Walk.start({...})，再在 run(api) 里写自己的故事。 */
(function () {
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const DPR = Math.min(1.5, window.devicePixelRatio || 1);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rgba = (c, a) => `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${a})`;
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOW = Math.max(innerWidth, innerHeight) * DPR < 1700;
/* 中文排版：只在词与词之间换行；人名、日期、时间、尺寸不拆开 */
const tidy = (() => {
  const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('zh', { granularity: 'word' }) : null;
  const KEEP = /(\d{4}\s*年(?:\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?)?|\d{1,2}\s*月\s*\d{1,2}\s*日|\d{1,2}\s*点(?:\s*\d{1,2}\s*分)?|\d+(?:\.\d+)?\s*×\s*\d+(?:\.\d+)?\s*(?:厘米)?|\d{4}\s*[–-]\s*\d{4}|\d+(?:\.\d+)?\s*(?:岁|幅|%|厘米|秒|笔|种|处|分钟|天|年|月)|[一-鿿]{1,6}[·-][一-鿿]{1,8}|《[^》]{1,14}》|“[^”]{1,8}”)/g;
  const ZW = '​';
  const TRAIL = new Set('的了着过们地得前里上下中边吗呢吧啊么后外内处似般样幅个位条种只张座家块片次'.split(''));
  const CJK = s => /^[\u4e00-\u9fff]/.test(s), PUN = s => /^[，。、；：？！…）”]+$/.test(s);
  // 断行规则：“的、了、前、里”这类字黏着前一个词；其他单字黏着后一个词；标点后可以断
  function canBreak(a, b, c) {
    if (PUN(a)) return CJK(b);
    if (b.length === 1 && (!c || PUN(c) || !CJK(c))) return false;
    if (!CJK(a) || !CJK(b)) return false;
    if (b.length === 1 && TRAIL.has(b)) return false;
    if (a.length === 1 && !TRAIL.has(a)) return false;
    return true;
  }
  function words(t) {
    if (!SEG) return t;
    const seg = [...SEG.segment(t)].map(x => x.segment); let out = seg[0] || '';
    for (let i = 1; i < seg.length; i++) out += (canBreak(seg[i - 1], seg[i], seg[i + 1]) ? ZW : '') + seg[i];
    return out;
  }
  function fix(node) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 1) { if (!n.classList.contains('nb')) fix(n); return; }
      if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
      const frag = document.createDocumentFragment(), t = n.nodeValue; let last = 0, m; KEEP.lastIndex = 0;
      while ((m = KEEP.exec(t))) {
        if (m.index > last) frag.appendChild(document.createTextNode(words(t.slice(last, m.index)) + ZW));
        const sp = document.createElement('span'); sp.className = 'nb'; sp.style.whiteSpace = 'nowrap'; sp.textContent = m[0]; frag.appendChild(sp);
        frag.appendChild(document.createTextNode(ZW)); last = m.index + m[0].length;
      }
      if (last < t.length) frag.appendChild(document.createTextNode(words(t.slice(last))));
      n.replaceWith(frag);
    });
  }
  return el => { if (!el) return el; try { fix(el); el.style.wordBreak = 'keep-all'; el.style.overflowWrap = 'anywhere'; } catch (e) {} return el; };
})();


function start(cfg) {
  document.title = cfg.pageTitle || document.title;
  document.body.insertAdjacentHTML('beforeend', `
  <div id="stage" role="application" aria-label="${cfg.label || ''}">
    <canvas id="paint"></canvas><canvas id="fx"></canvas>
    <div id="cap"></div>
    <div id="words" class="c" aria-live="polite"></div>
    <div id="hint"></div><div id="tag"></div><div id="clock"></div>
    <a id="brand" class="corner" href="../#${cfg.no}">← 展厅</a>
    <div id="dots" class="corner" aria-hidden="true"></div>
    <button id="soundBtn" class="corner" type="button">声音 关</button>
    <button id="nextBtn" class="corner" type="button">继续 →</button>
    <div id="panel"></div><div id="ribbon"></div>
    <div id="endBtns"></div>
  </div>`);
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), paint = $('#paint'), fx = $('#fx'), P = paint.getContext('2d'), F = fx.getContext('2d');
  const wordsEl = $('#words'), hintEl = $('#hint'), tagEl = $('#tag'), clockEl = $('#clock'), nextBtn = $('#nextBtn');
  let SW = 0, SH = 0;
  function size() { const w = Math.round(innerWidth * DPR), h = Math.round(innerHeight * DPR); const ch = w !== SW || h !== SH; SW = paint.width = fx.width = w; SH = paint.height = fx.height = h; return ch; }
  size();

  /* ---------- 声音 ---------- */
  let audio = null; const soundBtn = $('#soundBtn');
  function noiseBuf(ac, brown) { const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w * 0.5; } return buf; }
  function bird(ac, out) {
    const t0 = ac.currentTime + 0.05, n = 2 + (Math.random() * 4 | 0), base = 2600 + Math.random() * 1600;
    for (let i = 0; i < n; i++) { const t = t0 + i * (0.11 + Math.random() * 0.06), o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.05); o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.09);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.01); g.gain.linearRampToValueAtTime(0, t + 0.09); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.1); }
  }
  function soundOn() {
    if (audio) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = new AC(), kind = cfg.ambience || 'wind', s = ac.createBufferSource(); s.buffer = noiseBuf(ac, kind !== 'wind'); s.loop = true;
    const f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    if (kind === 'wind') { f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.6; g.gain.value = 0.16; lfo.frequency.value = 0.11; lg.gain.value = 0.12; }
    else if (kind === 'water') { f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0.22; lfo.frequency.value = 0.23; lg.gain.value = 0.1; }
    else { f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0.3; lfo.frequency.value = 0.09; lg.gain.value = 0.2; }
    lfo.connect(lg); lg.connect(g.gain); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(); lfo.start();
    audio = { ctx: ac, timer: 0 };
    /* iPhone 静音开关打开时，网页声音默认被静音；先放一段无声的音频，让声音走“媒体播放”通道 */ try { const el = new Audio('data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='); el.loop = true; el.setAttribute('playsinline', ''); const pr = el.play(); if (pr) pr.catch(() => {}); audio.el = el; } catch (e) {}
    const tick = () => { if (!audio) return; if (kind !== 'harbor') bird(ac, ac.destination); audio.timer = setTimeout(tick, (kind === 'water' ? 7000 : 4000) + Math.random() * 8000); };
    audio.timer = setTimeout(tick, 2500); soundBtn.textContent = '声音 开';
  }
  function soundOff() { if (!audio) return; clearTimeout(audio.timer); if (audio.el) audio.el.pause(); audio.ctx.close(); audio = null; soundBtn.textContent = '声音 关'; }
  soundBtn.addEventListener('click', e => { e.stopPropagation(); audio ? soundOff() : soundOn(); });

  /* ---------- 文字 ---------- */
  let wordsToken = 0;
  async function say(lines, pos = 'bl', gap = 1500) {
    const tok = ++wordsToken;
    if (wordsEl.children.length) { wordsEl.classList.add('out'); await sleep(reduce ? 0 : 650); if (tok !== wordsToken) return false; }
    wordsEl.classList.remove('out'); wordsEl.innerHTML = ''; wordsEl.className = pos; if (lines.length) wordsEl.classList.add('has');
    for (let i = 0; i < lines.length; i++) {
      if (tok !== wordsToken) return false;
      const l = lines[i], p = document.createElement('p'); p.className = 'line ' + (l.cls || ''); p.innerHTML = l.t || l; tidy(p); wordsEl.appendChild(p);
      if (i < lines.length - 1) await sleep(reduce ? 200 : (l.wait || gap));
    }
    await sleep(reduce ? 100 : 900); return tok === wordsToken;
  }
  function clearWords() { wordsToken++; wordsEl.classList.add('out'); setTimeout(() => { if (wordsEl.classList.contains('out')) { wordsEl.innerHTML = ''; wordsEl.classList.remove('has'); } }, 700); }
  /* “继续 →”只在等点击、或在画里逛的时候出现 */
  function hint(t, dark, withNext) { hintEl.textContent = t || ''; hintEl.classList.toggle('on', !!t); hintEl.classList.toggle('dark', !!dark); nextBtn.classList.toggle('on', !!t && !!withNext); }

  /* ---------- 图像 ---------- */
  const SRC = {};
  function sampler(im, W, H, orient) {
    const w = Math.min(1000, im.width || im.naturalWidth), h = Math.round(w * H / W), c = mk(w, h), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, k = w / W;
    return { W, H, im,
      col(ix, iy) { const px = clamp(Math.round(ix * k), 0, w - 1), py = clamp(Math.round(iy * k), 0, h - 1), p = (py * w + px) * 4; return [d[p], d[p + 1], d[p + 2]]; },
      avg(ix, iy, r) { let s = [0, 0, 0], n = 0; for (let yy = -r; yy <= r; yy += r / 3 || 1) for (let xx = -r; xx <= r; xx += r / 3 || 1) { const c = this.col(ix + xx, iy + yy); s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n++; } return s.map(v => v / n); },
      ang(ix, iy) { if (!orient) return null; const gx = clamp(Math.floor(ix / orient.step), 0, orient.w - 1), gy = clamp(Math.floor(iy / orient.step), 0, orient.h - 1), ch = orient.d[gy * orient.w + gx]; return ch === '-' ? null : B64.indexOf(ch) / 64 * Math.PI; } };
  }
  function addSource(key, im, W, H, orient) { SRC[key] = sampler(im, W, H, orient); return SRC[key]; }

  /* ---------- 镜头 ---------- */
  let view = null;
  function xf(v) {
    const s = SRC[v.src], cover = Math.max(SW / s.W, SH / s.H), contain = Math.min(SW / s.W, SH / s.H), portrait = SW < SH * 0.95;
    const base = v.fit ? contain * (portrait ? Math.min(1, v.fit + 0.1) : v.fit) : portrait ? contain : Math.min(cover, contain * 1.35), k = base * (v.z || 1);
    let X = (v.cx == null ? 0.5 : v.cx) * s.W, Y = (v.cy == null ? 0.5 : v.cy) * s.H; const hw = SW / 2 / k, hh = SH / 2 / k;
    X = s.W * k > SW ? clamp(X, hw, s.W - hw) : s.W / 2; Y = s.H * k > SH ? clamp(Y, hh, s.H - hh) : s.H / 2;
    const oy = s.H * k < SH && portrait ? (SH - s.H * k) * (v.top == null ? 0.28 : v.top) : SH / 2 - Y * k;
    return { k, ox: SW / 2 - X * k, oy, s };
  }
  const toImg = (v, sx, sy) => { const t = xf(v); return [(sx - t.ox) / t.k, (sy - t.oy) / t.k]; };
  const toScreen = (v, ix, iy) => { const t = xf(v); return [ix * t.k + t.ox, iy * t.k + t.oy]; };
  function drawView(ctx, v, im, alpha = 1) { const t = xf(v); ctx.globalAlpha = alpha; ctx.setTransform(t.k, 0, 0, t.k, t.ox, t.oy); ctx.drawImage(im || t.s.im, 0, 0, t.s.W, t.s.H); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; }

  /* ---------- 用笔触把画面画出来 ---------- */
  let painting = null;
  function stroke(ctx, s) {
    const r = rng(s.seed), n = 4, ca = Math.cos(s.a), sa = Math.sin(s.a), nx = -sa, ny = ca, hl = s.L / 2;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, s.w / n * 1.9);
    for (let i = 0; i < n; i++) {
      const o = (i / (n - 1) - 0.5) * s.w, st = -hl * (0.7 + r() * 0.3), en = hl * (0.7 + r() * 0.3), b = (r() - 0.5) * s.L * 0.12, j = (r() - 0.5) * 18;
      ctx.strokeStyle = rgba([s.c[0] + j, s.c[1] + j * 0.9, s.c[2] + j * 0.8], (0.55 + r() * 0.4).toFixed(2));
      ctx.beginPath(); ctx.moveTo(s.x + ca * st + nx * o, s.y + sa * st + ny * o);
      ctx.quadraticCurveTo(s.x + ca * (st + en) / 2 + nx * (o + b), s.y + sa * (st + en) / 2 + ny * (o + b), s.x + ca * en + nx * o, s.y + sa * en + ny * o); ctx.stroke();
    }
  }
  function paintTo(v, opts = {}) {
    view = v; if (painting) painting.done();
    return new Promise(resolve => {
      const t = xf(v), s = t.s, r = rng((Math.random() * 1e9) | 0), m = Math.min(SW, SH) / DPR, strokes = [];
      const passes = opts.quick ? [clamp(m / 16, 22, 54)] : [clamp(m / 18, 20, 48), clamp(m / 36, 10, 24)];
      passes.forEach((g, pi) => {
        const gp = g * DPR, list = [];
        for (let y = -gp / 2; y < SH + gp; y += gp) for (let x = -gp / 2; x < SW + gp; x += gp) {
          const sx = x + (r() - 0.5) * gp, sy = y + (r() - 0.5) * gp, ix = (sx - t.ox) / t.k, iy = (sy - t.oy) / t.k;
          if (ix < 0 || iy < 0 || ix >= s.W || iy >= s.H) continue;
          let a = s.ang(ix, iy); if (a == null) a = r() * Math.PI;
          list.push({ x: sx, y: sy, a: a + (r() - 0.5) * 0.25, c: s.col(ix, iy), L: gp * (1.5 + r() * 1.1), w: gp * (pi ? 0.55 : 0.75), seed: (r() * 1e9) | 0 });
        }
        for (let i = list.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [list[i], list[j]] = [list[j], list[i]]; }
        strokes.push(list);
      });
      if (opts.from === 'black') { P.fillStyle = '#111917'; P.fillRect(0, 0, SW, SH); }
      let pi = 0, i = 0, fade = 0, fin = false; const frames = [reduce ? 1 : 26, reduce ? 1 : 42], fadeFrames = reduce ? 1 : 22;
      const finish = () => { if (fin) return; fin = true; P.setTransform(1, 0, 0, 1, 0, 0); P.fillStyle = '#111917'; P.fillRect(0, 0, SW, SH); drawView(P, v); painting = null; resolve(); };
      painting = { done: finish };
      const step = () => {
        if (fin) return;
        if (pi < strokes.length) { const list = strokes[pi], per = Math.ceil(list.length / frames[Math.min(pi, 1)]); for (let n = 0; n < per && i < list.length; n++, i++) stroke(P, list[i]); if (i >= list.length) { pi++; i = 0; } }
        else { fade++; drawView(P, v, null, 0.18 + fade / fadeFrames * 0.3); if (fade >= fadeFrames) return finish(); }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  function show(v) { view = v; if (painting) painting.done(); P.setTransform(1, 0, 0, 1, 0, 0); P.fillStyle = '#111917'; P.fillRect(0, 0, SW, SH); drawView(P, v); }

  /* ---------- 雾 ---------- */
  const FW = 96, FH = 60, fogA = new Float32Array(FW * FH), fogC = mk(FW, FH), fogX = fogC.getContext('2d'), fogImg = fogX.createImageData(FW, FH);
  let fogTarget = 0.12, fogRegrow = 0.006, fogColor = cfg.fogColor || [222, 228, 221];
  const noise = (x, y, t) => Math.sin(x * 0.11 + t * 0.00021) * Math.sin(y * 0.17 - t * 0.00017) * 0.5 + Math.sin((x + y) * 0.05 + t * 0.0003) * 0.5;
  function setFog(level, instant, regrow) { fogTarget = level; if (instant) fogA.fill(level); if (regrow != null) fogRegrow = regrow; }
  function windAt(x, y, strength) {
    const fx_ = x / SW * FW, fy_ = y / SH * FH, rad = Math.min(FW, FH) * 0.2;
    for (let j = Math.max(0, fy_ - rad | 0); j < Math.min(FH, fy_ + rad + 1); j++) for (let i = Math.max(0, fx_ - rad | 0); i < Math.min(FW, fx_ + rad + 1); i++) {
      const d = Math.hypot(i - fx_, (j - fy_) * 1.2) / rad; if (d < 1) fogA[j * FW + i] *= 1 - strength * (1 - d) * (1 - d);
    }
  }
  const fogCleared = () => { let s = 0; for (let i = 0; i < fogA.length; i++) s += fogA[i] < 0.35 ? 1 : 0; return s / fogA.length; };

  /* ---------- 每一帧 ---------- */
  let targets = [], hover = null; const overlays = new Set();
  function frame(t) {
    F.setTransform(1, 0, 0, 1, 0, 0); F.clearRect(0, 0, SW, SH);
    if (view) overlays.forEach(fn => { try { fn(F, t, xf(view)); } catch (e) {} F.setTransform(1, 0, 0, 1, 0, 0); F.globalAlpha = 1; F.globalCompositeOperation = 'source-over'; });
    if (!painting && view) targets.forEach(tg => {
      const tr = xf(view), cx = tg.x * tr.k + tr.ox, cy = tg.y * tr.k + tr.oy, a = tg === hover ? 0.32 : (tg.seen ? 0.04 : 0.07 + 0.06 * Math.sin(t / 700 + tg.x));
      F.save(); F.translate(cx, cy); F.scale(tg.rx * tr.k, tg.ry * tr.k);
      const g = F.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(255,236,212,${a})`); g.addColorStop(0.7, `rgba(255,236,212,${a * 0.5})`); g.addColorStop(1, 'rgba(255,236,212,0)');
      F.fillStyle = g; F.beginPath(); F.arc(0, 0, 1, 0, Math.PI * 2); F.fill(); F.restore();
      if (coarse && !tg.seen) { F.font = `${14 * DPR}px "ZCOOL XiaoWei", "Noto Serif SC", serif`; F.textAlign = 'center'; F.textBaseline = 'middle'; const tw = F.measureText(tg.name).width, lcx = tg.lx ? tg.lx * tr.k + tr.ox : cx, lcy = tg.ly ? tg.ly * tr.k + tr.oy : cy;
        F.fillStyle = 'rgba(12,18,16,.55)'; F.fillRect(lcx - tw / 2 - 8 * DPR, lcy - 11 * DPR, tw + 16 * DPR, 22 * DPR); F.fillStyle = 'rgba(255,240,224,.95)'; F.fillText(tg.name, lcx, lcy + DPR); }
    });
    for (let i = 0; i < fogA.length; i++) fogA[i] += (fogTarget - fogA[i]) * fogRegrow;
    const d = fogImg.data;
    for (let j = 0, p = 0; j < FH; j++) for (let i = 0; i < FW; i++, p++) { const n = reduce ? 0 : noise(i, j, t) * 0.12, a = clamp(fogA[p] + n * fogA[p], 0, 0.97); d[p * 4] = fogColor[0]; d[p * 4 + 1] = fogColor[1]; d[p * 4 + 2] = fogColor[2]; d[p * 4 + 3] = a * 255; }
    fogX.putImageData(fogImg, 0, 0); F.imageSmoothingEnabled = true; F.drawImage(fogC, 0, 0, SW, SH);
    requestAnimationFrame(frame);
  }

  /* ---------- 指针 ---------- */
  let onTap = null, onHold = null, onTapAt = null, drag = null, lockUntil = 0, ptr = { px: -1, py: -1, down: null, moved: false };
  const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR]; };
  function hitTarget(x, y) { if (painting || !view) return null; const [ix, iy] = toImg(view, x, y); for (const tg of targets) if (((ix - tg.x) / tg.rx) ** 2 + ((iy - tg.y) / tg.ry) ** 2 < 1) return tg; return null; }
  const moveHooks = new Set();
  stage.addEventListener('pointermove', e => {
    const [x, y] = local(e);
    if (ptr.px >= 0) { const sp = Math.hypot(x - ptr.px, y - ptr.py) / DPR; if (sp > 1) windAt(x, y, Math.min(0.5, sp / 60)); moveHooks.forEach(fn => fn(x, y, x - ptr.px, y - ptr.py)); }
    ptr.px = x; ptr.py = y;
    if (ptr.down) { if (Math.hypot(x - ptr.down[0], y - ptr.down[1]) > 8 * DPR) ptr.moved = true; if (drag && drag.move) drag.move(x, y, x - ptr.down[0], y - ptr.down[1]); return; }
    hover = hitTarget(x, y); stage.classList.toggle('pointer', !!hover || !!onTap || !!onTapAt);
    if (hover && e.pointerType === 'mouse') { tagEl.textContent = hover.name; tagEl.style.left = (x / DPR) + 'px'; tagEl.style.top = (y / DPR) + 'px'; tagEl.classList.add('on'); } else tagEl.classList.remove('on');
  });
  stage.addEventListener('pointerleave', () => { ptr.px = -1; hover = null; tagEl.classList.remove('on'); });
  stage.addEventListener('contextmenu', e => e.preventDefault());
  stage.addEventListener('pointerdown', e => {
    const [x, y] = local(e);
    if (painting) { painting.done(); lockUntil = performance.now() + 450; return; }
    if (performance.now() < lockUntil) return;
    ptr.down = [x, y]; ptr.moved = false;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    if (drag && drag.start) drag.start(x, y);
    if (onHold) onHold(true);
  });
  const up = e => {
    if (!ptr.down) return; const [x, y] = ptr.down, moved = ptr.moved; ptr.down = null;
    if (drag && drag.end) drag.end(moved);
    if (onHold) { onHold(false); return; }
    if (moved) return;
    const tg = hitTarget(x, y);
    if (tg && tg.go) { tagEl.classList.remove('on'); lockUntil = performance.now() + 600; tg.go(); return; }
    if (onTapAt && view) { const [ix, iy] = toImg(view, x, y); onTapAt(ix, iy, x / DPR, y / DPR); return; }
    if (onTap) { lockUntil = performance.now() + 600; onTap(); }
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  ['#nextBtn', '#soundBtn', '#brand', '#endBtns', '#panel', '#ribbon'].forEach(s => $(s).addEventListener('pointerdown', e => e.stopPropagation()));
  nextBtn.addEventListener('click', e => { e.stopPropagation(); if (onTap) onTap(); else { const t = targets.find(t => !t.seen && t.go); if (t) t.go(); } });
  addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { if (e.target.closest && e.target.closest('button,a')) return; if (painting) painting.done(); else nextBtn.click(); e.preventDefault(); } });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (size() && view) show(view); }, 120); });

  function waitTap(text = '点击画面继续', dark) { return new Promise(res => { setTimeout(() => { hint(text, dark, true); onTap = () => { onTap = null; hint(''); stage.classList.remove('pointer'); res(); }; }, 450); }); }

  /* ---------- 小部件 ---------- */
  const dotsEl = $('#dots');
  function dots(n) { dotsEl.innerHTML = '<i></i>'.repeat(n); }
  function dot(i, on) { const d = dotsEl.children[i]; if (d) d.classList.toggle('on', on !== false); }
  function chip(sx, sy, color, label, warm) {
    const c = document.createElement('div'); c.className = 'chip' + (warm ? ' warm' : ''); c.style.left = sx + 'px'; c.style.top = sy + 'px';
    c.innerHTML = `<i style="background:${rgba(color, 1)}"></i><span>${label}</span>`; stage.appendChild(c); return c;
  }
  function clearChips() { stage.querySelectorAll('.chip').forEach(c => c.remove()); }
  /* 选择题：点错的会被划掉，点对了才继续 */
  function ask(q, options, answer) {
    const panel = $('#panel'); return new Promise(res => {
      panel.innerHTML = `<div class="q">${q}</div><div class="opts"></div>`; const box = panel.querySelector('.opts'); let wrong = 0;
      options.forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = o;
        b.onclick = () => { if (i === answer) { b.classList.add('right'); box.querySelectorAll('button').forEach(x => x.disabled = true); res(wrong); } else { b.classList.add('wrong'); b.disabled = true; wrong++; } };
        box.appendChild(b); });
      panel.classList.add('on');
    });
  }
  function closePanel() { $('#panel').classList.remove('on'); }
  function endChoice() {
    const el = $('#endBtns');
    el.innerHTML = '<button type="button" data-v="again">再逛一逛</button><button type="button" data-v="all">从头看一遍</button><button type="button" data-v="hall">回到展厅</button>';
    el.classList.add('on');
    return new Promise(res => el.querySelectorAll('button').forEach(b => b.onclick = () => { el.classList.remove('on'); if (b.dataset.v === 'hall') location.href = '../#' + cfg.no; else res(b.dataset.v); }));
  }
  function badge(html) { if (html == null) clockEl.classList.remove('on'); else { clockEl.innerHTML = html; clockEl.classList.add('on'); } }

  /* 在画里逛：几处可以点开的地方，看完再做下一件事 */
  function explore(places, opts = {}) {
    return new Promise(done => {
      let first = true;
      const hub = async () => {
        targets = []; await paintTo(opts.home); setFog(opts.fog == null ? 0.12 : opts.fog);
        const left = places.filter(p => !p.seen);
        if (!left.length) { targets = []; return done(); }
        targets = places.map(p => Object.assign(p, { go: () => visit(p) }));
        say(first ? opts.intro : [`还有 ${left.length} 处没看。`], 'bl'); first = false;
        hint(coarse ? '点画里标出的地方' : '把鼠标移到画里发亮的地方', false, true);
      };
      const visit = async p => {
        targets = []; hint(''); clearWords();
        await paintTo(p.view); setFog(0.06);
        p.seen = true; if (p.dot != null) dot(p.dot);
        await say(p.lines, p.pos || 'bl');
        await waitTap('点击画面，退后一步');
        clearWords(); hub();
      };
      hub();
    });
  }

  /* ---------- 载入：先出标题和进度，不让人对着黑屏等 ---------- */
  wordsEl.className = 'c nobg';
  wordsEl.innerHTML = `<p class="line title">${cfg.title}</p><p class="line fr">${cfg.fr}</p><p class="line small" id="loadMsg">正在铺颜料……</p>`;
  function showErr(msg) { wordsEl.className = 'c nobg'; wordsEl.innerHTML = '<p class="line small">页面出了点问题，请截图发给作者：<br>' + String(msg || '未知错误').replace(/</g, '&lt;') + '</p>'; }
  let booted = false;
  addEventListener('error', e => { if (!booted) showErr(e.message); });
  const files = cfg.files.map(f => ({ key: f.key, url: LOW && f.low ? f.low : f.url, kb: f.kb || 100, lazy: f.lazy }));
  const need = files.filter(f => !f.lazy), TOTAL = need.reduce((a, f) => a + f.kb, 0); let doneKB = 0;
  const IMG = {};
  function load(f, tries = 2) {
    return new Promise((res, rej) => {
      const i = new Image(); const t = setTimeout(() => { i.src = ''; fail(); }, 40000);
      const fail = () => { clearTimeout(t); if (tries > 1) load(Object.assign({}, f, { url: f.url + (f.url.indexOf('?') < 0 ? '?r=1' : '') }), tries - 1).then(res, rej); else rej(f.url); };
      i.onload = () => { clearTimeout(t); IMG[f.key] = i; if (!f.lazy) { doneKB += f.kb; const m = document.getElementById('loadMsg'); if (m) m.textContent = `正在铺颜料…… ${Math.round(doneKB / TOTAL * 100)}%`; } res(i); };
      i.onerror = fail; i.src = f.url;
    });
  }
  const lazyWait = {};
  function boot() {
    Promise.all(need.map(f => load(f))).then(() => {
      booted = true;
      files.filter(f => f.lazy).forEach(f => { lazyWait[f.key] = load(f).catch(() => null); });
      try { cfg.prepare && cfg.prepare(api, IMG); } catch (err) { return showErr(err && err.message); }
      requestAnimationFrame(frame);
      cfg.run(api).catch(err => showErr(err && err.message));
    }).catch(() => {
      const m = document.getElementById('loadMsg'); if (!m) return;
      m.innerHTML = '网络有点慢，图片没有加载完。<button type="button" id="retry" style="font:inherit;color:inherit;background:none;border:1px solid currentColor;border-radius:14px;padding:4px 12px;margin-left:6px;cursor:pointer">重试</button>';
      const b = document.getElementById('retry'); b.addEventListener('pointerdown', e => e.stopPropagation()); b.onclick = () => { m.textContent = '正在铺颜料……'; doneKB = 0; boot(); };
    });
  }
  const api = {
    reduce, coarse, DPR, LOW, tidy, clamp, sleep, rng, mk, rgba,
    get SW() { return SW; }, get SH() { return SH; }, get view() { return view; }, IMG, SRC,
    image: key => IMG[key] ? Promise.resolve(IMG[key]) : (lazyWait[key] || Promise.resolve(null)),
    addSource, xf, toImg, toScreen, drawView, paintTo, show, say, clearWords, hint, waitTap, setFog, fogCleared,
    setTargets: t => { targets = t; }, explore, dots, dot, chip, clearChips, ask, closePanel, endChoice, badge, soundOn,
    overlay: fn => { overlays.add(fn); return () => overlays.delete(fn); },
    onMove: fn => { moveHooks.add(fn); return () => moveHooks.delete(fn); },
    set onTap(f) { onTap = f; }, set onTapAt(f) { onTapAt = f; }, set onHold(f) { onHold = f; }, set drag(d) { drag = d; },
    stage, $
  };
  boot();
  return api;
}
window.Walk = { start };
})();
