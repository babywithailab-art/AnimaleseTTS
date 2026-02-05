# 원본 파일 기반 변환 방식 구현

## 새로운 접근 방식

기존 MediaRecorder로 Howler 재생을 캡처하는 방식 대신, **원본 오디오 파일을 직접 ffmpeg로 변환**하는 방식으로 변경했습니다.

### 문제 상황
```
MediaRecorder 방식 (실패):
Howler 재생 → MediaRecorder로 캡처 → WebM → WAV 변환
└→ Electron에서 0바이트 문제 발생
```

```
새로운 방식 (성공):
음성 시퀀스 → 파일 경로 추출 → ffmpeg로 변환 → WAV
└→ 직접 파일 접근, 더 안정적
```

## 구현 상세

### 1. 음성 시퀀스 → 파일 정보 변환

```javascript
// 예: soundSequence = [{ path: 'f1.a', duration: 200 }, ...]
const audioFiles = this.sequenceToAudioFiles(soundSequence);
// 결과: [{ path: 'voice/f1.ogg', offset: 0, duration: 0.2 }, ...]
```

### 2. 파일 경로 매핑

```javascript
soundPathToFileInfo(soundPath) {
    // f1.a → voice/f1.ogg (offset: 0, duration: 0.2s)
    // f1.b → voice/f1.ogg (offset: 0.2, duration: 0.2s)
    // sfx.enter → sfx.ogg (offset: 0.6, duration: 0.6s)
}
```

**음성 스프라이트 정보**:
- `voice_sprite`: a-z, 0-9는 200ms 간격으로 배치
- `sfx_sprite`: 특수문자들은 600ms 간격으로 배치

### 3. ffmpeg 변환

```bash
ffmpeg -i voice/f1.ogg -ss 0 -t 0.2 [out1]
ffmpeg -i voice/f1.ogg -ss 0.2 -t 0.2 [out2]
ffmpeg -i sfx.ogg -ss 0.6 -t 0.6 [out3]
ffmpeg [out1][out2][out3] concat=n=3:v=0:a=1 -ar 22050 -ac 1 output.wav
```

### 4. 코드 구조

```javascript
// renderer/tts-engine.cjs
class WaveRecorder {
    async recordSequence(soundSequence, options) {
        // 1. 시퀀스를 파일 정보로 변환
        const audioFiles = this.sequenceToAudioFiles(soundSequence);

        // 2. ffmpeg로 변환
        return this.extractAndConcatSegments(audioFiles, quality);
    }

    extractAndConcatSegments(audioFiles, quality) {
        // 각 파일에서 필요한 부분만 추출하여 concat
        // ffmpeg로 처리
    }
}
```

## 장점

### 1. 안정성
- MediaRecorder 의존성 없음
- Electron 호환성 문제 없음
- 오디오 드라이버 영향 없음

### 2. 성능
- 파일 직접 접근 (재생/캡처 불필요)
- ffmpeg의 고품질 오디오 처리
- 메모리 사용량 적음

### 3. 품질
- 오디오 품질 손실 없음
- 정확한 타임스탬프 유지
- 스프라이트에서 정확한 세그먼트 추출

### 4. 확장성
- 여러 오디오 포맷 지원 (OGG, MP3, WAV)
- 오디오 효과 적용 가능
- 배치 처리 용이

## 지원되는 음성 패턴

### 음성 (Voice)
```
f1.a, f1.b, f1.c, ... f1.z → voice/f1.ogg
f2.a, f2.b, ... → voice/f2.ogg
m1.a, m1.b, ... → voice/m1.ogg
...
```

### SFX (Sound Effects)
```
sfx.enter → sfx.ogg (offset: 0.6s)
sfx.space → sfx.ogg (offset: varies)
sfx.exclamation → sfx.ogg
sfx.question → sfx.ogg
```

## 품질 설정

