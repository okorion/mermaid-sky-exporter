# Mermaid Sky Exporter

Mermaid 다이어그램을 브라우저에서 즉시 렌더링하고 SVG, PNG, JPG로 내보낼 수 있는 Next.js 앱입니다. Monaco와 CodeMirror 편집기 전환, URL 기반 공유 링크, 모바일 최적화 레이아웃, 설치 가능한 PWA 흐름을 제공합니다.

![Mermaid Sky Exporter homepage](public/homepage.png)

## 주요 기능

- 실시간 Mermaid 렌더링과 자동 맞춤 미리보기
- Monaco / CodeMirror 편집기 전환
- SVG / PNG / JPG 내보내기와 비율 프리셋
- URL 인코딩 기반 공유 링크
- 모바일에서 겹치지 않도록 정리된 상단 툴바와 export 컨트롤
- 설치 가능한 PWA와 기본 오프라인 앱 셸

## 시작하기

```bash
git clone https://github.com/okorion/mermaid-sky-exporter.git
cd mermaid-sky-exporter
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

## PWA 및 모바일 메모

- `app/manifest.ts`와 `public/sw.js`를 통해 PWA 메타데이터와 서비스 워커를 제공합니다.
- 서비스 워커는 production 환경의 secure context 에서만 등록됩니다.
- 캐시는 same-origin 앱 셸과 정적 자산으로 제한해 일반 웹 배포 동작에 미치는 영향을 최소화했습니다.
- 설치 버튼은 실제 설치 가능한 브라우저에서만 표시되며, iOS Safari는 홈 화면 추가 안내로 대체됩니다.
- 상세 구현 메모: [docs/mobile-pwa.md](docs/mobile-pwa.md)

## 기술 스택

- Next.js App Router
- React 19
- TypeScript
- Mermaid.js
- Monaco Editor
- CodeMirror

## License

MIT
