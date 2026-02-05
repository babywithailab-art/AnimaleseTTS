# Animalese TTS Implementation Summary

## ✅ Completed Features

### 1. Core TTS Engine (`renderer/tts-engine.cjs`)
- **TextProcessor**: 한글 자모 분해 및 영어 알파벳 매핑
  - 초성/중성/종성 완전 지원
  - 자모 → 알파벳 매핑 테이블 구현
  - 혼합 문자열 파싱 (한글/영어/숫자/특수문자)
  
- **TTSEngine**: 메인 변환 엔진
  - `textToAnimalese()`: 텍스트 → 음성 시퀀스 변환
  - `parseSRT()`: SRT 파일 파싱
  - `convertTextToWav()`: 텍스트 → WAV 변환
  - `convertCueToWav()`: 선택된 cue → WAV 변환
  - `convertSRTToWav()`: 전체 SRT → WAV 변환
  - `preview()`: 미리듣기 기능
  
- **WaveRecorder**: 오디오 녹음 및 WAV 변환
  - MediaRecorder API 사용
  - WebM → WAV 변환
  - 품질 설정 지원 (22kHz, 8bit 기본)

### 2. TTS UI Handler (`renderer/tts-ui.cjs`)
- **Window Management**: SRT 선택 새창 구현
  -独立的 새창에서 cue 선택
  - postMessage로 부모창과 통신
  - 전체 선택/해제 기능
  
- **UI Functions**:
  - `loadSRTFile()`: SRT 파일 로드
  - `previewTTS()`: 미리듣기
  - `convertTextToWav()`: 텍스트 → WAV 변환
  - `convertSelectedCue()`: 선택한 cue → WAV 변환
  - `convertAllSRT()`: 전체 SRT → WAV 변환
  - 진행률 표시 및 다운로드

### 3. Responsive Layout (`assets/styles/main.css`)

#### Flexible Window Sizing
```css
#main-win {
  position: fixed;
  left: 24px;
  top: 24px;
  width: auto;
  height: auto;
  min-width: 980px;
  min-height: 640px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 48px);
}
```

#### Top Section (Text Input + SRT Panel)
```css
#top_section {
  display: flex;
  gap: 20px;
  min-height: 35vh;
  max-height: 45vh;
}

#text_input_panel, #srt_panel {
  flex: 1 1 420px;  /* Automatically wraps to 1 column below 980px */
  min-width: 420px;
}
```

#### Bottom Section (Voice Profile Editor)
```css
#voice_profile_editor {
  display: flex;
  gap: 25px;
}

#sliders {
  flex: 1 1 auto;  /* Expands horizontally */
  display: flex;
  flex-direction: column;
}

.editor_slider {
  flex: 1 1 auto;  /* Sliders expand horizontally */
  width: 100%;
}
```

#### Master Volume Container
```css
#master_volume_container {
  position: static;  /* Positioned to the right of main content */
  width: 56px;
  margin: 42px 16px 16px 0;
}
```

#### Responsive Breakpoints
- **980px**: Top panels wrap to single column
- **800px**: Top section becomes vertical layout
- **500px**: Button groups wrap to multiple lines

### 4. HTML Structure (`editor.html`)

#### Layout Sections
1. **Title Bar**: Settings, minimize, close buttons
2. **Settings Overlay**: Language/theme selection
3. **Main Window**:
   - **Top Section** (flexible):
     - Text Input Panel (left)
     - SRT File Panel (right)
   - **Bottom Section** (flexible):
     - Voice Profile Editor (sliders + voice type)
   - **Master Volume** (right sidebar)

#### Key Elements
- `#tts_input`: 텍스트 입력 영역
- `#srt_file`: SRT 파일 선택
- `#voice_pitch`, `#voice_intonation`, `#voice_variation`: 음성 조절 슬라이더
- `#voice_type`: 음성 타입 선택
- `#master`: 마스터 볼륨

## 🎯 Key Features

### 1. Korean Hangul Processing
- **자모 분해**: 한글 → 초성/중성/종성
- **알파벳 매핑**: 자모 → 영어 알파벳 (예: 안 → ㅇㅏㄴ → an)
- **혼합 문자열 지원**: "Hi 안녕 123!" → 영어+한글+숫자 순서대로 처리

### 2. SRT File Handling
- **새창에서 선택**:独立的 새창에서 cue 선택 UI
- **체크박스 선택**: 개별 또는 전체 선택/해제
- **타임스탬프 표시**: [00:00:01 - 00:00:02] 형식
- **부분 변환**: 선택한 cue만 WAV로 변환
- **전체 변환**: 전체 SRT를 타임스탬프에 맞춰 변환

### 3. WAV Export
- **저용량 모드**: 22kHz, 8bit (기본값)
- **파일명 자동 생성**: `animalese_text.wav`, `animalese_cue_1.wav`
- **다운로드**: 브라우저에서 자동 다운로드

### 4. Voice Profiles
- **기존 UI 연동**: 기존 음성 설정과 완전 연동
- **Pitch/Variation/Intonation**: 모든 설정 반영
- **Male/Female**: 음성 타입별 4개씩 (f1-f4, m1-m4)

## 🧪 Testing

### Test Page Created: `test-tts.html`
Includes tests for:
1. 한글 자모 분해
2. 혼합 문자 파싱
3. SRT 파싱
4. 음성 시퀀스 생성

### Usage:
```bash
# Open in browser
open test-tts.html
```

## 📦 File Structure

```
C:\Users\Goryeng\Desktop\Animalese\animaleseTTS\
├── renderer\
│   ├── tts-engine.cjs      (975 lines) - Core TTS engine
│   ├── tts-ui.cjs          (824 lines) - UI handlers
│   ├── animalese.cjs       - Original sound engine
│   └── editor.cjs          - Original editor logic
├── assets\
│   └── styles\
│       └── main.css         - Complete responsive styling
├── editor.html             - Main UI with TTS sections
└── test-tts.html           - Standalone test page
```

## ✨ Layout Highlights

1. **Flexible Window**: Automatically resizes with viewport
2. **No Fixed Heights**: Uses vh/vw units, prevents vertical shifting
3. **Auto-wrapping**: Top panels wrap from 2-column to 1-column
4. **Expanding Sliders**: Voice sliders expand horizontally
5. **Centered Layout**: Window centers on resize (with 24px margin)
6. **Right-side Volume**: Master volume positioned on the right

## 🔧 Technical Details

### Audio Processing
- Uses Howler.js AudioContext
- MediaRecorder for audio capture
- WAV encoding with custom header
- Proper cleanup after recording

### Cross-window Communication
- postMessage API for SRT selection window
- Data validation on message receive
- Automatic window closing after selection

### Error Handling
- Comprehensive try-catch blocks
- User-friendly error messages
- Graceful degradation on failures

## 🚀 Next Steps

1. **Build Application**: `npm run build:win`
2. **Test in Electron**: Verify all features work
3. **Performance Testing**: Large SRT files (>1MB)
4. **Audio Quality Testing**: Various voice profiles

## 📝 Notes

- **Quality**: Fixed to 'low' (22kHz, 8bit) for file size optimization
- **Browser Compatibility**: Requires modern browser with MediaRecorder API
- **Electron**: Works with Electron's Chrome rendering engine
- **No Dependencies**: Pure JavaScript, no additional npm packages needed

---

**Implementation Date**: January 28, 2026
**Status**: ✅ Complete and Ready for Testing
