# InstaCardnews — 프로젝트 가이드

매일 자동으로 경제 뉴스 3개를 골라 인스타그램 카드뉴스(캐러셀)+릴스로 발행하는
완전 자동화 파이프라인. claude.ai 클라우드 루틴이 콘텐츠를 만들고, GitHub Actions가
렌더링·발행까지 전부 처리한다. 평소에는 사람이 할 일이 없고, 가끔 디자인/정책 변경
요청이 들어오면 이 저장소 코드를 고치는 식으로 작업한다.

**저장소**: `kkssmm616-gif/insta-cardnews` (public). GitHub Pages로 `docs/`가 공개됨.
**인스타 계정**: `@instacardnewst` (표시 이름 "매일 경제뉴스 카드뉴스")

---

## 전체 파이프라인 흐름

1. **claude.ai 클라우드 루틴**(매일 08:00 KST) — `일일_경제_카드뉴스_자동화_프롬프트.md`의
   내용이 루틴의 "지침" 필드에 그대로 등록돼 있음. 서로 다른 카테고리의 경제 뉴스 3개를
   골라 `design/set{1,2,3}/{Main,Cut2..Cut6}.dc.html` 6컷씩 채우고, 세트별 캡션
   (`docs/{date}-caption-{N}.txt`)도 직접 써서 `claude/*` 브랜치에 push.
   - **루틴 지침을 고칠 때마다**: 로컬 `.md` 파일을 고친 뒤, 전체 내용을 클립보드에
     복사해서(`Set-Clipboard`) claude.ai 루틴 편집 화면 textarea에 붙여넣고 저장 →
     `document.querySelector('textarea').value`를 다시 읽어서 길이/핵심 문구가
     일치하는지 검증하는 방식으로 반영한다 (루틴 쪽엔 API가 없어서 이 방법뿐).
2. **`.github/workflows/auto-merge-claude-branches.yml`** — `claude/**` 브랜치 push를
   감지해 자동으로 master에 머지. (루틴은 master에 직접 push할 권한이 없음.)
3. **`.github/workflows/instagram-publish.yml`** — `workflow_run`으로 위 머지 워크플로
   완료를 트리거 삼아 실행 (일반 `push` 트리거는 `GITHUB_TOKEN`으로 만든 커밋엔 안 먹힘).
   - `render` 잡: 오늘 날짜(KST) 기준으로 존재하는 세트만 Playwright로 JPEG 6장 렌더링
     (`scripts/render-for-instagram.js`) → ffmpeg로 슬라이드쇼 릴스(`reel.mp4`, 컷당 4초,
     `design/assets/bgm/`에서 날짜+세트 기준으로 로테이션 선곡한 배경음악 포함) 생성 →
     캡션 파일 없으면 기본 템플릿으로 폴백 생성 → 커밋.
   - `wait-for-pages` 잡: GitHub Pages에 이미지/릴스가 실제로 떴는지 폴링 확인.
   - `publish` 잡: 준비된 세트 중 **첫 번째만 즉시** 캐러셀+릴스 게시, 나머지는
     `scripts/build-publish-queue.js`로 8시간/16시간 뒤 발행 예약(`docs/{date}-publish-queue.json`).
     **승인 게이트 없음** — 예전엔 GitHub Environment로 사람이 모바일에서 승인해야
     했지만 2026-09-13에 제거함 (아래 "알아둘 것" 참고).
4. **`.github/workflows/instagram-publish-queue.yml`** — 30분마다 cron으로 돌면서
   `docs/*-publish-queue.json`의 예약 시각이 된 세트를 `scripts/process-publish-queue.js`로
   발행. 추가 승인 불필요 (최초 승인 시점에 이미 그날 전체가 승인된 것으로 간주).

---

## 디자인 시스템 (현재 버전 — 크림+네이비+부엉이 마스코트 하이브리드)

- 배경 크림색(`#F6F1E7`) + 도트 패턴, 네이비(`#1A2B45`)/레드오렌지(`#E8543E`)/골드(`#F2A93B`) 포인트
- Noto Sans KR만 사용 (900 헤드라인 / 500~700 본문)
- 컴포넌트 클래스 재사용: `.num-badge`+`.section-title`, `.cards`/`.card`, `.big-stat`,
  `<table>`(`.hl`로 강조), `.impact-row`(취소선→강조), `.tip-list`/`.tip`, `.callout`
- 6컷 전부에 네이비 부엉이 마스코트(인라인 SVG, 거의 그대로 복붙) + 말풍선
- Main·Cut2 두 컷에만 실사 사진 (`design/assets/library/{category}/*.jpg`, manifest.json에
  카테고리별로 미리 검증된 ~106장 보유 — 새로 받을 때만 소싱 규칙 적용)
- `design/set{N}/*.dc.html`을 고칠 땐 기존 파일의 `<style>` 블록을 그대로 복사해서
  텍스트/숫자만 바꾸는 게 가장 안전함 — 클래스 구조가 복잡하므로 처음부터 새로 짜지 말 것
