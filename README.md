# MemEat Frontend

MemEat 게임의 프론트엔드 클라이언트입니다. React와 TypeScript를 사용하여 실시간 멀티플레이어 뱀 게임을 제공하며, Web3 지갑 연동과 블록체인 통합을 지원합니다.

## 프로젝트 소개

MemEat-FE는 React 기반의 웹 게임 클라이언트로, 다음과 같은 기능을 제공합니다:

- **실시간 멀티플레이어 게임**: Canvas API를 사용한 부드러운 게임 렌더링
- **Web3 지갑 연동**: Reown AppKit (구 WalletConnect)을 통한 지갑 연결
- **블록체인 통합**: Wagmi와 Viem을 사용한 스마트 컨트랙트 상호작용
- **실시간 통신**: Socket.IO 클라이언트를 통한 게임 상태 동기화
- **상태 관리**: Zustand를 사용한 경량 전역 상태 관리

## 아키텍처

```
MemEat-FE/
├── src/
│   ├── App.tsx                # 메인 앱 컴포넌트
│   ├── main.tsx               # 앱 진입점
│   ├── components/            # UI 컴포넌트
│   │   ├── game/              # 게임 관련 컴포넌트
│   │   │   └── GameCanvas.tsx # 게임 캔버스 렌더링
│   │   └── ui/                # UI 컴포넌트
│   │       ├── StartScreen.tsx    # 시작 화면
│   │       ├── GameOver.tsx       # 게임 오버 화면
│   │       ├── Leaderboard.tsx    # 리더보드
│   │       ├── GameOverlay.tsx    # 게임 오버레이 (점수, 탈출 버튼)
│   │       ├── NavBar.tsx         # 네비게이션 바
│   │       └── MapTokens.tsx      # 맵 토큰 표시
│   ├── hooks/                 # React 커스텀 훅
│   │   ├── useSocketListeners.ts  # Socket.IO 리스너
│   │   └── useGame.ts             # 게임 로직 훅
│   ├── services/              # 서비스 레이어
│   │   └── socket.ts          # Socket.IO 클라이언트
│   ├── store/                 # 상태 관리 (Zustand)
│   │   └── gameStore.ts       # 게임 상태 스토어
│   ├── providers/             # React Context Providers
│   │   └── Web3Provider.tsx   # Web3 프로바이더
│   ├── types/                 # TypeScript 타입 정의
│   ├── abis/                  # 스마트 컨트랙트 ABI
│   ├── styles/                # 전역 스타일
│   └── assets/                # 정적 리소스 (이미지, 폰트 등)
├── public/                    # 정적 파일
├── index.html                 # HTML 템플릿
├── vite.config.ts             # Vite 설정
├── tsconfig.json              # TypeScript 설정
├── package.json
└── .env                       # 환경 변수 설정
```

### 주요 컴포넌트

#### 1. GameCanvas
- Canvas API를 사용한 게임 렌더링
- 키보드 입력 처리
- 프레임 애니메이션

#### 2. Socket Service
- Socket.IO를 통한 실시간 통신
- 게임 상태 동기화
- 이벤트 리스너 관리

#### 3. Game Store (Zustand)
- 플레이어 상태 관리
- 게임 맵 상태 (음식, 다른 플레이어)
- 리더보드 및 토큰 정보

#### 4. Web3 Provider
- Reown AppKit을 통한 지갑 연결
- Wagmi와 Viem을 사용한 블록체인 상호작용
- 스마트 컨트랙트 호출 (입장료 지불, 보상 수령)

## 실행 방법

### 사전 요구사항

- Node.js 18.x 이상
- npm 또는 yarn

### 설치

```bash
cd MemEat-FE
npm install
```

### 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 설정합니다:

```env
# Etherscan API Key (블록 탐색기 연동)
VITE_ETHERSCAN_API_KEY=your_etherscan_api_key

# Supabase Public Key (선택사항)
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# WormGame 컨트랙트 주소
VITE_CONTRACT_ADDRESS=0x04686e9284B54d8719A5a4DecaBE82158316C8f0
```

### 개발 모드 실행

```bash
npm run dev
```

서버가 `http://localhost:5173`에서 실행됩니다.

### 프로덕션 빌드

