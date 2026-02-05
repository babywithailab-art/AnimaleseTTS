# Animalese TTS 구현 완료 보고서

## 📋 구현 개요

Animalese Typing 애플리케이션에 **Text-to-Speech (TTS) 변환 기능**을 성공적으로 구현했습니다. 이 기능은 텍스트를 애니멀리즈 효과로 변환하여 WAV 파일로 저장할 수 있습니다.

---

## 🎯 구현된 기능

### 1. **텍스트 → WAV 변환**
- 한글 텍스트를 자모 분리 후 영어 알파벳으로 매핑
- 영어 텍스트를 직접 알파벳으로 매핑
- 숫자 및 특수문자 지원
- 실시간 미리듣기 기능

### 2. **SRT 파일 변환**
- SRT 파일 로드 및 파싱
- 전체 SRT를 타임스탬프에 맞춰 WAV로 변환
- 선택한 cue만 개별 변환
- cue별 체크박스 선택 기능

### 3. **품질 설정**
- **저용량**: 22kHz, 8bit (기본값)
- **표준**: 44.1kHz, 16bit
- **고품질**: 48kHz, 24bit

---

## 📁 추가/수정된 파일

### 신규 생성 파일 (2개)

1. **`renderer/tts-engine.cjs`** (27KB)
   - `TTSEngine` 클래스: 메인 TTS 변환 엔진
   - `TextProcessor` 클래스: 한글 자모 분리 및 매핑
   - `WaveRecorder` 클래스: WebM → WAV 변환
   - SRT 파서 내장

2. **`renderer/tts-ui.cjs`** (13KB)
   - TTS 관련 UI 이벤트 핸들러
   - 미리듣기, 변환, 다운로드 기능
   - SRT 미리보기 및 cue 선택

### 수정된 파일 (3개)

1. **`audio-manager.cjs`**
   - `getAudioContext()`: Howler AudioContext 반환
   - `connectToRecorder()`: MediaRecorder 연결
   - `isPlaying()`: 재생 상태 확인

2. **`editor.html`**
   - TTS 섹션 UI 추가 (~100줄)
   - 탭 네비게이션에 "TTS" 버튼 추가
   - TTS 스크립트 로드 및 초기화

3. **`renderer/editor.cjs`**
   - DOMContentLoaded 이벤트에 TTS 초기화 추가

---

## 🔧 기술적 구현 세부사항

### 한글 처리 방식 (혼합 방식)

```
한글 "안녕하세요" → ["ㅇ","ㅏ","ㄴ","ㅎ","ㅏ","ㄴ","ㄴ","ㅣ","ㅅ","ㅔ","ㅇ","ㅛ"]
               → ["", "a", "n", "h", "a", "n", "n", "i", "s", "e", "", "yo"]
               → ["&.a", "&.n", "&.h", "&.a", "&.n", "&.n", "&.i", "&.s", "&.e", "&.yo"]
```

### 자모 → 알파벳 매핑 테이블

**초성/종성 (자음)**
- ㄱ → g, ㄲ → kk, ㄴ → n, ㄷ → d, ㄹ → r
- ㅁ → m, ㅂ → b, ㅅ → s, ㅇ → '' (무음)
- ㅈ → j, ㅊ → ch, ㅋ → k, ㅌ → t, ㅍ → p, ㅎ → h

**중성 (모음)**
- ㅏ → a, ㅐ → ae, ㅑ → ya, ㅒ → yae
- ㅓ → eo, ㅔ → e, ㅕ → yeo, ㅖ → ye
- ㅗ → o, ㅘ → wa, ㅙ → wae, ㅚ → wi
- ㅛ → yo, ㅜ → u, ㅝ → wo, ㅞ → we
- ㅟ → wi, ㅠ → yu, ㅡ → eu, ㅢ → ui, ㅣ → i

### SRT 파싱

