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

function logUsageHeaders(res) {
  const appUsage = res.headers.get("x-app-usage");
  const buUsage = res.headers.get("x-business-use-case-usage");
  if (appUsage) console.log(`  [x-app-usage] ${appUsage}`);
  if (buUsage) console.log(`  [x-business-use-case-usage] ${buUsage}`);
}

async function api(pathAndQuery, method = "GET") {
  const url = `${API_BASE}${pathAndQuery}`;
  const res = await fetch(url, { method });
  logUsageHeaders(res);
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
  // 영상 트랜스코딩은 보통 60~70초 걸린다. API 호출량(요청 한도)을 아끼기 위해
  // 촘촘히 폴링하지 않고, 처음엔 오래 기다렸다가 뜸하게 확인한다(총 대기 한도는 비슷하게 유지).
  await new Promise((r) => setTimeout(r, 45000)); // 첫 확인 전 45초 대기 (초반 폴링 낭비 방지)
  for (let i = 0; i < 12; i++) {
    const q = new URLSearchParams({ fields: "status_code", access_token: IG_ACCESS_TOKEN });
    const json = await api(`/${containerId}?${q.toString()}`);
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") throw new Error(`컨테이너 처리 실패: ${containerId}`);
    await new Promise((r) => setTimeout(r, 15000));
  }
  throw new Error(`컨테이너 처리 타임아웃: ${containerId}`);
}

async function publish(creationId) {
  const q = new URLSearchParams({ creation_id: creationId, access_token: IG_ACCESS_TOKEN });
  return api(`/${IG_USER_ID}/media_publish?${q.toString()}`, "POST");
}

// publish-to-instagram.js와 동일한 이유(에러 응답과 실제 게시 여부가 다를 수 있음)로,
// 실패로 보여도 바로 포기하지 않고 최근 게시물(릴스 포함)에 이 캡션이 이미
// 올라와 있는지 확인한다.
async function wasRecentlyPublished() {
  const hookLine = (CAPTION || "").split("\n")[0].trim();
  if (!hookLine) return false;

  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 40000));
    try {
      const q = new URLSearchParams({
        fields: "timestamp,caption,media_product_type",
        limit: "5",
        access_token: IG_ACCESS_TOKEN,
      });
      const res = await fetch(`${API_BASE}/${IG_USER_ID}/media?${q.toString()}`);
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        const now = Date.now();
        // 캐러셀도 같은 캡션을 쓰므로, 릴스(REELS)인 것만 인정해야 캐러셀 성공을
        // 릴스 성공으로 착각하지 않는다.
        const found = json.data.some((m) => {
          const ageMs = now - new Date(m.timestamp).getTime();
          return (
            ageMs < 15 * 60 * 1000 &&
            m.media_product_type === "REELS" &&
            (m.caption || "").includes(hookLine)
          );
        });
        if (found) return true;
      }
    } catch {
      // 확인 자체가 실패하면 다음 시도로 넘어간다
    }
  }
  return false;
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

main().catch(async (err) => {
  console.error(`오류 발생, 실제로 게시됐는지 확인 중... (${err.message})`);
  if (await wasRecentlyPublished()) {
    console.log(`세트 ${SET_INDEX} 릴스: 에러 응답과 달리 실제로는 게시된 것으로 확인됨 (재시도 생략)`);
    return;
  }
  console.error("오류:", err);
  process.exit(1);
});
