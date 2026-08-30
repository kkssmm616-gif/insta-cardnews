design/assets/library/의 경제 뉴스 카테고리별 사진 라이브러리를 월간 정기 보충하는 작업이다.

1. design/assets/library/manifest.json을 읽어서 각 카테고리별 현재 사진 수를 파악한다.
2. 각 카테고리마다 부족하다고 판단되면(특히 사진 수가 적은 카테고리 우선) 2~3장씩 새로 소싱한다.
   기존 소싱 규칙을 그대로 따른다:
   - Unsplash 무료 라이선스만 (images.unsplash.com, plus.unsplash.com 프리미엄 금지)
   - WebSearch로 후보 페이지 검색 → WebFetch로 og:image의 images.unsplash.com 직링크 확인
   - 다운로드: curl로 "?fm=jpg&q=55&w=900&auto=format&fit=crop" 파라미터 사용
   - 반드시 Read 도구로 육안 확인: 얼굴 클로즈업/특정국가 화폐·정치인·종교지도자 초상/브랜드 로고 노출 배제
   - manifest.json에 이미 등록된 source URL과 중복되는 사진은 다시 받지 않는다 (다양성 확보가 목적)
3. 새로 받은 사진은 각 카테고리 폴더에 다음 번호로 저장하고, manifest.json에도 항목을 추가한다.
4. 전체 카테고리 합계가 대략 120~150장 수준이 되도록 점진적으로 늘려간다 (한 번에 다 채우지 않아도 됨 — 매달 조금씩 늘어나면 됨).
5. 작업이 끝나면 git add / commit(메시지: "월간 사진 라이브러리 보충 (자동)") / push까지 수행한다.
   커밋 메시지 끝에 아래 두 줄을 포함한다:

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JMYEXK6td7XEuyfGoqQNrd

6. git 관련 명령 외의 위험한 작업(강제 푸시, 다른 브랜치 삭제, 다른 파일 수정 등)은 하지 않는다.
