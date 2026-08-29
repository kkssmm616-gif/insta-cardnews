"""
design/{Main,Cut2..Cut6}.dc.html 6장을 읽어 GitHub Pages용 정적 갤러리 HTML을 생성한다.
사용법: python build_gallery.py {YYYY-MM-DD} "{페이지 타이틀}"
출력: ../docs/{YYYY-MM-DD}-cardnews.html

각 아트보드를 base64로 인코딩해 <iframe srcdoc>으로 격리 렌더링한다.
(캔버스 에디터용 seed-canvas 결과물은 Claude 프레임 없이 단독으로 열면 빈 화면만 뜨므로
 GitHub Pages 같은 순수 정적 호스팅에는 이 스크립트의 결과물을 써야 한다.)
"""
import base64, pathlib, sys, datetime

base = pathlib.Path(__file__).parent
files = ["Main.dc.html", "Cut2.dc.html", "Cut3.dc.html", "Cut4.dc.html", "Cut5.dc.html", "Cut6.dc.html"]

date = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
title = sys.argv[2] if len(sys.argv) > 2 else "카드뉴스"
out_path = base.parent / "docs" / f"{date}-cardnews.html"

cards_js = []
for f in files:
    b = (base / f).read_bytes()
    b64 = base64.b64encode(b).decode("ascii")
    cards_js.append(f'"{f}":"{b64}"')

html = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
  body{{margin:0;background:#faf9f5;font-family:system-ui,sans-serif;padding:24px 0 60px;}}
  h1{{text-align:center;font-size:18px;color:#333;margin:0 0 20px;}}
  .gallery{{display:flex;flex-direction:column;align-items:center;gap:20px;}}
  .card-wrap{{width:380px;height:475px;overflow:hidden;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);position:relative;background:#0a1420;}}
  .card-wrap iframe{{width:1080px;height:1350px;border:0;transform:scale(0.35185);transform-origin:0 0;}}
  .back{{text-align:center;margin-top:10px;}}
  .back a{{color:#666;font-size:13px;text-decoration:none;}}
</style>
</head>
<body>
<h1>{title}</h1>
<div class="gallery">
{"".join(f'<div class="card-wrap"><iframe data-src="{f}"></iframe></div>' for f in files)}
</div>
<div class="back"><a href="./index.html">← 목록으로</a></div>
<script>
const CARDS = {{{",".join(cards_js)}}};
document.querySelectorAll('iframe[data-src]').forEach(f => {{
  const b64 = CARDS[f.dataset.src];
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  f.srcdoc = new TextDecoder('utf-8').decode(bytes);
}});
</script>
</body>
</html>
"""

out_path.parent.mkdir(exist_ok=True)
out_path.write_text(html, encoding="utf-8")
print(f"wrote {out_path} ({len(html)} chars)")
