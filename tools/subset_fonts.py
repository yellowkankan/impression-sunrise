"""把网站用到的字从完整字体里挑出来，生成很小的 woff2 字体文件。

改动了页面文字后重新运行：
    python3 tools/subset_fonts.py <完整字体所在文件夹>
完整字体（Google Fonts，SIL 开源字体许可）：
    ZCOOLXiaoWei-Regular.ttf, IMFeENrm28P.ttf, IMFeENit28P.ttf,
    NotoSerifSC-400.ttf, NotoSerifSC-600.ttf（由 NotoSerifSC[wght].ttf 用 fontTools 实例化得到）
需要：pip install fonttools brotli
"""
import glob, os, sys, string
from fontTools import subset

src = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = string.printable + '，。、；：？！“”‘’（）《》—…·→←×％'
for f in glob.glob(os.path.join(root, '**', '*.html'), recursive=True):
    text += open(f, encoding='utf-8').read()
chars = ''.join(sorted(set(text)))
out = os.path.join(root, 'fonts'); os.makedirs(out, exist_ok=True)
jobs = [('ZCOOLXiaoWei-Regular.ttf', 'zcool-xiaowei.woff2'), ('NotoSerifSC-400.ttf', 'noto-serif-sc-400.woff2'),
        ('NotoSerifSC-600.ttf', 'noto-serif-sc-600.woff2'), ('IMFeENrm28P.ttf', 'im-fell-english.woff2'),
        ('IMFeENit28P.ttf', 'im-fell-english-italic.woff2')]
for a, b in jobs:
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
    font = subset.load_font(os.path.join(src, a), opts)
    s = subset.Subsetter(opts); s.populate(text=chars); s.subset(font)
    subset.save_font(font, os.path.join(out, b), opts)
    print(b, os.path.getsize(os.path.join(out, b)) // 1024, 'KB')
