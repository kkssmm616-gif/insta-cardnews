/**
 * GitHub Actions에서 실행: design/{Main,Cut2..Cut6}.dc.html 을 인스타그램 게시용
 * JPEG 6장으로 렌더링해서 docs/exports/{date}/ 에 저장한다.
 * (인스타그램 Graph API는 캐러셀 이미지로 JPEG만 허용하므로 PNG가 아닌 JPEG로 저장한다.)
 *
 * 사용법: node render-for-instagram.js YYYY-MM-DD
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const FILES = ["Main.dc.html", "Cut2.dc.html", "Cut3.dc.html", "Cut4.dc.html", "Cut5.dc.html", "Cut6.dc.html"];
const OUT_NAMES = ["01-main.jpg", "02-cut2.jpg", "03-cut3.jpg", "04-cut4.jpg", "05-cut5.jpg", "06-cut6.jpg"];

async function main() {
  const date = process.argv[2];
  if (!date) {
    console.error("사용법: node render-for-instagram.js YYYY-MM-DD");
    process.exit(1);
  }

  const outDir = path.join(REPO_ROOT, "docs", "exports", date);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });

  for (let i = 0; i < FILES.length; i++) {
    const srcPath = path.join(REPO_ROOT, "design", FILES[i]);
    if (!fs.existsSync(srcPath)) {
      console.error(`! ${FILES[i]} 없음, 중단`);
      process.exit(1);
    }
    await page.goto("file:///" + srcPath.replace(/\\/g, "/"), { waitUntil: "networkidle" });
    const outPath = path.join(outDir, OUT_NAMES[i]);
    await page.screenshot({ path: outPath, type: "jpeg", quality: 92 });
    console.log(`- ${OUT_NAMES[i]} 저장됨`);
  }

  await browser.close();
  console.log(`완료: ${outDir}`);
}

main().catch((err) => {
  console.error("오류:", err);
  process.exit(1);
});
