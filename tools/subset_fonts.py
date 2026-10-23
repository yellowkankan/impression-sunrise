"""把网站用到的字（扫描所有 .html 和 .js）从完整字体里挑出来，生成很小的 woff2 字体文件。

改动了页面文字后重新运行：
    python3 tools/subset_fonts.py <完整字体所在文件夹>
完整字体（Google Fonts，SIL 开源字体许可）：
    ZCOOLXiaoWei-Regular.ttf, IMFeENrm28P.ttf, IMFeENit28P.ttf,
    NotoSerifSC-400.ttf, NotoSerifSC-600.ttf（由 NotoSerifSC[wght].ttf 用 fontTools 实例化得到）
需要：pip install fonttools brotli
"""
import glob, os, sys, string
from fontTools import subset


def fix_hui(font):
    """站酷小薇体的“回”字轮廓有错，浏览器会把它画成一个实心黑块。
    这里用同一字体里的“口”重新拼出“回”：外面一个大口，里面一个小口，
    只拉伸中间的空心部分，笔画粗细保持不变。"""
    from fontTools.pens.recordingPen import RecordingPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    cmap = font.getBestCmap(); gs = font.getGlyphSet()
    if ord('回') not in cmap or ord('口') not in cmap: return
    rec = RecordingPen(); gs[cmap[ord('口')]].draw(rec)
    def mapper(xs, ys):
        def m(v, a):
            for (s0, s1), (d0, d1) in a:
                if s0 <= v <= s1: return d0 + (v - s0) * (d1 - d0) / (s1 - s0)
            return a[0][1][0] if v < a[0][0][0] else a[-1][1][1]
        return lambda pt: (round(m(pt[0], xs)), round(m(pt[1], ys)))
    # “口”的外框 232–794 × 28–690，空心 320–706 × 190–624
    big = mapper([((232, 320), (162, 262)), ((320, 706), (262, 758)), ((706, 794), (758, 858))],
                 [((28, 190), (-22, 130)), ((190, 624), (130, 672)), ((624, 690), (672, 740))])
    small = mapper([((232, 320), (358, 440)), ((320, 706), (440, 582)), ((706, 794), (582, 664))],
                   [((28, 190), (226, 312)), ((190, 624), (312, 500)), ((624, 690), (500, 558))])
    pen = TTGlyphPen(gs)
    for f in (big, small):
        for op, args in rec.value:
            getattr(pen, op)(*[f(a) for a in args])
    g = pen.glyph(); g.recalcBounds(font['glyf']); font['glyf'][cmap[ord('回')]] = g

src = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = string.printable + '，。、；：？！“”‘’（）《》—…·→←×％'
for f in glob.glob(os.path.join(root, '**', '*.html'), recursive=True) + glob.glob(os.path.join(root, '**', '*.js'), recursive=True):
    text += open(f, encoding='utf-8').read()
chars = ''.join(sorted(set(text)))
out = os.path.join(root, 'fonts'); os.makedirs(out, exist_ok=True)
jobs = [('ZCOOLXiaoWei-Regular.ttf', 'zcool-xiaowei.woff2'), ('NotoSerifSC-400.ttf', 'noto-serif-sc-400.woff2'),
        ('NotoSerifSC-600.ttf', 'noto-serif-sc-600.woff2'), ('IMFeENrm28P.ttf', 'im-fell-english.woff2'),
        ('IMFeENit28P.ttf', 'im-fell-english-italic.woff2')]
for a, b in jobs:
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
    font = subset.load_font(os.path.join(src, a), opts)
    if a.startswith('ZCOOL'): fix_hui(font)
    s = subset.Subsetter(opts); s.populate(text=chars); s.subset(font)
    subset.save_font(font, os.path.join(out, b), opts)
    print(b, os.path.getsize(os.path.join(out, b)) // 1024, 'KB')
