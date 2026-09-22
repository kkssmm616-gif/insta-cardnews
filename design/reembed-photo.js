/**
 * .dc.html 파일 안에 이미 임베드된 <img src="data:image/...;base64,...."> 하나를
 * 다른 이미지로 교체한다 (사진을 잘못 골랐을 때 재작업용).
 * 파일에 <img>가 정확히 1개 있다고 가정한다.
 *
 * 사용법: node design/reembed-photo.js <html경로> <새이미지경로>
 */
const fs = require("fs");
const path = require("path");

const [, , htmlPath, imgPath] = process.argv;
if (!htmlPath || !imgPath) {
  console.error("사용법: node design/reembed-photo.js <html경로> <새이미지경로>");
  process.exit(1);
}

const ext = path.extname(imgPath).toLowerCase();
const mime = ext === ".png" ? "image/png" : "image/jpeg";
const b64 = fs.readFileSync(imgPath).toString("base64");
const wrapped = b64.match(/.{1,200}/g).join("\n");
const dataUri = `data:${mime};base64,${wrapped}`;

let html = fs.readFileSync(htmlPath, "utf8");
const re = /src="data:image\/[a-zA-Z+]+;base64,[\s\S]*?"/;
if (!re.test(html)) {
  console.error(`오류: ${htmlPath} 안에 base64 이미지 src를 찾을 수 없음`);
  process.exit(1);
}
html = html.replace(re, `src="${dataUri}"`);
fs.writeFileSync(htmlPath, html);
console.log(`완료: ${path.basename(imgPath)} 로 교체 -> ${htmlPath} (+${wrapped.length}자)`);
