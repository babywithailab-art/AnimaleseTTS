# FFmpeg 매개변수 분석

## 📋 현재 실행되는 명령어

```
ffmpeg -y \
  -i C:\Users\Goryeng\Desktop\Animalese\animaleseTTS\assets\audio\voice\f1.ogg \
  -filter_complex \
    [0:a]atrim=start=0.000:end=0.120,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002[seg0];
    [0:a]atrim=start=3.600:end=3.685,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002[seg1];
    [0:a]atrim=start=0.600:end=0.685,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002[seg2];
    [0:a]atrim=start=1.000:end=1.080,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002[seg3];
    [0:a]atrim=start=0.000:end=0.120,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002[seg4];
    [0:a]atrim=start=3.600:end=3.685,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002[seg5];
    [0:a]atrim=start=0.600:end=0.685,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002[seg6];
    [0:a]atrim=start=1.000:end=1.080,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002[seg7];
    [seg0][seg1]acrossfade=d=0.01:c1=tri:c2=tri[af0];
    [af0][seg2]acrossfade=d=0.01:c1=tri:c2=tri[af1];
    [af1][seg3]acrossfade=d=0.01:c1=tri:c2=tri[af2];
    [af2][seg4]acrossfade=d=0.01:c1=tri:c2=tri[af3];
    [af3][seg5]acrossfade=d=0.01:c1=tri:c2=tri[af4];
    [af4][seg6]acrossfade=d=0.01:c1=tri:c2=tri[af5];
    [af5][seg7]acrossfade=d=0.01:c1=tri:c2=tri[af6];
    [af6]atempo=2.0[out] \
  -map [out] \
  -c:a pcm_s16le \
  -ar 44100 \
  -ac 1 \
  -f wav \
  output.wav
```

## 🔧 주요 매개변수 설명

### 입력 파일
- **-i**: 입력 오디오 파일
- `-i C:\Users\Goryeng\Desktop\Animalese\animaleseTTS\assets\audio\voice\f1.ogg`

### 필터 체인 (filter_complex)

#### 1. 세그먼트 분할
- **atrim**: 오디오 잘라내기
  - `start=0.000`: 시작 시간 (초)
  - `end=0.120`: 종료 시간 (초)
- **asetpts**: 타임스탬프 재설정 (PTS-STARTPTS로 정규화)
- **afade**: 페이드 인 효과
  - `t=in`: 페이드 인
  - `st=0`: 시작 시간
  - `d=0.002`: 지속 시간 (2ms)

#### 2. 세그먼트 연결 (문제!)
- **acrossfade**: 크로스페이드 (두 오디오를 겹치며 전환)
  - `d=0.01`: 지속 시간 (0.01초 = 10ms)
  - `c1=tri`: 첫 번째 페이드 곡선 (triangular)
  - `c2=tri`: 두 번째 페이드 곡선 (triangular)

#### 3. 속도 조정
- **atempo**: 속도 조정
  - `atempo=2.0`: 2배 속도 (2배 빨라짐)

### 출력 설정
- **-map [out]**: 필터 체인의 [out] 라벨을 출력으로 매핑
- **-c:a pcm_s16le**: 오디오 코덱 (16-bit PCM)
- **-ar 44100**: 샘플 레이트 (44.1kHz)
- **-ac 1**: 오디오 채널 (1 = Mono)
- **-f wav**: 출력 포맷 (WAV)

## ⚠️ 문제점

### 1. Acrossfade 문제
```javascript
// 세그먼트 간격:
// seg0: [0.000 - 0.120] → ends at 0.120s
// seg1: [3.600 - 3.685] → starts at 3.600s
// Gap: 3.48 seconds!
```

**acrossfade는 오디오가 겹쳐야 작동**하지만,我们的 세그먼트들은 3.48초 간격이 있어서 겹치지 않습니다.

### 2. 해결책 (수정 필요)
```javascript
// Acrossfade 대신 concat 사용
[seg0][seg1][seg2][seg3][seg4][seg5][seg6][seg7]concat=n=8:v=0:a=1[concatout];
[concatout]atempo=2.0[out]
```

## 📊 매개변수별 의미

| 매개변수 | 값 | 의미 |
|----------|-----|------|
| -y | - | 출력 파일 덮어쓰기 |
| -i | input.ogg | 입력 파일 |
| atrim | start=X:end=Y | 오디오 잘라내기 |
| asetpts | PTS-STARTPTS | 타임스탬프 정규화 |
| afade | t=in:st=0:d=0.002 | 페이드 인 (2ms) |
| acrossfade | d=0.01 | 크로스페이드 (10ms) |
| atempo | 2.0 | 2배 속도 |
| -c:a | pcm_s16le | 16-bit PCM 코덱 |
| -ar | 44100 | 44.1kHz 샘플레이트 |
| -ac | 1 | 모노 채널 |
| -f | wav | WAV 포맷 |

## 🔍 현재 상태

앱을 **재시작하지 않으면** 새 코드가 적용되지 않습니다.

**최신 매개변수**를 보려면:
1. 앱 완전히 종료
2. `npm start`로 재시작
3. 콘솔에서 새로운 ffmpeg 명령어 확인

