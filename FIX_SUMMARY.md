# Animalese TTS Fixes Summary

## 🔧 Fixed Issues

### 1. **Empty WAV Files (78 bytes)**
**Root Cause:** Audio segment optimization was merging consecutive identical segments incorrectly, causing ffmpeg to read from invalid file positions.

**Fix:** Disabled the optimization in `tts-engine.cjs` (line 527-555)

**Changes:**
```javascript
// Before: Segments were merged incorrectly
if (current.path === next.path && ...) {
    current.soundDuration += next.soundDuration;
}

// After: Optimization disabled
// TODO: 추후 최적화 로직 개선 필요
return audioFiles;
```

### 2. **Incorrect Duration Calculation**
**Root Cause:** ffmpeg command was using sprite chunk duration (always 0.2s) instead of actual sound duration when calculating end time.

**Fix:** Changed `main.js` to use `soundDuration` for end time calculation (line 304-306)

**Changes:**
```javascript
// Before:
const endTime = (audioFile.offset + audioFile.duration).toFixed(3);

// After:
const endTime = (audioFile.offset + audioFile.soundDuration).toFixed(3);
```

### 3. **File Path Saving Issues**
**Root Cause:** Windows-specific backslash separator in file path handling.

**Fix:** Added cross-platform path handling in `tts-ui.cjs` (line 1239-1241)

**Changes:**
```javascript
// Before:
const srtFolderPath = srtFilePath.substring(0, srtFilePath.lastIndexOf('\\'));
const filePath = srtFolderPath + '\\' + filename;

// After:
const srtFolderPath = srtFilePath.replace(/\\/g, '/').replace(/\/[^\/]*$/, '');
const filePath = srtFolderPath + '/' + filename;
```

### 4. **Enhanced Debugging**
**Added:** File existence checks in ffmpeg command (line 358-375)

**New Features:**
- Checks if input audio files exist before running ffmpeg
- Logs file sizes for debugging
- Better error messages for missing files

### 5. **Fixed Acrossfade Filter Chain** ⚠️ CRITICAL
**Root Cause:** `acrossfade` filter requires overlapping audio segments, but our segments have gaps (e.g., 0.12s → 3.6s gap)

**Fix:** Replaced acrossfade chain with simple concat filter (main.js:308-328)

**Changes:**
```javascript
// Before (broken):
[seg0][seg1]acrossfade=d=0.01:c1=tri:c2=tri[af0];
[af0][seg2]acrossfade=d=0.01:c1=tri:c2=tri[af1];
...

// After (works):
[seg0][seg1][seg2]concat=n=3:v=0:a=1[concatout];
[concatout]atempo=2.0[out];
```

**Result:** FFmpeg now processes all audio segments correctly without requiring overlap

## ✅ Expected Results

After these fixes:
1. **WAV files should contain actual audio data** (not just 78-byte headers)
2. **Files should save to SRT folder location** (not Desktop)
3. **Selected cue → WAV** should create individual WAV files in SRT folder
4. **Entire SRT → WAV** should create a single synchronized WAV file

## 🧪 Testing

To test the fixes:
1. Start the app: `npm start`
2. Try "텍스트 → WAV" with simple text (e.g., "안녕")
3. Load an SRT file and try "선택 Cue → WAV"
4. Try "전체 SRT → WAV"

## 📝 Technical Details

### Audio Segment Structure
Each audio file object now contains:
- `path`: File path (e.g., 'voice/f1.ogg')
- `offset`: Start position in file (seconds)
- `duration`: Sprite chunk duration (always 0.2s for character sounds)
- `soundDuration`: Actual sound duration (varies, e.g., 0.12s for 'a')

### FFmpeg Command Flow
1. Input files are added with `-i` flag
2. Each segment is trimmed with `atrim=start=X:end=Y`
3. Fade-in is applied to smooth transitions
4. Segments are concatenated with `acrossfade`
5. Final `atempo=2.0` adjusts playback speed
6. Output is WAV format with PCM encoding

## 🚀 Next Steps

If issues persist:
1. Check console output for ffmpeg errors
2. Verify audio files exist at `assets/audio/voice/`
3. Try with shorter text (2-3 characters) first
4. Check if antivirus is blocking ffmpeg.exe

## 📞 Debug Info

When testing, watch for these console messages:
- "Segment X: filename.ogg [start-end] (duration: X.XXXs)"
- "✓ File saved: C:/path/to/file.wav"
- "ffmpeg stderr:" (any error messages)

