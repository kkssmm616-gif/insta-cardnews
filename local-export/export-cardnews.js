/**
 * 매일 실행: GitHub Pages(master 브랜치 design/ 폴더)에서 오늘 날짜 카드뉴스 6컷을 받아
 * 각 컷을 1080x1350 PNG로 캡처해서 OneDrive\InstaCardnews\{YYYY-MM-DD}\ 에 저장한다.
 * (인스타그램은 HTML이 아니라 이미지 파일만 업로드 가능하므로, 이 스크립트가
 *  "클라우드 루틴이 카드뉴스를 만든다" ~ "휴대폰에서 인스타 업로드" 사이의 빈틈을 메운다.)
 *
 * 사용법: node export-cardnews.js [YYYY-MM-DD]  (생략 시 오늘 날짜)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

const REPO_RAW_BASE = "https://raw.githubusercontent.com/kkssmm616-gif/insta-cardnews/master";
const PAGES_BASE = "https://kkssmm616-gif.github.io/insta-cardnews";
const FILES = ["Main.dc.html", "Cut2.dc.html", "Cut3.dc.html", "Cut4.dc.html", "Cut5.dc.html", "Cut6.dc.html"];
const OUT_NAMES = ["01-main.png", "02-cut2.png", "03-cut3.png", "04-cut4.png", "05-cut5.png", "06-cut6.png"];
const ONEDRIVE_BASE = path.join(os.homedir(), "OneDrive", "InstaCardnews");

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function main() {
  const date = process.argv[2] || new Date().toISOString().slice(0, 10);
  console.log(`[${new Date().toISOString()}] 카드뉴스 이미지 추출 시작: ${date}`);

  // 오늘자 카드뉴스가 실제로 발행됐는지(=루틴 실행 + auto-merge 완료) 먼저 확인
  const pagesUrl = `${PAGES_BASE}/${date}-cardnews.html`;
  const ready = await fetchText(pagesUrl);
  if (!ready) {
    console.log(`아직 ${date} 카드뉴스가 GitHub Pages에 없습니다 (${pagesUrl}). 나중에 다시 시도하세요.`);
    process.exit(0);
  }

  const outDir = path.join(ONEDRIVE_BASE, date);
  fs.mkdirSync(outDir, { recursive: true });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cardnews-"));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });

  for (let i = 0; i < FILES.length; i++) {
    const file = FILES[i];
    const raw = await fetchText(`${REPO_RAW_BASE}/design/${file}`);
    if (!raw) {
      console.log(`  ! ${file} 다운로드 실패, 건너뜀`);
      continue;
    }
    const localPath = path.join(tmpDir, file);
    fs.writeFileSync(localPath, raw, "utf-8");

    await page.goto("file:///" + localPath.replace(/\\/g, "/"), { waitUntil: "networkidle" });
    const outPath = path.join(outDir, OUT_NAMES[i]);
    await page.screenshot({ path: outPath });
    console.log(`  - ${OUT_NAMES[i]} 저장됨`);
  }

  await browser.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`완료: ${outDir}`);
}

main().catch((err) => {
  console.error("오류:", err);
  process.exit(1);
});
