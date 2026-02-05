# MediaRecorder 0바이트 문제 해결 보고서

## 문제 요약

Electron 환경에서 MediaRecorder API를 사용하여 Howler.js 오디오를 녹음할 때, 0바이트의 빈 파일이 생성되는 문제가 발생했습니다.

## 원인 분석

Electron 환경에서는 Howler.js의 오디오 라우팅이 브라우저와 다르게 작동합니다:

1. **Howler._masterGain 접근 제한**: Electron에서 Howler._masterGain이 private이거나 올바르게 노출되지 않음
2. **Audio Context 경로 차이**: Electron의 오디오 렌더링 경로가 브라우저와 다름
3. **권한 및 드라이버 제한**: Electron 환경의 오디오 권한 또는 드라이버 제한

## 해결책

### 1. audio-manager.cjs 개선

#### 환경 감지 및 다중 연결 전략
```javascript
function connectToRecorder(destination) {
    // Electron 환경 감지
    const isElectron = typeof window !== 'undefined' &&
                      typeof window.process === 'object' &&
                      window.process.type === 'renderer';

    if (isElectron) {
        // Electron 전용: Howler._sounds 직접 연결
        connectViaHowlerSounds(destination);
        return;
    }

    // 브라우저 환경: 기존 masterGain 방식
    // ...
}
```

#### Electron 전용 연결 함수
```javascript
function connectViaHowlerSounds(destination) {
    // _sounds 배열의 각 사운드에 대해 직접 gain node 연결
    Howler._sounds.forEach((sound, index) => {
        if (sound._node && sound._node.gain) {
            sound._node.gain.connect(destination);
        }
    });
}
```

### 2. tts-engine.cjs 개선

#### 재시도 메커니즘
- 최대 3회 재시도 (attempt 0, 1, 2)
- 실패 시 2초 대기 후 재시도
- 마지막 시도에서 상세한 오류 메시지 제공

#### 상세한 디버깅 로그
```javascript
console.log('destination.stream.active (초기):', destination.stream.active);
console.log('AudioTrack 정보:', {
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
    label: track.label
});
```

#### 0바이트 검출 및 경고
```javascript
if (webmBlob.size === 0) {
    console.error('❌ 녹음된 오디오가 0바이트입니다!');
    throw new Error('오디오 캡처에 실패했습니다 (0바이트)');
}
```

## 변경된 파일 목록

### 1. audio-manager.cjs
**위치**: `C:\Users\Goryeng\Desktop\Animalese\animaleseTTS\audio-manager.cjs`

**주요 변경사항**:
- `connectToRecorder()` 함수 전체 재작성
- Electron 환경 감지 로직 추가
- `connectViaHowlerSounds()` 함수 신규 추가
- 상세한 디버깅 로그 추가

**핵심 개선사항**:
- 환경별 오디오 연결 전략 분기
- Howler._sounds를 통한 직접 접근 (Electron 전용)
- 연결 상태 검증 로직
- 더 나은 오류 처리

### 2. renderer/tts-engine.cjs
**위치**: `C:\Users\Goryeng\Desktop\Animalese\animaleseTTS\renderer\tts-engine.cjs`

**주요 변경사항**:
- `recordSequence()` → `_recordSequenceAttempt()` 구조 변경
- 재시도 로직 추가 (최대 3회)
- `testAudioCapture()` 함수 신규 추가
- 상세한 오류 메시지 개선

**핵심 개선사항**:
- 시도별 디버깅 로그 강화
- 0바이트 파일 검출 및 처리
- Electron 특화 오류 메시지 제공
- 연결 상태 실시간 모니터링

## 사용법

### 오디오 캡처 테스트
```javascript
const waveRecorder = new WaveRecorder(audioManager);
const isConnected = await waveRecorder.testAudioCapture();
if (!isConnected) {
    console.warn('오디오 캡처 연결 실패');
}
```

### 재시도 로그 확인
```
========================================
=== 녹음 시작 ===
========================================
시퀀스 길이: 10
옵션: { quality: 'low' }

--- 시도 1/3 ---
=== Howler → MediaRecorder 연결 시작 ===
destination.stream: MediaStream {...}
destination.stream.active: true
Electron 환경: true

Electron 환경: Howler._sounds 직접 연결 시도
Howler._sounds 수: 2
사운드 0 연결됨
사운드 1 연결됨
✅ 2개 사운드가 destination에 연결됨

🎙️ 녹음 시작...
✓ 오디오 청크 수신: 2048 바이트
✓ 오디오 청크 수신: 4096 바이트

📊 녹음 통계:
  - 청크 수: 2
  - 데이터 수신: true
  - 연결 상태: 성공

========================================
=== 녹음 성공 ===
========================================
```

## 향후 개선 방안

### 1. 자동 감지 및 최적화
- Electron 버전별 호환성 자동 감지
- 최적의 연결 방법 자동 선택

### 2. 대안 녹음 방법
- Howler._sounds 접근 불가 시: WebAudio API 직접 사용
- Canvas API를 통한 오디오 시각화 및 캡처

### 3. 권한 관리
- Electron 앱에 오디오 권한 요청
- 사용자에게 오디오 캡처 권한 안내

### 4. 성능 최적화
- 오디오 버퍼 크기 동적 조정
- 메모리 사용량 모니터링

## 테스트 시나리오

### 성공 케이스
1. Electron 앱에서 텍스트 입력 → WAV 변환 성공
2. SRT 파일 로드 → 전체 변환 성공
3. 선택한 cue 변환 → 성공
4. 미리듣기 → 실시간 재생

### 실패 케이스 (0바이트)
```javascript
// 다음 오류 메시지가 나타나는 경우:
// "오디오 캡처에 실패했습니다 (0바이트)"
//
// 해결 방법:
// 1. Electron 버전 업데이트 (v20+ 권장)
// 2. '--enable-features=WebAudio' 플래그로 실행
// 3. 브라우저(Chrome/Edge)에서 테스트
```

## 참고 자료

- [Electron Audio Documentation](https://www.electronjs.org/docs/latest/tutorial/audio-video)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Howler.js Documentation](https://github.com/goldfire/howler.js)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

**작성자**: Claude (MiniMax-M2)
**작성일**: 2026-01-28
**버전**: 1.0
