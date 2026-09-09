/**
 * GitHub Actions에서 실행: docs/exports/{DATE}/{SET_INDEX}/reel.mp4 를
 * (GitHub Pages 공개 URL 경유) 인스타그램 릴스로 발행한다.
 * (같은 세트의 캐러셀 게시물과 별개로 추가 발행되는 릴스 버전.)
 *
 * 필요한 환경 변수:
 *   IG_ACCESS_TOKEN - Instagram Graph API 액세스 토큰
 *   IG_USER_ID      - Instagram 비즈니스/크리에이터 계정 ID
 *   DATE            - YYYY-MM-DD
 *   SET_INDEX       - 1, 2, 3 중 하나
 *   CAPTION         - 게시물 본문 (같은 세트의 캐러셀 캡션 재사용)
 */
const PAGES_BASE = "https://kkssmm616-gif.github.io/insta-cardnews";
const API_BASE = "https://graph.instagram.com/v21.0";

const { IG_ACCESS_TOKEN, IG_USER_ID, DATE, SET_INDEX, CAPTION } = process.env;

function assertEnv() {
  for (const [k, v] of Object.entries({ IG_ACCESS_TOKEN, IG_USER_ID, DATE, SET_INDEX })) {
    if (!v) {
      console.error(`환경 변수 누락: ${k}`);
      process.exit(1);
    }
  }
}

async function api(pathAndQuery, method = "GET") {
  const url = `${API_BASE}${pathAndQuery}`;
  const res = await fetch(url, { method });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`API 오류 (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function createReelContainer(videoUrl) {
  const q = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
    caption: CAPTION || "",
    share_to_feed: "false", // 캐러셀과 중복 노출 방지 (프로필 그리드엔 캐러셀만 남음, 릴스는 릴스 탭에)
    access_token: IG_ACCESS_TOKEN,
  });
  const json = await api(`/${IG_USER_ID}/media?${q.toString()}`, "POST");
  return json.id;
}

async function waitUntilFinished(containerId) {
  // 영상 처리(트랜스코딩)는 이미지보다 오래 걸릴 수 있어 이미지 발행보다 길게 재시도한다.
  for (let i = 0; i < 30; i++) {
    const q = new URLSearchParams({ fields: "status_code", access_token: IG_ACCESS_TOKEN });
    const json = await api(`/${containerId}?${q.toString()}`);
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") throw new Error(`컨테이너 처리 실패: ${containerId}`);
    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error(`컨테이너 처리 타임아웃: ${containerId}`);
}

async function publish(creationId) {
  const q = new URLSearchParams({ creation_id: creationId, access_token: IG_ACCESS_TOKEN });
  return api(`/${IG_USER_ID}/media_publish?${q.toString()}`, "POST");
}

async function main() {
  assertEnv();
  const videoUrl = `${PAGES_BASE}/exports/${DATE}/${SET_INDEX}/reel.mp4`;
  console.log(`인스타그램 릴스 게시 시작: ${DATE} 세트 ${SET_INDEX} (${videoUrl})`);

  console.log("- 릴스 컨테이너 생성 중...");
  const containerId = await createReelContainer(videoUrl);

  console.log("- 영상 처리 완료 대기 중...");
  await waitUntilFinished(containerId);

  console.log("- 게시 중...");
  const result = await publish(containerId);
  console.log(`세트 ${SET_INDEX} 릴스 완료:`, result);
}

main().catch((err) => {
  console.error("오류:", err);
  process.exit(1);
});
