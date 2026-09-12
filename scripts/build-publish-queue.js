/**
 * 오늘 승인 시점에 즉시 게시하지 않는 나머지 세트를 8시간 간격으로
 * 나중에 게시하도록 예약 대기열 파일을 만든다.
 * (전체 게시는 이미 최초 승인 1번으로 승인된 상태 — 이 대기열은 그
 *  실행 시점만 나눠서 API 호출이 짧은 시간에 몰리지 않게 하기 위함)
 *
 * 사용법: node build-publish-queue.js YYYY-MM-DD SET_INDEX...
 * 예: node build-publish-queue.js 2026-09-13 2 3
 *   -> 세트 2는 지금부터 8시간 뒤, 세트 3은 16시간 뒤로 예약된다.
 */
const fs = require("fs");
const path = require("path");

const [, , date, ...sets] = process.argv;
if (!date || sets.length === 0) {
  console.error("사용법: node build-publish-queue.js YYYY-MM-DD SET_INDEX...");
  process.exit(1);
}

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const now = Date.now();
const pending = sets.map((set, i) => ({
  set: Number(set),
  publish_at: new Date(now + EIGHT_HOURS_MS * (i + 1)).toISOString(),
}));

const outPath = path.join(__dirname, "..", "docs", `${date}-publish-queue.json`);
fs.writeFileSync(outPath, JSON.stringify({ date, pending }, null, 2) + "\n");
console.log(`대기열 생성됨: ${outPath}`);
console.log(JSON.stringify(pending, null, 2));
