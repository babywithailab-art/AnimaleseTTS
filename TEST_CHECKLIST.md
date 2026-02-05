# Animalese TTS - Testing Checklist

## 🎯 Critical Fixes Applied

### ✅ Fix #1: Empty WAV Files
- **Problem:** ffmpeg produced 78-byte files with only headers
- **Solution:** Disabled audio segment optimization and fixed duration calculation
- **Files Modified:** `renderer/tts-engine.cjs`, `main.js`

### ✅ Fix #2: File Saving Location
- **Problem:** WAV files saved to Desktop instead of SRT folder
- **Solution:** Fixed path separator handling and ensured SRT path is preserved
- **Files Modified:** `renderer/tts-ui.cjs`

### ✅ Fix #3: SRT → Single WAV
- **Problem:** Expected single synchronized WAV file
- **Solution:** Code was already correct, should work with fixes #1 and #2
- **Files Modified:** `renderer/tts-ui.cjs`

## 🧪 Test Scenarios

### Test 1: Simple Text → WAV
1. Open app
2. Enter text: "안녕" (Korean)
3. Click "텍스트 → WAV" button
4. **Expected:** Downloads a WAV file that plays sound and is not 78 bytes
5. **Check:** File size should be > 1KB

### Test 2: Text → WAV (English)
1. Enter text: "Hello"
2. Click "텍스트 → WAV" button
3. **Expected:** Downloads a WAV file with English animalese sound

### Test 3: Selected Cue → WAV
1. Click "SRT 파일 선택" button
2. Select an SRT file
3. In popup: Select 1-2 cues
4. Click "선택한 Cue 변환" button
5. **Expected:**
   - WAV files appear in the SAME folder as the SRT file
   - Each selected cue creates its own WAV file
   - File names like: `animalese_cue_1.wav`, `animalese_cue_2.wav`

### Test 4: Entire SRT → WAV
1. Click "SRT 파일 선택" button
2. Select an SRT file
3. Click "전체 SRT 변환" button
4. **Expected:**
   - Single WAV file named `animalese_srt_complete.wav`
   - File appears in the SAME folder as the SRT file
   - Sound plays at each cue's start time

## 🔍 Debug Information

### Console Messages to Watch
When testing, open DevTools (Ctrl+Shift+I) and look for:

**Good Signs:**
```
✓ SRT File Path updated from popup: C:\path\to\file.srt
✓ File saved: C:\path\to\animalese_cue_1.wav
Segment 0: f1.ogg [0.000-0.120] (duration: 0.120s)
```

**Bad Signs (report these):**
```
ERROR: ffmpeg conversion failed
Output file is empty, nothing was encoded
⚠️ SRT 파일 경로가 없습니다
```

### File Locations
- **Input:** `assets/audio/voice/f1.ogg` (should exist, ~122KB)
- **Output (Test 3):** Same folder as SRT file
- **Output (Test 4):** Same folder as SRT file

## 🚨 If Problems Persist

### Issue: Still Empty WAV Files
**Check:**
1. Console for ffmpeg errors
2. Antivirus blocking `ffmpeg.exe`
3. File exists: `node_modules/ffmpeg-static/ffmpeg.exe`

**Debug:**
```bash
# Check if ffmpeg exists in node_modules
dir node_modules/ffmpeg-static/ffmpeg.exe
```

### Issue: Files Save to Wrong Location
**Check:**
1. Did you load SRT file first? (Must load before conversion)
2. Console shows: "SRT File Path updated from popup"
3. File path contains backslashes: `C:\Users\...`

### Issue: No Sound in WAV
**Check:**
1. Try simpler text: just "a" or "ㅏ"
2. Preview button works (plays sound)
3. WAV file size > 1KB

## 📊 Success Criteria

All tests should pass:
- [ ] Text → WAV creates playable audio file
- [ ] Selected Cue → WAV creates files in SRT folder
- [ ] Entire SRT → WAV creates single file in SRT folder
- [ ] No 78-byte empty files
- [ ] Audio plays correctly (2x speed animalese)

## 💡 Tips

1. **Start Small:** Test with 1-2 character text first
2. **Check DevTools:** Console shows detailed error messages
3. **File Location:** Look for files in the SAME folder as your SRT
4. **Antivirus:** May block ffmpeg.exe, add exception if needed

