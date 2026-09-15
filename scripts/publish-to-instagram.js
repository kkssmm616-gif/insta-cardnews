/**
 * GitHub Actions에서 실행: docs/exports/{DATE}/{SET_INDEX}/ 에 올라간 6장의 JPEG를
 * (GitHub Pages 공개 URL 경유) 인스타그램 캐러셀 게시물로 발행한다.
 * 하루 최대 3세트(SET_INDEX 1~3)를 만들며, 이 스크립트는 세트 1개를 발행한다
 * (3세트 모두 게시하려면 워크플로에서 세트마다 이 스크립트를 반복 호출한다).
 *
 * 필요한 환경 변수:
 *   IG_ACCESS_TOKEN - Instagram Graph API 액세스 토큰
 *   IG_USER_ID      - Instagram 비즈니스/크리에이터 계정 ID
 *   DATE            - YYYY-MM-DD
 *   SET_INDEX       - 1, 2, 3 중 하나 (오늘의 몇 번째 세트인지)
 *   CAPTION         - 게시물 본문
 */
const PAGES_BASE = "https://kkssmm616-gif.github.io/insta-cardnews";
const API_BASE = "https://graph.instagram.com/v21.0";
const OUT_NAMES = ["01-main.jpg", "02-cut2.jpg", "03-cut3.jpg", "04-cut4.jpg", "05-cut5.jpg", "06-cut6.jpg"];

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

async function createCarouselItem(imageUrl) {
  const q = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: IG_ACCESS_TOKEN,
  });
  const json = await api(`/${IG_USER_ID}/media?${q.toString()}`, "POST");
  return json.id;
}

async function waitUntilFinished(containerId) {
  // API 호출량을 아끼기 위해 너무 촘촘히 폴링하지 않는다(이미지는 보통 몇 초 안에 끝나지만,
  // 첫 확인 전 약간 기다렸다가 뜸하게 재시도해 불필요한 초반 폴링을 줄인다).
  await new Promise((r) => setTimeout(r, 3000));
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({ fields: "status_code", access_token: IG_ACCESS_TOKEN });
    const json = await api(`/${containerId}?${q.toString()}`);
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") throw new Error(`컨테이너 처리 실패: ${containerId}`);
    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error(`컨테이너 처리 타임아웃: ${containerId}`);
}

async function createCarouselContainer(childIds) {
  const q = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption: CAPTION || "",
    access_token: IG_ACCESS_TOKEN,
  });
  const json = await api(`/${IG_USER_ID}/media?${q.toString()}`, "POST");
  return json.id;
}

async function publish(creationId) {
  const q = new URLSearchParams({ creation_id: creationId, access_token: IG_ACCESS_TOKEN });
  return api(`/${IG_USER_ID}/media_publish?${q.toString()}`, "POST");
}

// Meta가 code 4/subcode 2207051("Application request limit reached", 스팸 오탐)
// 에러를 응답하고도 실제로는 뒤에서 게시를 처리하는 경우가 여러 번 확인됐다
// (2026-09-11, 9/12, 9/13, 9/15 — "실패" 로그와 달리 인스타그램엔 실제로 게시돼
// 있었음, 9/12는 재시도로 중복 게시까지 발생). 그래서 에러가 나도 바로 포기/재시도
// 하지 않고, 최근 게시물에 이번 캡션이 이미 올라와 있는지 확인한 뒤 판단한다.
async function wasRecentlyPublished() {
  const hookLine = (CAPTION || "").split("\n")[0].trim();
  if (!hookLine) return false;

  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 40000));
    try {
      const q = new URLSearchParams({ fields: "timestamp,caption", limit: "5", access_token: IG_ACCESS_TOKEN });
      const res = await fetch(`${API_BASE}/${IG_USER_ID}/media?${q.toString()}`);
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        const now = Date.now();
        const found = json.data.some((m) => {
          const ageMs = now - new Date(m.timestamp).getTime();
          return ageMs < 15 * 60 * 1000 && (m.caption || "").includes(hookLine);
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
  console.log(`인스타그램 게시 시작: ${DATE} 세트 ${SET_INDEX}`);

  const childIds = [];
  for (const name of OUT_NAMES) {
    const imageUrl = `${PAGES_BASE}/exports/${DATE}/${SET_INDEX}/${name}`;
    console.log(`- 컨테이너 생성: ${imageUrl}`);
    const id = await createCarouselItem(imageUrl);
    childIds.push(id);
  }

  console.log("- 각 컨테이너 처리 완료 대기 중...");
  for (const id of childIds) {
    await waitUntilFinished(id);
  }

  console.log("- 캐러셀 컨테이너 생성 중...");
  const carouselId = await createCarouselContainer(childIds);

  console.log("- 캐러셀 처리 완료 대기 중...");
  await waitUntilFinished(carouselId);

  console.log("- 게시 중...");
  const result = await publish(carouselId);
  console.log(`세트 ${SET_INDEX} 완료:`, result);
}

main().catch(async (err) => {
  console.error(`오류 발생, 실제로 게시됐는지 확인 중... (${err.message})`);
  if (await wasRecentlyPublished()) {
    console.log(`세트 ${SET_INDEX}: 에러 응답과 달리 실제로는 게시된 것으로 확인됨 (재시도 생략)`);
    return;
  }
  console.error("오류:", err);
  process.exit(1);
});