- `.dc.html`은 완전히 자기 완결적이어야 함 (상대경로 이미지 불가 — `design/embed-photo.js`로
  data URI 인라인 임베드, 200자마다 줄바꿈해서 Read 도구로도 읽을 수 있게 저장)

---

## 알아둘 것 / 운영 규칙

- **로컬 클론이 자주 며칠씩 뒤처져 있음** — 뭔가 고치기 전에 항상 `git fetch origin` +
  `git log origin/master -5`로 루틴이 그 사이 뭘 커밋했는지 먼저 확인할 것. 디자인 파일을
  고칠 땐 같은 날 이미 큐에 올라간 게 있어도 안전함 (렌더링은 생성 시점에 끝나고,
  큐 처리는 이미 렌더링된 이미지를 재생할 뿐 템플릿을 다시 읽지 않음).
- **"현재 세션만 반영됨" 패턴** — bgm/릴스 속도/디자인 등을 바꿔도 이미 `docs/exports/`에
  렌더링된 과거 릴스는 안 바뀜. 다음 "새로 렌더링되는" 실행부터 적용됨. 사용자에게
  설명할 때 항상 이 점을 짚어줄 것.
- **승인 게이트는 없음** (2026-09-13 제거). 원래 요구사항은 "게시 전 확인 후 클릭 한 번으로
  승인"이었지만, Meta API가 아래 항목 때문에 승인이 무의미해져서 제거함. 되살리려면
  `instagram-publish.yml`의 `publish` 잡에 `environment: instagram-publish` 한 줄만
  추가하면 됨.
- **Meta Graph API가 `code:4/subcode:2207051` ("Application request limit reached")를
  자주 반환하지만, 실제로는 게시가 성공한 경우가 많음** — 이건 진짜 rate limit이 아니라
  스팸 오탐 플래그의 오반환으로 판명됨 (Meta 쪽 알려진 버그). 그래서
  `scripts/publish-to-instagram.js`/`publish-reel-to-instagram.js`에
  `wasRecentlyPublished()` 안전장치가 있음 — 에러가 나도 바로 실패 처리하지 않고, 최근
  게시물 목록을 조회해서 같은 캡션(첫 줄 기준)의 글이 15분 내에 실제로 올라와 있는지
  확인한 뒤에만 재시도/실패를 결정함. **이 로직을 건드리거나 제거하지 말 것** — 없으면
  중복 게시나 가짜 실패 보고가 발생함.
- **배경음악**: `design/assets/bgm/{01~33}-*.mp3` — Pixabay royalty-free 음원 33곡 풀.
  날짜(연중 일수)+세트 번호로 결정적 로테이션(`instagram-publish.yml`의 `mapfile`+`DOY`
  공식). 새 곡을 더 추가하려면 `design/assets/bgm/manifest.json`에 출처를 기록하고
  동일한 전처리(29초 트림 + `loudnorm=I=-16:LRA=11:TP=-1.5` + 2.5초 페이드아웃)를
  적용해서 파일만 추가하면 됨 — 워크플로 코드 수정 불필요 (폴더를 glob함).
  **실제 가요/상표권 있는 그룹명이 제목에 들어간 트랙은 쓰지 말 것** (BlackPink 등 —
  음원 자체가 오리지널이어도 제목에 실명이 들어간 건 상표 리스크로 제외했음).
- **민감 정보(토큰 등)는 절대 대화에 붙여넣지 말 것** — GitHub Secrets UI에 사용자가
  직접 저장하도록 안내할 것. (`IG_ACCESS_TOKEN`은 저장소 시크릿.)
- **사용자는 2026-09-22부터 매일 아침 게시 결과를 본인이 직접 확인함** — 먼저 나서서
  "오늘 게시물 확인해볼까요?"라고 묻지 말 것. 물어보면 당연히 확인해줄 것.
- ffmpeg가 로컬(Windows)에 기본 설치돼 있지 않음 — 필요하면
  `winget install --id Gyan.FFmpeg`로 설치, 바이너리는
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-*\bin\`에 생김.
  GitHub Actions 러너에도 `apt-get install -y ffmpeg`로 매번 명시적으로 설치함.
- **코드/워크플로를 바꿀 땐 실제 렌더링된 이미지로 production ffmpeg 명령을 로컬에서
  그대로 재현해서 검증한 뒤에 커밋하는 습관**이 이 저장소 전반에 자리잡혀 있음 — 계속
  유지할 것 (CI에서 실패하면 디버깅 비용이 훨씬 큼).

---

## 자주 쓰는 명령어

```bash
# 최근 실행 확인
gh run list --repo kkssmm616-gif/insta-cardnews --workflow=instagram-publish.yml --limit 5

# 특정 실행 로그
gh run view <run-id> --repo kkssmm616-gif/insta-cardnews --log

# 워크플로 수동 트리거 (오늘 날짜로)
gh workflow run instagram-publish.yml --repo kkssmm616-gif/insta-cardnews
```
