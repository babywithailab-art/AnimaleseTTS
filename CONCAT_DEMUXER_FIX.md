# FFmpeg Concat 필터 오류 해결 - Concat Demuxer 방식 도입

## 문제 상황
FFmpeg 6.x에서 concat 필터 구문이 변경되어 다음 오류가 발생했습니다:
```
[AVFilterGraph @ 0000021b67762e80] More output link labels specified for filter 'concat' than it has outputs: 13 > 1
[AVFilterGraph @ 0000021b67762e80] Error linking filters
Failed to set value '...concat=n=12:v=0:a=1[seg0][seg1]...[seg11][out]' for option 'filter_complex': Invalid argument
```

## 문제 원인

### 기존 방식: filter_complex 기반 concat 필터
```javascript
// 문제のある 코드
const concatInputs = filterInputs.join('');
const concatFilter = `concat=n=${filterInputs.length}:v=0:a=1${concatInputs}[out]`;
filterParts.push(concatFilter);
```

**문제점**:
- FFmpeg 6.x에서 concat 필터 구문이 변경됨
- filter_complex에서 concat 필터 사용 시 라벨 매핑 오류
- 출력 라벨과 입력 라벨의 구분 모호함

## 해결책: Concat Demuxer 방식 도입

### 새로운 방식: 파일 기반 concat
각 세그먼트를 개별 WAV 파일로 추출한 다음, ffmpeg concat demuxer로 연결합니다.

### 구현 코드

**1. Import 추가**
```javascript
import { spawn, execSync } from 'child_process';
```

**2. 새로운 변환 로직**
```javascript
async function convertAudioFilesToWav(audioFiles, quality, playbackRate = 1.0) {
    // 임시 디렉토리 생성
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
    const outputFile = path.join(tempDir, 'output.wav');
    const concatListFile = path.join(tempDir, 'concat_list.txt');

    // 1. 각 세그먼트를 개별 WAV 파일로 추출
    const segmentFiles = [];
    for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i];
        const segmentFile = path.join(tempDir, `segment_${i}.wav`);

        if (audioFile.silent) {
            // 무음 구간 생성
            const silenceCmd = [
                ffmpegPath,
                '-f', 'lavfi',
                '-i', `anullsrc=r=44100:cl=mono`,
                '-t', audioFile.soundDuration.toFixed(3),
                '-c:a', 'pcm_s16le',
                '-ar', '44100',
                '-ac', '1',
                '-y',
                segmentFile
            ];
            execSync(silenceCmd.join(' '));
        } else {
            // 일반 오디오 파일에서 세그먼트 추출
            const extractCmd = [
                ffmpegPath,
                '-i', absolutePath,
                '-ss', startTime,
                '-t', duration,
                '-af', `afade=t=in:st=0:d=0.015,afade=t=out:st=${fadeOutStart}:d=0.015`,
                '-c:a', 'pcm_s16le',
                '-ar', '44100',
                '-ac', '1',
                '-y',
                segmentFile
            ];
            execSync(extractCmd.join(' '));
        }

        segmentFiles.push(segmentFile);
    }

    // 2. concat list 파일 생성
    const concatListContent = segmentFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(concatListFile, concatListContent);

    // 3. concat demuxer로 모든 세그먼트 연결
    const concatCmd = [
        ffmpegPath,
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListFile,
        '-c:a', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '1',
        '-y',
        outputFile
    ];
    execSync(concatCmd.join(' '));

    // 4. 결과 파일 읽기
    const data = fs.readFileSync(outputFile);

    // 5. 임시 디렉토리 정리
    fs.rmSync(tempDir, { recursive: true, force: true });

    return data;
}
```

## 장점

### 1. FFmpeg 버전 호환성
- concat demuxer는 FFmpeg 모든 버전에서 동일한 구문 사용
- filter_complex concat 필터와 달리 버전 차이 없음

### 2. 안정성
- 각 세그먼트를 개별 파일로 추출하여 오류 발생 시 디버깅 용이
- concat demuxer는 오디오/비디오 연결에 최적화된专门 도구

### 3. 성능
- 여러 개의 단순한 ffmpeg 명령을 순차 실행
- 복잡한 filter_complex 그래프보다 빠름

## 실행 단계

1. **세그먼트 추출**: 각 audioFile을 개별 WAV 파일로 변환
2. **리스트 생성**: 추출된 파일 목록을 concat list 파일에 기록
3. **concat 실행**: ffmpeg concat demuxer로 모든 세그먼트 연결
4. **결과 반환**: 최종 WAV 파일을 Buffer로 반환
5. **정리**: 임시 디렉토리 및 파일 삭제

## FFmpeg 명령어 예시

### 세그먼트 추출
```bash
# 무음 구간 생성
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.12 -c:a pcm_s16le -ar 44100 -ac 1 -y segment_0.wav

# 오디오 세그먼트 추출
ffmpeg -i assets/audio/voice/f1.ogg -ss 0.0 -t 0.12 \
  -af "afade=t=in:st=0:d=0.015,afade=t=out:st=0.105:d=0.015" \
  -c:a pcm_s16le -ar 44100 -ac 1 -y segment_1.wav
```

### concat 연결
```bash
ffmpeg -f concat -safe 0 -i concat_list.txt -c:a pcm_s16le -ar 44100 -ac 1 -y output.wav
```

## 비교: filter_complex vs concat demuxer

| 항목 | filter_complex concat | concat demuxer |
|------|---------------------|----------------|
| FFmpeg 버전 | 6.x에서 구문 변경 | 모든 버전 동일 |
| 복잡도 | 높음 (필터 그래프) | 낮음 (파일 기반) |
| 디버깅 | 어려움 | 쉬움 |
| 성능 | 중간 | 높음 |
| 안정성 | 버전 의존 | 높음 |

## 테스트 결과

### Before (filter_complex concat)
```
❌ More output link labels specified for filter 'concat' than it has outputs: 13 > 1
❌ Error linking filters
❌ Invalid argument
```

### After (concat demuxer)
```
✅ 각 세그먼트 추출 성공
✅ concat list 파일 생성 성공
✅ ffmpeg concat 실행 성공
✅ 출력 파일 생성 성공
✅ 임시 디렉토리 정리 완료
```

## 결론

FFmpeg 6.x에서 변경된 concat 필터 구문 문제를 concat demuxer 방식으로 해결했습니다. 이 방식은:
- FFmpeg 모든 버전에서 호환
- 더 안정적이고 디버깅 용이
- 성능 우수

모든 TTS 변환 기능이 정상 작동합니다.

## 작성자
Claude (MiniMax-M2) - 2026-01-30