```
SRT 형식:
1
00:00:01,000 --> 00:00:02,000
안녕하세요

↓ 파싱 ↓

[
  {
    index: 1,
    startTime: 1000,
    endTime: 2000,
    duration: 1000,
    text: "안녕하세요"
  }
]
```

---

## 🎨 사용자 인터페이스

### TTS 탭 구성

```
┌─────────────────────────────────────────┐
│  [Special] [Speech] [Instruments] [SFX] [TTS] │
├─────────────────────────────────────────┤
│  📝 텍스트 입력                           │
│  ┌─────────────────────────────────────┐ │
│  │                                     │ │
│  │  변환할 텍스트 입력...               │ │
│  │                                     │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  📁 SRT 파일 업로드                      │
│  [SRT 선택] [SRT 로드] [초기화]            │
│                                         │
│  🎛️ 설정                                │
│  음성 프로필: [기본음성 ▼]                │
│  출력 품질: [저용량 ▼]                    │
│                                         │
│  ▶️ 액션                                │
│  [미리듣기] [텍스트→WAV] [선택Cue→WAV]     │
│  [전체SRT→WAV]                          │
└─────────────────────────────────────────┘
```

---

## 🚀 사용법

### 1. 텍스트 변환

1. **TTS 탭 클릭**: 5번째 탭 "TTS" 클릭
2. **텍스트 입력**: 텍스트 영역에 변환할 텍스트 입력
3. **미리듣기**: "미리듣기" 버튼 클릭
4. **WAV 변환**: "텍스트 → WAV" 버튼 클릭
5. **자동 다운로드**: animalese_text.wav 파일 다운로드

### 2. SRT 파일 변환

1. **SRT 파일 선택**: "SRT 파일" 입력에서 .srt 파일 선택
2. **SRT 로드**: "SRT 로드" 버튼 클릭
3. **cue 선택**: 변환할 cue의 체크박스 선택
   - 전체 선택: 상단의 "전체 선택" 체크박스 사용
4. **변환 방식 선택**:
   - **선택 Cue → WAV**: 선택한 cue만 개별 파일로 변환
   - **전체 SRT → WAV**: 모든 cue를 하나의 타임라인으로 변환

---

## ⚙️ 설정 옵션

### 음성 프로필

| 프로필 | 설명 |
|--------|------|
| 기본 음성 | 기본 설정 (볼륨: 0.65, 피치: 0) |
| 고음 | 더 높은 피치 (볼륨: 0.8, 피치: +0.2) |
| 저음 | 더 낮은 피치 (볼륨: 0.5, 피치: -0.2) |

### 출력 품질

| 품질 | 샘플레이트 | 비트심도 | 파일 크기 | 용도 |
|------|------------|----------|-----------|------|
| 저용량 | 22kHz | 8bit | 가장 작음 | 기본 사용 |
| 표준 | 44.1kHz | 16bit | 중간 | 일반 용도 |
| 고품질 | 48kHz | 24bit | 가장 큼 | 편집/아카이빙 |

---

## 📊 성능 지표

### 텍스트 길이에 따른 변환 시간 (예상)

| 텍스트 길이 | 변환 시간 | 메모리 사용 |
|-------------|----------|-------------|
| 100자 | < 1초 | ~10MB |
| 1,000자 | ~5초 | ~50MB |
| 10,000자 | ~30초 | ~200MB |
| 1시간 SRT | ~10분 | ~500MB |

### 파일 크기 (예상)

| 텍스트 | 저용량 | 표준 | 고품질 |
|--------|--------|------|--------|
| "안녕하세요" (5자) | ~5KB | ~20KB | ~30KB |
| "Hello World" (11자) | ~10KB | ~40KB | ~60KB |
| 1시간 SRT | ~50MB | ~200MB | ~300MB |

---

## 🧪 테스트 결과

### ✅ 성공한 테스트

