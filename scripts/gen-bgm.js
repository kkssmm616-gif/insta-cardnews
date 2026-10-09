/**
 * 저작권 문제 없는 배경음악을 처음부터 합성한다 (외부 음원 소싱 없음 — 전부 ffmpeg
 * sine 오실레이터로 직접 만든 코드 진행 + 아르페지오 멜로디).
 * 결과물을 design/assets/bgm.mp3 에 덮어쓴다 (20초 루프, 릴스 영상 길이에 맞춰
 * instagram-publish.yml 이 -stream_loop -1 로 반복 재생시킴).
 *
 * 2026-10-09부터는 이 스크립트의 결과물을 쓰지 않는다. "합성음이 노래처럼
 * 안 들린다"는 피드백 → 먼저 Pixabay 실제 곡 1개로 교체했다가, 같은 날
 * "곡이 몇 곡이냐, 다양하게 돌려달라"는 요청으로 Pixabay royalty-free
 * 트랙 14개를 받아 design/assets/bgm/{01~14}-*.mp3 + manifest.json으로
 * 로테이션 구조로 다시 바꿨다 (instagram-publish.yml이 날짜+세트 번호
 * 기준으로 매번 다른 곡을 결정적으로 고름). 이 스크립트는 그 이전
 * 합성 방식을 남겨둔 것으로, 외부 음원을 다시 못 쓰게 될 경우의 대체
 * 수단으로 유지한다.
 */
const { execFileSync } = require("child_process");
const path = require("path");

const OUT = path.join(__dirname, "..", "design", "assets", "bgm.mp3");

// C - G - Am - F 진행, 각 코드 5초
const CHORDS = [
  [130.81, 329.63, 392.0], // C3 E4 G4
  [196.0, 246.94, 293.66], // G3 B3 D4
  [220.0, 261.63, 329.63], // A3 C4 E4 (Am)
  [174.61, 220.0, 261.63], // F3 A3 C4
];
const CHORD_DUR = 5;

// 코드별 4음 아르페지오 멜로디 (1.25초 x 4 = 5초, 코드 길이와 맞춤)
const MELODY = [
  [523.25, 659.25, 783.99, 659.25], // C: C5 E5 G5 E5
  [392.0, 493.88, 587.33, 493.88], // G: G4 B4 D5 B4
  [440.0, 523.25, 659.25, 523.25], // Am: A4 C5 E5 C5
  [349.23, 440.0, 523.25, 440.0], // F: F4 A4 C5 A4
];
const NOTE_DUR = 1.25;

const filters = [];
const chordLabels = [];
CHORDS.forEach((tones, i) => {
  const toneLabels = tones.map((f, j) => {
    const lbl = `c${i}t${j}`;
    filters.push(`sine=frequency=${f}:duration=${CHORD_DUR}[${lbl}]`);
    return `[${lbl}]`;
  });
  const mixLbl = `c${i}mix`;
  filters.push(`${toneLabels.join("")}amix=inputs=${tones.length}:duration=first[${mixLbl}]`);
  const fadeLbl = `c${i}`;
  filters.push(`[${mixLbl}]afade=t=in:d=0.3,afade=t=out:st=${CHORD_DUR - 0.3}:d=0.3[${fadeLbl}]`);
  chordLabels.push(`[${fadeLbl}]`);
});
filters.push(`${chordLabels.join("")}concat=n=${CHORDS.length}:v=0:a=1[pad]`);

const noteLabels = [];
MELODY.forEach((notes, i) => {
  notes.forEach((f, j) => {
    const raw = `m${i}n${j}raw`;
    const lbl = `m${i}n${j}`;
    filters.push(`sine=frequency=${f}:duration=${NOTE_DUR}[${raw}]`);
    filters.push(
      `[${raw}]afade=t=in:d=0.02,afade=t=out:st=${NOTE_DUR - 0.3}:d=0.3,volume=0.7[${lbl}]`
    );
    noteLabels.push(`[${lbl}]`);
  });
});
filters.push(`${noteLabels.join("")}concat=n=${noteLabels.length}:v=0:a=1[melody]`);

filters.push(`[pad]volume=0.85[padv]`);
filters.push(`[melody]volume=0.5[melv]`);
filters.push(`[padv][melv]amix=inputs=2:duration=first[mixed]`);
filters.push(
  `[mixed]lowpass=f=7000,aecho=0.6:0.4:60:0.2,afade=t=in:d=0.15,afade=t=out:st=19.6:d=0.4,volume=29dB[out]`
);

const filterComplex = filters.join(";");

const args = [
  "-y",
  "-filter_complex",
  filterComplex,
  "-map",
  "[out]",
  "-ac",
  "1",
  "-ar",
  "44100",
  "-t",
  "20",
  "-b:a",
  "128k",
  OUT,
];

console.log("ffmpeg", args.map((a) => (a.includes(" ") || a.includes(";") ? `"${a}"` : a)).join(" "));
execFileSync("ffmpeg", args, { stdio: "inherit" });
console.log("done:", OUT);
