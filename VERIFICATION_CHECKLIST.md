# Animalese TTS - Verification Checklist

## ✅ Layout Verification

### Window Sizing
- [ ] Window opens at flexible size (not fixed)
- [ ] Window resizes with viewport changes
- [ ] Min/max width constraints work (980px min, 100vw-48px max)
- [ ] Min/max height constraints work (640px min, 100vh-48px max)
- [ ] 24px margin from screen edges maintained

### Top Section Layout
- [ ] Text Input Panel (left) and SRT Panel (right) displayed side by side
- [ ] Panels maintain equal width when window is wide
- [ ] Panels wrap to single column when window < 980px
- [ ] Vertical stacking when window < 800px
- [ ] Gap between panels maintained (20px)

### Bottom Section Layout
- [ ] Voice Profile Editor fills remaining width
- [ ] Sliders (Pitch, Intonation, Variation) expand horizontally
- [ ] Voice Type Group fixed at ~200px width
- [ ] No vertical shifting when sliders change values

### Master Volume
- [ ] Positioned on right side of window
- [ ] Doesn't interfere with main content
- [ ] Vertical slider displays correctly
- [ ] Shows current volume percentage

## ✅ TTS Functionality

### Text Input
- [ ] Textarea accepts Korean characters
- [ ] Textarea accepts English characters
- [ ] Textarea accepts numbers
- [ ] Textarea accepts special characters
- [ ] Preview button works
- [ ] Text-to-WAV button works
- [ ] Clear button works

### SRT File Handling
- [ ] File input accepts .srt files
- [ ] Load SRT button opens new window
- [ ] New window displays all cues
- [ ] Cue selection works (checkbox)
- [ ] Select All / Deselect All works
- [ ] Confirm button returns to main window
- [ ] Selected cues appear in preview
- [ ] Selected Cue-to-WAV works
- [ ] All SRT-to-WAV works

### Voice Profile Integration
- [ ] Pitch slider controls TTS output
- [ ] Intonation slider controls TTS output
- [ ] Variation slider controls TTS output
- [ ] Male/Female button selection works
- [ ] Voice type dropdown works (f1-f4, m1-m4)
- [ ] Settings persist during session

### Audio Export
- [ ] WAV file downloads successfully
- [ ] File size is reasonable (low quality mode)
- [ ] Filename is correct
- [ ] Audio quality is acceptable

## ✅ Responsive Behavior

### Window Resize Tests
- [ ] Window at 1200px width: 2-column layout
- [ ] Window at 980px width: 2-column starts wrapping
- [ ] Window at 900px width: 1-column layout
- [ ] Window at 700px width: Vertical stacking
- [ ] Window at 500px width: Buttons wrap to multiple lines

### No Layout Breakage
- [ ] No content overflow
- [ ] No horizontal scrolling (except where intended)
- [ ] No elements overlapping
- [ ] Text remains readable at all sizes
- [ ] Buttons remain clickable at all sizes

## ✅ Error Handling

### Invalid Input
- [ ] Empty text input shows error message
- [ ] Invalid SRT file shows error message
- [ ] No SRT file loaded shows error message
- [ ] No cue selected shows error message

### Browser Compatibility
- [ ] Modern Chrome/Edge: Full functionality
- [ ] Firefox: MediaRecorder API support
- [ ] Safari: Limited support (may have issues)

## ✅ Performance

### Small Text (<100 chars)
- [ ] Preview: < 1 second
- [ ] WAV conversion: < 3 seconds

### Medium Text (100-500 chars)
- [ ] Preview: < 3 seconds
- [ ] WAV conversion: < 10 seconds

### Large SRT (50+ cues)
- [ ] Load time: < 2 seconds
- [ ] Conversion: Reasonable progress indication
- [ ] No memory overflow

## 🧪 Testing Procedure

### Test 1: Basic Layout
1. Open application
2. Resize window to various widths
3. Verify layout adapts correctly
4. Take screenshots at key breakpoints

### Test 2: Korean Text Processing
1. Enter "안녕하세요" in text input
2. Click Preview
3. Should hear animalese-style speech
4. Click Text-to-WAV
5. Verify WAV file downloads

### Test 3: Mixed Characters
1. Enter "Hi 안녕 123!" in text input
2. Click Preview
3. Should hear: English "Hi", Korean "안녕", Numbers "123"

### Test 4: SRT Processing
1. Create test.srt file:
```
1
00:00:01,000 --> 00:00:02,000
안녕하세요

2
00:00:02,500 --> 00:00:04,000
Hello World
```
2. Load SRT file
3. Select cues in new window
4. Convert selected cues to WAV
5. Verify files download

### Test 5: Voice Profile
1. Change Pitch to +5
2. Change Variation to 2.0
3. Preview text
4. Should hear higher pitch, more variation

## 📊 Success Criteria

All items must be checked for successful implementation:

- **Layout**: 100% responsive, no breakage
- **Functionality**: All features work as expected
- **Performance**: Acceptable response times
- **UX**: Intuitive and user-friendly
- **Stability**: No crashes or freezes

## 🚀 Build and Deploy

```bash
# Development
npm start

# Build Windows
npm run build:win

# Build Mac
npm run build:mac

# Build Linux
npm run build:linux
```

## 📝 Notes

- Test in Electron environment for full functionality
- Browser testing available via test-tts.html
- SRT new window requires popup permissions
- WAV quality fixed to 22kHz, 8bit for optimization

---

**Last Updated**: January 28, 2026
**Status**: Ready for Testing ✅