```bash
# TypeScript 컴파일 및 빌드
npm run build

# 빌드된 파일 미리보기
npm run preview
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

## 주요 기능

### 1. 지갑 연결 및 게임 입장

1. NavBar에서 "Connect Wallet" 클릭
2. Reown AppKit 모달을 통해 지갑 연결
3. StartScreen에서 입장료 선택 (Native M 또는 MRC-20 토큰)
4. "Start Game" 클릭 시 스마트 컨트랙트의 `enterGame()` 호출
5. 트랜잭션 확인 후 게임 시작

### 2. 실시간 게임 플레이

- **이동**: 방향키 (↑ ↓ ← →)
- **목표**: 맵에 있는 토큰을 수집하여 성장
- **탈출 조건**: 획득한 토큰의 총 M 환산 가치가 입장료 이상일 때 "Escape" 버튼 활성화

### 3. 탈출 및 보상 수령

1. 탈출 조건 충족 시 "Escape" 버튼 클릭
2. 백엔드에서 획득 토큰 검증
3. 스마트 컨트랙트 상태가 Exited로 변경
4. GameOver 화면에서 "Claim Reward" 버튼 클릭
5. 스마트 컨트랙트의 `claimReward()` 호출하여 토큰 수령

### 4. 리더보드 및 통계

- 실시간 리더보드 (점수 기준)
- 현재 플레이어 수
- 획득한 토큰 목록

## 게임 플로우

```
┌──────────────┐
│ Start Screen │
│ (지갑 연결)   │
└──────┬───────┘
       │ enterGame()
       ▼
┌──────────────┐
│   Playing    │ ◄─── 실시간 게임 진행
│ (Canvas)     │      (Socket.IO 동기화)
└──────┬───────┘
       │
       │ 탈출 조건 충족
       ▼
┌──────────────┐
│  Game Over   │
│  (Success)   │
└──────┬───────┘
       │ claimReward()
       ▼
┌──────────────┐
│   Claimed    │
│ (보상 수령)   │
└──────────────┘
```

## 기술 스택

### Core
- **Framework**: React 19
- **언어**: TypeScript
- **빌드 도구**: Vite 7
- **상태 관리**: Zustand 5

### Web3
- **지갑 연동**: Reown AppKit (WalletConnect v3)
- **블록체인**: Wagmi 3, Viem 2
- **스마트 컨트랙트**: Ethers.js 6

### 통신
- **실시간 통신**: Socket.IO Client
- **HTTP 클라이언트**: Axios

### UI/UX
- **렌더링**: Canvas API (게임), React (UI)
- **스타일링**: CSS Modules
- **쿼리**: TanStack React Query

## 배포

### Vercel / Netlify 배포

1. 프로젝트를 GitHub에 푸시
2. Vercel 또는 Netlify에서 프로젝트 가져오기
3. 환경 변수 설정 (`.env` 내용)
4. 빌드 명령어: `npm run build`
5. 출력 디렉토리: `dist`

### 수동 배포

```bash
# 빌드
npm run build

# dist/ 폴더를 웹 서버에 배포 (nginx, Apache 등)
```

## 개발 가이드

### 새로운 UI 컴포넌트 추가

1. [src/components/ui/](src/components/ui/)에 컴포넌트 파일 생성
2. [src/App.tsx](src/App.tsx)에서 import 및 사용

### 게임 로직 수정

1. [src/components/game/GameCanvas.tsx](src/components/game/GameCanvas.tsx)에서 렌더링 로직 수정
2. [src/store/gameStore.ts](src/store/gameStore.ts)에서 상태 관리 로직 수정

### 블록체인 연동 수정

1. [src/abis/](src/abis/)에 최신 ABI 파일 업데이트
2. [src/providers/Web3Provider.tsx](src/providers/Web3Provider.tsx)에서 Wagmi 설정 수정
3. 컴포넌트에서 Wagmi hooks 사용:
   ```typescript
   import { useWriteContract, useReadContract } from 'wagmi'

   const { writeContract } = useWriteContract()

   // enterGame 호출 예시
   writeContract({
     address: CONTRACT_ADDRESS,
     abi: WormGameABI,
     functionName: 'enterGame',
     args: [tokenAddress, amount],
     value: isNative ? amount : 0n,
   })
   ```

### Socket.IO 이벤트 추가

1. [src/services/socket.ts](src/services/socket.ts)에 새 이벤트 리스너 추가
2. [src/hooks/useSocketListeners.ts](src/hooks/useSocketListeners.ts)에서 훅으로 래핑

## 환경별 설정

### Development

```bash
npm run dev
```

- Hot Module Replacement (HMR) 활성화
- Source Maps 포함
- 개발 서버: http://localhost:5173

### Production

```bash
npm run build
npm run preview
```

- 코드 최적화 및 번들링
- Tree-shaking 적용
- 압축 및 난독화

## 트러블슈팅

### 지갑 연결 실패

- 메타마스크 등 지갑이 설치되어 있는지 확인
- 올바른 네트워크(Formicarium Testnet)에 연결되어 있는지 확인

### Socket.IO 연결 실패

- 백엔드 서버가 실행 중인지 확인
- CORS 설정 확인 (백엔드의 [src/server.ts](../MemEat-BE/src/server.ts))

### 빌드 오류

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

## 브라우저 지원

- Chrome/Edge: 최신 2개 버전
- Firefox: 최신 2개 버전
- Safari: 최신 2개 버전

## 라이선스

ISC