```javascript
getWavConfig(quality) {
    switch(quality) {
        case 'high':
            return { sampleRate: 48000, bitDepth: 24, channels: 1 };
        case 'standard':
            return { sampleRate: 44100, bitDepth: 16, channels: 1 };
        case 'low':
        default:
            return { sampleRate: 22050, bitDepth: 8, channels: 1 };
    }
}
```

## ffmpeg 명령어 예시

### 단일 세그먼트
```bash
ffmpeg -i voice/f1.ogg -ss 0 -t 0.2 -ar 22050 -ac 1 -f wav output.wav
```

### 여러 세그먼트 concat
```bash
ffmpeg \
    -i voice/f1.ogg -i voice/f1.ogg -i sfx.ogg \
    -filter_complex "
        [0:0]atrim=start=0:duration=0.2,asetpts=PTS-STARTPTS[out0];
        [1:0]atrim=start=0.2:duration=0.2,asetpts=PTS-STARTPTS[out1];
        [2:0]atrim=start=0.6:duration=0.6,asetpts=PTS-STARTPTS[out2];
        [out0][out1][out2]concat=n=3:v=0:a=1[out]
    " \
    -map '[out]' -ar 22050 -ac 1 -f wav output.wav
```

## 파일 구조

```
assets/audio/
├── voice/
│   ├── f1.ogg  (female voice 1)
│   ├── f2.ogg  (female voice 2)
│   ├── m1.ogg  (male voice 1)
│   └── ...
├── sfx.ogg     (sound effects with sprites)
└── instrument/
    ├── organ.ogg
    └── ...
```

## 알려진 제한사항

### 1. ffmpeg 설치 필요
- Windows: https://ffmpeg.org/download.html
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt-get install ffmpeg`

### 2. 스프라이트 매핑 수동 관리
- voice_sprite, sfx_sprite 정보를 수동으로 코드에 입력
- 오디오 파일 구조 변경 시 업데이트 필요

### 3. 복잡한 오디오 효과 미지원
- 피치 변화,intonation은 직접 적용되지 않음
- 미리듣기에서는 적용되지만 변환 파일에는 미반영

## 향후 개선 방안

### 1. 오디오 효과 사전 적용
- ffmpeg 필터로 피치,intonation 미리 적용
- 변환 전에 오디오 파일 생성

### 2. IPC를 통한 메인 프로세스 변환
- 렌더러에서 메인 프로세스로 파일 정보 전송
- 메인 프로세스에서 ffmpeg 실행

### 3. 오디오 파일 캐싱
- 변환된 세그먼트 캐시
- 재사용으로 성능 향상

### 4. 병렬 처리
- 여러 파일을 동시에 처리
- 변환 속도 향상

## 테스트 시나리오

### 성공 케이스
```
1. 텍스트 입력: "안녕"
   → f1.안 → f1.녕 → voice/f1.ogg 추출 → WAV 변환

2. SRT 파일: 10개 cue
   → 각 cue 변환 → concat → 전체 WAV

3. 품질 설정: high
   → 48kHz, 24bit WAV 생성
```

### 실패 케이스
```
1. ffmpeg 미설치
   → "ffmpeg가 설치되지 않았습니다" 오류

2. 오디오 파일 없음
   → "파일을 찾을 수 없습니다" 오류

3. 잘못된 스프라이트 매핑
   → 경고 로그 출력, 기본값 사용
```

## 디버깅 정보

### 로깅 레벨
```javascript
console.log('원본 파일 기반 변환 시작');
console.log('변환된 오디오 파일 목록:', audioFiles);
console.log('ffmpeg 명령:', command);
console.log('출력 파일 읽기 완료:', data.length, '바이트');
```

### 문제 해결
```
1. 변환 실패시:
   - ffmpeg.stderr 로그 확인
   - 파일 경로 유효성 확인
   - 스프라이트 매핑 확인

2. 오디오 품질 문제시:
   - sampleRate, bitDepth 확인
   - 채널 수 확인 (mono/stereo)
```

---

**작성자**: Claude (MiniMax-M2)
**작성일**: 2026-01-28
**버전**: 1.0
