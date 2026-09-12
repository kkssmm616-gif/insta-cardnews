/**
 * 예약된 게시 대기열(docs/{date}-publish-queue.json)을 확인해서
 * 발행 시각이 지난 세트가 있으면 캐러셀+릴스를 게시한다.
 *
 * 별도의 승인이 필요 없다 — 최초 승인 시점에 오늘 준비된 세트를
 * 전부 게시하기로 이미 승인된 것이고, 이 스크립트는 그 실행 시점만
 * 8시간 간격으로 나눠서 API 호출이 짧은 시간에 몰리지 않게 할 뿐이다.
 * GitHub Actions에서 cron으로 주기적으로 호출된다.
 *
 * 마지막 줄에 CHANGED 또는 NO_CHANGE를 출력해 워크플로가 커밋 여부를 판단한다.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DOCS_DIR = path.join(__dirname, "..", "docs");

function publishSet(date, setIndex) {
  const captionPath = path.join(DOCS_DIR, `${date}-caption-${setIndex}.txt`);
  const caption = fs.existsSync(captionPath) ? fs.readFileSync(captionPath, "utf-8") : "";
  const env = { ...process.env, DATE: date, SET_INDEX: String(setIndex), CAPTION: caption };

  console.log(`- 세트 ${setIndex} 캐러셀 게시`);
  execFileSync("node", [path.join(__dirname, "publish-to-instagram.js")], { env, stdio: "inherit" });

  console.log(`- 세트 ${setIndex} 릴스 게시`);
  execFileSync("node", [path.join(__dirname, "publish-reel-to-instagram.js")], { env, stdio: "inherit" });
}

function main() {
  const files = fs.existsSync(DOCS_DIR)
    ? fs.readdirSync(DOCS_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}-publish-queue\.json$/.test(f))
    : [];

  let anyChanged = false;
  const now = new Date();

  for (const file of files) {
    const fullPath = path.join(DOCS_DIR, file);
    const queue = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    const stillPending = [];
    let changed = false;

    for (const entry of queue.pending || []) {
      if (new Date(entry.publish_at) <= now) {
        console.log(`발행 시각 도달: ${queue.date} 세트 ${entry.set}`);
        publishSet(queue.date, entry.set);
        changed = true;
      } else {
        stillPending.push(entry);
      }
    }

    if (changed) {
      queue.pending = stillPending;
      fs.writeFileSync(fullPath, JSON.stringify(queue, null, 2) + "\n");
      anyChanged = true;
      if (stillPending.length === 0) {
        console.log(`${file}: 대기열 완료`);
      }
    }
  }

  console.log(anyChanged ? "CHANGED" : "NO_CHANGE");
}

main();
