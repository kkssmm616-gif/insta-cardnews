/**
 * GitHub Actions에서 실행: docs/exports/{DATE}/ 에 올라간 6장의 JPEG를
 * (GitHub Pages 공개 URL 경유) 인스타그램 캐러셀 게시물로 발행한다.
 *
 * 필요한 환경 변수:
 *   IG_ACCESS_TOKEN - Instagram Graph API 액세스 토큰
 *   IG_USER_ID      - Instagram 비즈니스/크리에이터 계정 ID
 *   DATE            - YYYY-MM-DD
 *   CAPTION         - 게시물 본문
 */
const PAGES_BASE = "https://kkssmm616-gif.github.io/insta-cardnews";
const API_BASE = "https://graph.instagram.com/v21.0";
const OUT_NAMES = ["01-main.jpg", "02-cut2.jpg", "03-cut3.jpg", "04-cut4.jpg", "05-cut5.jpg", "06-cut6.jpg"];

const { IG_ACCESS_TOKEN, IG_USER_ID, DATE, CAPTION } = process.env;

function assertEnv() {
  for (const [k, v] of Object.entries({ IG_ACCESS_TOKEN, IG_USER_ID, DATE })) {
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
  for (let i = 0; i < 15; i++) {
    const q = new URLSearchParams({ fields: "status_code", access_token: IG_ACCESS_TOKEN });
    const json = await api(`/${containerId}?${q.toString()}`);
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") throw new Error(`컨테이너 처리 실패: ${containerId}`);
    await new Promise((r) => setTimeout(r, 4000));
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

async function main() {
  assertEnv();
  console.log(`인스타그램 게시 시작: ${DATE}`);

  const childIds = [];
  for (const name of OUT_NAMES) {
    const imageUrl = `${PAGES_BASE}/exports/${DATE}/${name}`;
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
  console.log("완료:", result);
}

main().catch((err) => {
  console.error("오류:", err);
  process.exit(1);
});
