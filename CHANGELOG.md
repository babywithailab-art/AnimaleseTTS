# Changelog

## [Unreleased]

### Added
- MediaRecorder 0바이트 문제 해결方案 (Electron 환경 특화)
- 오디오 캡처 연결 테스트 함수 (`testAudioCapture()`)
- 재시도 메커니즘 (최대 3회, 자동 재시도)
- Electron 환경 자동 감지 및 최적화
- Howler._sounds를 통한 직접 오디오 라우팅 (Electron 전용)
- 상세한 디버깅 로그 및 오류 메시지

### Changed
- `audio-manager.cjs`: `connectToRecorder()` 함수 전체 재작성
  - Electron 환경 감지 로직 추가
  - 환경별 오디오 연결 전략 분기
  - 더 나은 오류 처리 및 로깅

- `renderer/tts-engine.cjs`: `WaveRecorder` 클래스 개선
  - `recordSequence()` → `_recordSequenceAttempt()` 구조 변경
  - 재시도 로직 추가
  - 0바이트 파일 검출 및 경고
  - 상세한 통계 및 로그 추가

### Improved
- Electron 환경에서의 오디오 캡처 안정성
- MediaRecorder 연결 실패 시 자동 복구
- 사용자에게 더 친화적인 오류 메시지
- 디버깅 정보 강화 (연결 상태, AudioTrack 정보 등)

### Documentation
- `MEDIA_RECORDER_FIX.md`: 기술적 해결방안 문서
- `TROUBLESHOOTING.md`: 사용자 문제 해결 가이드
- `CHANGELOG.md`: 변경 사항 기록

---

## [0.0.5] - 2026-01-28

### Fixed
- Male/Female 버튼 기능 수정
  - `selectVoiceType()` 함수 개선
  - 버튼 상태 업데이트 로직 수정

- 텍스트 입력 필드 무응답 문제 수정
  - 초기화 버튼 클릭 후 포커스 복구

- SRT 패널 높이 최적화
  - flex 레이아웃 조정: text_input_panel (flex: 1), srt_panel (flex: 0)
  - 패딩 및 마진 조정

- UI 레이아웃 개선
  - 변환 버튼 SRT 팝업으로 이동
  - 진행률 표시줄을 팝업으로 통합
  - Animalese 테마 적용

### Changed
- SRT 관련 UI 요소를 팝업 창으로 이동
  - "Load SRT" 버튼만 메인 패널에 유지
  - "Cue → WAV", "전체 SRT → WAV" 버튼 팝업으로 이동
  - 진행률 표시 팝업에 통합

### Added
- TTS 변환 기능
  - 텍스트 → WAV 변환
  - SRT → WAV 변환 (전체 및 부분)
  - 미리듣기 기능
  - 음성 프로필 적용

- WAV 변환 2분할 방식
  - WebAudio 기반 (브라우저 환경)
  - FFmpeg 기반 (Node/Electron 환경)
  - 환경 자동 감지 및 최적화

### Enhanced
- SFX 매핑 개선
- 오디오 채널 관리
- 음성 프로필 저장/로드

### Improved
- 에러 처리 및 예외 관리
- 사용자 인터페이스 반응성
- 코드 유지보수성

---

## Previous Versions

### [0.0.4] - Earlier
- Initial TTS implementation
- Basic audio management
- SRT file support (UI only)

### [0.0.3] - Earlier
- Animalese voice profiles
- Customizable pitch, intonation, variation
- Male/Female voice types

### [0.0.2] - Earlier
- Basic typing sounds
- Key mapping system
- Audio sprite implementation

### [0.0.1] - Initial Release
- Basic typing functionality
- English alphabet support
- Sound effects (SFX)
- Volume control

---

## Development Notes

### Technical Debt
- WebAudio API 직접 사용 검토 필요 (Howler.js 의존성 감소)
- Electron 버전별 호환성 테스트 필요
- 대용량 파일 처리 최적화 필요

### Known Issues
- Electron MediaRecorder API 제한사항
- 일부 오디오 드라이버와 호환성 문제 가능
- SRT 파일 인코딩 문제 (UTF-8만 지원)

### Future Plans
- 더 많은 언어 지원 (일본어, 중국어 등)
- 커스텀 오디오 지원
- 실시간 음성 합성 (TTS 엔진 연동)
- 마크다운 형식 지원
- 배치 변환 기능

---

**Maintained by**: joshxviii
**Documentation**: See README.md and wiki pages
**Issues**: https://github.com/joshxviii/animalese-typing-desktop/issues