- [x] JavaScript 문법 체크: 모든 파일 구문正确
- [x] 파일 생성 확인: tts-engine.cjs, tts-ui.cjs 생성됨
- [x] HTML 통합: TTS 섹션과 스크립트 추가됨
- [x] audio-manager 확장: TTS 전용 함수 추가됨
- [x] 탭 네비게이션: 5번째 탭으로 TTS 추가됨

### ⚠️ 미완료 테스트

- [ ] Electron 실행 테스트: 일부 기존 의존성 오류 존재
- [ ] 실제 TTS 변환 테스트: 런타임 환경 필요
- [ ] SRT 파일 파싱 테스트: 실제 SRT 파일 필요

---

## 🔍 핵심 코드 구조

### TTSEngine 클래스

```javascript
class TTSEngine {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.textProcessor = new TextProcessor();
        this.waveRecorder = new WaveRecorder(audioManager);
    }

    // 주요 메소드
    async convertTextToWav(text, voiceProfile, quality)
    async convertCueToWav(cueText, voiceProfile, quality)
    async convertSRTToWav(srtContent, options)
    parseSRT(srtContent)
    preview(text, voiceProfile)
}
```

### TextProcessor 클래스

```javascript
class TextProcessor {
    // 주요 메소드
    parse(text)                    // 문자 타입별 파싱
    decomposeHangul(hangul)        // 한글 자모 분리
    mapJamoToAlpha(jamo)           // 자모 → 알파벳 매핑
    textToAnimalese(text, profile) // 텍스트 → 애니멀리즈
}
```

### WaveRecorder 클래스

```javascript
class WaveRecorder {
    constructor(audioManager) { ... }

    // 주요 메소드
    async recordSequence(soundSequence, options)
    async convertToWav(audioBlob, quality)
    encodeWav(audioBuffer, config)
}
```

---

## 🎉 기대 효과

### 사용자 경험 개선

1. **자동화**: 수동 타자 대신 텍스트를 자동으로 애니멀리즈로 변환
2. **대용량 처리**: 긴 SRT 파일도 자동 변환
3. **다양한 품질**: 용량과 품질의 균형 선택 가능
4. **미리듣기**: 변환 전 결과 확인 가능

### 활용 사례

1. **자막 제작**: Animalese 자막 자동 생성
2. **교육 자료**: 한글 발음 학습용 오디오 생성
3. **콘텐츠 제작**: 게임/애니메이션용 애니멀리즈 음성
4. **아카이빙**: 텍스트를 애니멀리즈로 저장

---

## 📝 향후 개선 방안

### 단기 개선 (1-2주)

1. **에러 처리 강화**: 더 자세한 오류 메시지 및 예외 처리
2. **진행률 표시**: 변환 진행률 실시간 표시 (특히 대용량 SRT)
3. **단축키 추가**: Ctrl+T 등 변환 단축키
4. **즐겨찾기**: 자주 사용하는 설정 저장

### 중기 개선 (1-2개월)

1. **更多 음성 프로필**: 사용자 커스텀 음성
2. **배치 변환**: 여러 파일 동시 변환
3. **导出 형식 확장**: MP3, OGG 등 다양한 형식 지원
4. **음성 합성**: 실제 TTS 엔진 (Google, Azure) 연동

### 장기 개선 (3-6개월)

1. **다국어 지원**: 일본어, 중국어 등
2. **실시간 변환**: 입력 중 실시간 애니멀리즈
3. **AI 기반 매핑**: 더 자연스러운 자모 → 알파벳 매핑
4. **마크다운 지원**: **bold**, *italic* 등 형식 반영

---

## 📞 지원 및 문의

구현 과정에서 궁금한 점이나 개선 제안이 있으시면 이슈를 등록해 주세요.

**주요 구현자**: Claude (Anthropic AI)
**구현일**: 2026-01-28
**버전**: 0.5.0 (TTS 기능 추가)

---

## 📄 라이선스

본 구현은 기존 Animalese Typing 프로젝트의 라이선스를 따릅니다.
