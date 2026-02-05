# FFmpeg LGPL 사용 가이드

## 현재 상태
- **사용 중**: `ffmpeg-static` (GPL-3.0)
- **실제 FFmpeg**: LGPL v2.1+

## LGPL 준수 방법

### 1. 동적 링크 사용 (권장)
FFmpeg DLL을 별도로 배포하여 동적 링크를 사용하면 LGPL을 준수할 수 있습니다.

```javascript
// 예시: 동적 링크 설정
const ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.dll');
```

### 2. 사용자 제공 FFmpeg
사용자에게 FFmpeg를 별도로 설치하도록 안내합니다.

### 3. GPL 준수
현재 ffmpeg-static을 사용 중이므로, 전체 프로그램이 GPL-3.0으로 공개되어야 합니다.

## 권장 사항

### 옵션 A: LGPL 사용
- FFmpeg DLL 동적 링크로 변경
- 사용자 제공 또는 별도 다운로드 안내

### 옵션 B: GPL 준수 (현재)
- 전체 프로젝트 GPL-3.0으로 공개
- 소스코드 공개 의무 준수

### 옵션 C: 상용 라이선스
- FFmpeg 상용 라이선스 구매
- 자유로운 사용 가능

## 결론

현재 `ffmpeg-static`은 GPL-3.0-or-later 라이선스이므로:
1. ✅ **상용 사용 가능** (GPL 허용)
2. ❌ **소스코드 공개 필요** (GPL 요구사항)

만약 소스코드를 공개하지 않고 상용으로 배포하려면 FFmpeg 상용 라이선스를 구매해야 합니다.

## 참고 링크
- FFmpeg LGPL: https://ffmpeg.org/legal.html
- FFmpeg 상용 라이선스: https://ffmpeg.org/download.html#build-windows
