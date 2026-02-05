# FFmpeg 설정 가이드 (LGPL 준수)

## FFmpeg 번들링 안내

이 애플리케이션은 LGPL 라이선스를 준수하기 위해 FFmpeg를 동적 링크 방식으로 사용합니다.

✅ **번들링됨**: FFmpeg가 이미 애플리케이션에 포함되어 있습니다.
- 경로: `resources/ffmpeg/ffmpeg.exe`
- 라이선스: LGPL v2.1+
- 버전: 최신 릴리스

⚠️ **별도 설치 불필요**: FFmpeg를 별도로 설치할 필요가 없습니다.

---

## 수동 설치 (선택사항)

#### 방법 1: Zip 파일 다운로드 (권장)
1. FFmpeg 공식 사이트 접속: https://ffmpeg.org/download.html#build-windows
2. "Windows" 섹션에서 "Windows builds by BtbN" 링크 클릭
3. 최신 릴리스 다운로드 (예: ffmpeg-master-latest-win64-gpl-shared.zip)
4. 다운로드한 zip 파일을 적절한 위치에 압축 해제 (예: `C:\ffmpeg`)
5. `bin` 폴더를 시스템 PATH에 추가하거나, 앱 실행 시 FFmpeg 경로 수동 설정

#### 방법 2:Chocolatey 사용
```bash
choco install ffmpeg
```

#### 방법 3: Scoop 사용
```bash
scoop install ffmpeg
```

### macOS용 FFmpeg 설치

#### Homebrew 사용
```bash
brew install ffmpeg
```

### Linux용 FFmpeg 설치

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Fedora/RHEL
```bash
sudo dnf install ffmpeg
```

## 경로 설정

### 자동 감지
앱은 다음 순서로 FFmpeg를 찾습니다:
1. 시스템 PATH에서 `ffmpeg` 명령어 검색
2. resources/ffmpeg/ffmpeg.exe (포터블 설치)

### 수동 설정
앱 설정에서 FFmpeg 경로를 수동으로 지정할 수 있습니다.

## 라이선스 정보

- **FFmpeg**: LGPL v2.1+ 라이선스
- **이 애플리케이션**: MIT 라이선스

FFmpeg는 LGPL 라이선스로 자유롭게 사용, 수정, 배포할 수 있습니다.

자세한 정보: https://ffmpeg.org/legal.html

### 번들링된 FFmpeg 정보

- **출처**: BtbN/FFmpeg-Builds (GitHub)
- **빌드 유형**: LGPL Shared
- **포함 파일**:
  - `ffmpeg.exe` - 메인 실행 파일
  - `avcodec-*.dll` - 코덱 라이브러리
  - `avformat-*.dll` - 포맷 라이브러리
  - 기타 FFmpeg DLL 파일들

사용자는 번들링된 FFmpeg를 대체할 수 있습니다.
