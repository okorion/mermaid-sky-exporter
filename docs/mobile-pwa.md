# 모바일 레이아웃 및 PWA 메모

## 목표

- 모바일 상단 버튼이 서로 침범하지 않도록 레이아웃을 안정화한다.
- 설치 가능한 PWA 흐름과 기본 오프라인 앱 셸을 제공한다.
- 기존 웹 배포 동작에 불필요한 영향을 주지 않도록 캐시 범위를 제한한다.

## 모바일 레이아웃 변경

- `components/TopBar.tsx`
  - 버튼 영역을 줄바꿈 가능한 구조로 바꿨다.
  - 공유 버튼은 모바일에서 Web Share API가 가능하면 네이티브 공유 시트를 열고, 아니면 링크 복사로 폴백한다.
  - 설치 버튼은 `beforeinstallprompt` 이벤트가 있을 때만 노출한다.
  - iOS Safari에서는 설치 버튼 대신 홈 화면 추가 안내를 노출한다.
- `components/ExportButtons.tsx`
  - 모바일에서는 파일명 입력과 export 제어를 2단 구성으로 배치한다.
  - 가로 스크롤에 의존하지 않도록 입력창과 선택 요소 폭을 다시 조정했다.
- `app/page.tsx`
  - 상단 컨트롤 바의 고정 높이를 제거했다.
  - 큰 화면에서만 editor 패널을 sticky 로 유지하도록 바꿨다.
- `styles/globals.css`
  - `safe-area-inset-*` 기반 CSS 변수를 추가해 standalone/iOS 환경에서도 상단 sticky UI가 노치에 가리지 않도록 했다.

## PWA 동작

- `app/manifest.ts`
  - 앱 이름, 아이콘, 스크린샷, standalone 표시 모드를 제공한다.
- `app/layout.tsx`
  - `viewportFit: "cover"` 와 Apple web app 메타데이터를 유지한다.
  - 클라이언트 전용 `PwaEnhancements`를 연결해 서비스 워커를 등록한다.
- `components/PwaEnhancements.tsx`
  - production + secure context 에서만 `/sw.js`를 등록한다.
- `public/sw.js`
  - same-origin 앱 셸과 정적 자산만 캐시한다.
  - navigation 요청은 network-first 로 처리하고 실패 시 캐시된 앱 셸을 반환한다.
  - 외부 요청, 다운로드 요청, 사용자 다이어그램 상태 저장은 가로채지 않는다.
  - 캐시 버전을 분리해 새 배포 후 이전 정적 캐시가 계속 누적되지 않도록 한다.

## 플랫폼별 UX

- Android/Chromium
  - `beforeinstallprompt` 이벤트가 노출될 때만 Install 버튼을 표시한다.
  - 공유 버튼은 가능하면 Web Share API를 사용하고, 불가능하면 링크 복사로 폴백한다.
- iOS/iPadOS Safari
  - 설치 프롬프트 이벤트가 없으므로 Install 버튼 대신 "홈 화면에 추가" 안내를 표시한다.
  - iPadOS Safari의 데스크톱형 user agent도 별도 감지해 안내가 빠지지 않도록 처리한다.
- 데스크톱 브라우저
  - 공유 버튼은 주로 링크 복사 경로로 동작한다.
  - 서비스 워커는 지원 브라우저에서만 등록되며, 앱 셸 재방문 위주의 오프라인 접근성만 제공한다.

## 의도적으로 하지 않은 것

- aggressive precache
- background sync
- push notification
- cross-origin 응답 캐싱
- 사용자 편집 상태의 별도 영구 저장

## 검증 체크리스트

- `npm run build`
- 모바일 폭에서 상단 버튼과 export 컨트롤이 겹치지 않는지 확인
- Android/Chromium 계열에서 설치 버튼과 공유 시트가 노출되는지 확인
- iOS Safari에서 홈 화면 추가 안내가 보이는지 확인
- 한 번 로드한 뒤 오프라인에서 앱 셸이 다시 열리는지 확인
