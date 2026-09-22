/**
 * .dc.html 파일 안의 플레이스홀더 문자열을 실사 사진의 base64 data URI로 치환한다.
 * base64는 200자마다 줄바꿈을 넣어 저장한다 (data URI 안의 공백/개행은 브라우저가
 * 무시하므로 렌더링에는 영향이 없고, 한 줄짜리 초거대 라인이 되는 것을 막아
 * 이후 이 파일을 다시 열어볼 때도 문제가 없게 하기 위함).
 *
 * 사용법: node design/embed-photo.js <html경로> <이미지경로> <플레이스홀더문자열>
 */
const fs = require("fs");
const path = require("path");

const [, , htmlPath, imgPath, placeholder] = process.argv;
if (!htmlPath || !imgPath || !placeholder) {
  console.error("사용법: node design/embed-photo.js <html경로> <이미지경로> <플레이스홀더문자열>");
  process.exit(1);
}

const ext = path.extname(imgPath).toLowerCase();
const mime = ext === ".png" ? "image/png" : "image/jpeg";
const b64 = fs.readFileSync(imgPath).toString("base64");
const wrapped = b64.match(/.{1,200}/g).join("\n");
const dataUri = `data:${mime};base64,${wrapped}`;

let html = fs.readFileSync(htmlPath, "utf8");
if (!html.includes(placeholder)) {
  console.error(`오류: ${htmlPath} 안에 플레이스홀더 "${placeholder}" 를 찾을 수 없음`);
  process.exit(1);
}
html = html.split(placeholder).join(dataUri);
fs.writeFileSync(htmlPath, html);
console.log(`완료: ${path.basename(imgPath)} -> ${htmlPath} (플레이스홀더 "${placeholder}", +${wrapped.length}자)`);
