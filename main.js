import { app, powerMonitor, Tray, globalShortcut, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { updateElectronApp } from 'update-electron-app';
// ffmpeg-static 대신 동적으로 경로 결정

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 동적으로 FFmpeg 경로 결정 (LGPL 준수: 동적 링크)
function getFFmpegPath() {
    if (app.isPackaged) {
        // Packaged mode: resources/ffmpeg/ffmpeg.exe (번들링된 LGPL FFmpeg)
        const ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe');
        if (fs.existsSync(ffmpegPath)) {
            console.log('✓ Using FFmpeg from bundled resources:', ffmpegPath);
            return ffmpegPath;
        } else {
            // FFmpeg가 resources에 없으면 시스템 PATH에서 찾기
            console.warn('⚠️ FFmpeg not found in resources, checking system PATH');
            return 'ffmpeg'; // 시스템 PATH에서 ffmpeg 명령어 찾기
        }
    } else {
        // Development mode: node_modules/ffmpeg-static/ffmpeg.exe (개발용)
        try {
            const ffmpegPath = require('ffmpeg-static');
            console.log('✓ Using ffmpeg-static in development mode:', ffmpegPath);
            return ffmpegPath;
        } catch (error) {
            console.warn('ffmpeg-static not found in development mode, trying system PATH');
            return 'ffmpeg'; // 시스템 PATH에서 ffmpeg 명령어 찾기
        }
    }
}

// 동적으로 오디오 자산 경로 결정
function getAudioAssetPath(relativePath) {
    if (app.isPackaged) {
        // Packaged mode: resources/app.asar.unpacked 폴더 내
        return path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'audio', relativePath);
    } else {
        // Development mode: 로컬 assets/audio 폴더
        return path.join(__dirname, 'assets', 'audio', relativePath);
    }
}

// 동적으로 아이콘 경로 결정
function getIconPath() {
    if (app.isPackaged) {
        // Packaged mode: resources 폴더 내
        return path.join(process.resourcesPath, 'assets', 'images', 'icon.png');
    } else {
        // Development mode: 로컬 assets/images 폴더
        return path.join(__dirname, 'assets', 'images', 'icon.png');
    }
}

// 동적으로 Output 폴더 경로 결정
function getOutputFolder() {
    if (app.isPackaged) {
        // Packaged mode: 사용자 데이터 폴더 사용
        return path.join(app.getPath('userData'), 'output');
    } else {
        // Development mode: 앱 디렉토리 내
        return path.join(__dirname, 'output');
    }
}

// SRT 선택창 BrowserWindow 참조 변수
let srtwin = null;

// Conditionally import get-windows (not supported on Linux)
let getFocusedWindow = null;
if (process.platform !== 'linux') {
    try {
        const getWindowsPkg = await import('@deepfocus/get-windows');
        getFocusedWindow = getWindowsPkg.activeWindow;
    } catch (error) {
        console.warn('Window monitoring not available:', error.message);
    }
}

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
const isDev = app.isPackaged === false;
// 트레이 아이콘은 더 이상 사용되지 않으므로 주석 처리
// const SYSTRAY_ICON = (process.platform === 'darwin') ? path.join(__dirname, '/assets/images/icon_18x18.png') : path.join(__dirname, '/assets/images/icon.png');
// const SYSTRAY_ICON_OFF = (process.platform === 'darwin') ? path.join(__dirname, '/assets/images/icon_off_18x18.png') : path.join(__dirname, '/assets/images/icon_off.png');
// const SYSTRAY_ICON_MUTE = (process.platform === 'darwin') ? path.join(__dirname, '/assets/images/icon_mute_18x18.png') : path.join(__dirname, '/assets/images/icon_mute.png');
// ICON은 동적으로 결정됨 (getIconPath 함수 사용)
const gotTheLock = app.requestSingleInstanceLock();

function showIfAble() { // focus the existing window if it exists
    if (bgwin) {
        bgwin.show();
        bgwin.focus();
    }
}

function setDisable(value = true) {
    value = muted ? true : preferences.get('always_active') ? false : value;
    // 트레이 아이콘 업데이트 제거
    if (disabled === value) return;
    disabled = value;
    if (disabled) stopKeyListener(); else startKeyListener();
}

if (!gotTheLock) app.quit(); // if another instance is already running then quit
else app.on('second-instance', () => showIfAble()); // show instance that is running

app.setAppUserModelId('com.joshxviii.animalese-typing');

const defaults = {
    lang: 'en',
    volume: 0.5,
    audio_mode: 0,
    theme: 'default',
    disable_hotkey: 'F5',
    startup_run: false,
    hold_repeat: true,
    always_active: true,
    selected_apps: [],
    selected_active: true,
    voice_profile: {
        type: 'f1',
        pitch: 0.0,
        variation: 0.0,
        intonation: 0.0
    },
    note_profile: {
        instrument: 'girl',
        transpose: 0,
    },
    saved_voice_profiles: new Map(),
    remapped_keys: new Map()
}

const preferences = new Store({
    defaults: defaults
});

ipcMain.on('get-store-data-sync', (e) => {
    e.returnValue = preferences.store;
});
ipcMain.handle('store-set', async (e, key, value) => {
    preferences.set(key, value);
    bgwin.webContents.send(`updated-${key}`, value);
    // if (key==='startup_run') updateTrayMenu(); // 트레이 메뉴 업데이트 제거
    if (key==='disable_hotkey') updateDisableHotkey(value);
});

// 마스터 볼륨 변경 IPC 핸들러
ipcMain.on('volume-changed', (e, volume) => {
    console.log('Volume changed via IPC:', volume);
    preferences.set('volume', volume);
});
const nonResettable = [
    'lang',
    'theme',
    'startup_run',
];
ipcMain.handle('store-reset', async (e, key) => {// reset a certain key or all settigns
    if (key) {
        preferences.delete(key);
        preferences.set(key, defaults[key]);
        bgwin.webContents.send(`updated-${key}`, defaults[key]);
        if (key==='disable_hotkey') updateDisableHotkey(defaults[key]);
    }
    else {// reset all
        Object.keys(preferences.store).forEach(key => { if (!nonResettable.includes(key)) preferences.delete(key); });
        
        Object.keys(defaults).forEach(key => {
            if (!nonResettable.includes(key)) {
                preferences.set(key, defaults[key]);
                bgwin.webContents.send(`updated-${key}`, defaults[key]);
                if (key==='disable_hotkey') updateDisableHotkey(defaults[key]);
            }
        });
    }
});
ipcMain.on('show-window', (e) => {
    showIfAble();
});
ipcMain.on('close-window', (e) => {
    if (bgwin) bgwin.close();
});
ipcMain.on('minimize-window', (e) => {
    if (bgwin) bgwin.minimize();
});
ipcMain.on('remap-send', (e, sound) => { if (bgwin) bgwin.webContents.send(`remap-sound`, sound)});
ipcMain.on('open-remap-settings', (e) => {
    createRemapWin();
});
ipcMain.on('get-app-info', (e) => {
    e.returnValue = {
        version: app.getVersion(),
        name: app.getName(),
        platform: process.platform
    }
});

// 자산 경로 정보 IPC 핸들러
ipcMain.on('get-app-paths', (e) => {
    e.returnValue = {
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath,
        ffmpegPath: getFFmpegPath(),
        audioAssetsPath: app.isPackaged
            ? path.join(process.resourcesPath, 'app.asar.unpacked', 'assets')
            : path.join(__dirname, 'assets')
    }
});
ipcMain.on('set-run-on-startup', (e, value) => setRunOnStartup(value));

// 파일 저장 IPC 핸들러
ipcMain.handle('save-file', async (e, filePath, data) => {
    try {
        console.log('Saving file to:', filePath);

        // 파일 쓰기 (동기적으로)
        fs.writeFileSync(filePath, data);

        console.log('File saved successfully:', filePath);
        return true;
    } catch (error) {
        console.error('Failed to save file:', error);
        throw error;
    }
});

// SRT 파일 선택 및 저장 폴더 선택 IPC 핸들러
ipcMain.handle('select-srt-file', async (e) => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [
                { name: 'SRT Files', extensions: ['srt'] }
            ],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) {
            return { success: false, canceled: true };
        }

        const filePath = filePaths[0];
        console.log('SRT 파일 선택됨:', filePath);

        return {
            success: true,
            filePath: filePath,
            folderPath: path.dirname(filePath)
        };
    } catch (error) {
        console.error('SRT 파일 선택 실패:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-file', async (e, filePath) => {
    try {
        console.log('파일 읽기:', filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        return content;
    } catch (error) {
        console.error('파일 읽기 실패:', error);
        throw error;
    }
});

ipcMain.handle('select-save-folder', async (e, defaultPath) => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            defaultPath: defaultPath,
            properties: ['openDirectory', 'createDirectory']
        });

        if (canceled || filePaths.length === 0) {
            return { success: false, canceled: true };
        }

        const folderPath = filePaths[0];
        console.log('저장 폴더 선택됨:', folderPath);

        return {
            success: true,
            folderPath: folderPath
        };
    } catch (error) {
        console.error('저장 폴더 선택 실패:', error);
        return { success: false, error: error.message };
    }
});

// 파일을 output 폴더에 저장하는 IPC 핸들러
ipcMain.handle('save-to-output-folder', async (e, filename, wavBuffer) => {
    try {
        const filePath = path.join(getOutputFolder(), filename);
        console.log('\n=== SAVE-TO-OUTPUT-FOLDER IPC ===');
        console.log('Filename:', filename);
        console.log('Buffer type:', typeof wavBuffer);
        console.log('Buffer length:', wavBuffer ? wavBuffer.length || 'unknown' : 'null');
        console.log('Output folder:', getOutputFolder());
        console.log('Full file path:', filePath);
        console.log('===================================\n');

        // Output 폴더가 없으면 생성
        if (!fs.existsSync(getOutputFolder())) {
            console.log('Creating output folder:', getOutputFolder());
            fs.mkdirSync(getOutputFolder(), { recursive: true });
        }

        // WAV Buffer를 파일로 저장
        fs.writeFileSync(filePath, wavBuffer);
        console.log('✓ File saved successfully:', filePath);

        // 파일 저장 후 자동으로 output 폴더 열기
        console.log('Opening output folder:', getOutputFolder());
        console.log('Folder exists:', fs.existsSync(getOutputFolder()));
        console.log('Folder path:', getOutputFolder());
        try {
            const result = shell.openPath(getOutputFolder());
            console.log('Shell openPath result:', result);
            if (result !== '') {
                console.warn('⚠️ Shell openPath returned error:', result);
            } else {
                console.log('✅ Shell openPath succeeded');
            }
        } catch (shellError) {
            console.error('🚨 Shell openPath threw error:', shellError);
        }

        // 성공 응답과 함께 파일 경로 반환
        return {
            success: true,
            filePath: filePath,
            filename: filename,
            outputFolder: getOutputFolder()
        };
    } catch (error) {
        console.error('Output 폴더 저장 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// output 폴더 경로 반환 IPC 핸들러
ipcMain.handle('get-output-folder', async () => {
    return {
        success: true,
        outputFolder: getOutputFolder()
    };
});

// TTS 오디오 변환 IPC 핸들러
ipcMain.handle('tts-convert-to-wav', async (e, audioFiles, quality, playbackRate = 1.0, voiceProfile) => {
    console.log('TTS Convert Request: %d segments', audioFiles.length);
    console.log('Playback Rate (atempo): %.3f', playbackRate);
    console.log('Voice Profile (raw):', voiceProfile);

    // 음성프로필이 없으면 기본값 사용 (강제 적용)
    if (!voiceProfile) {
        console.warn('⚠️ voiceProfile이 전달되지 않았습니다. 기본값을 사용합니다.');
        voiceProfile = { type: 'f1', pitchShift: 0, variation: 0, intonation: 0 };
    }

    console.log('Voice Profile (applied):', voiceProfile);

    try {
        // ffmpeg 변환 실행
        const wavBuffer = await convertAudioFilesToWav(audioFiles, quality, playbackRate, voiceProfile);

        // 변환된 WAV 데이터를 Base64로 인코딩하여 반환
        const base64Wav = wavBuffer.toString('base64');
        return {
            success: true,
            data: base64Wav,
            mimeType: 'audio/wav'
        };
    } catch (error) {
        console.error('TTS Convert Failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ffmpeg를 사용하여 오디오 파일들을 WAV로 변환
async function convertAudioFilesToWav(audioFiles, quality, playbackRate = 1.0, voiceProfile) {
    // FFmpeg 경로 동적 결정 (LGPL 준수)
    const ffmpegPath = getFFmpegPath();
    console.log('=== FFmpeg Path Resolution (LGPL Compliant) ===');
    console.log('Is Packaged:', app.isPackaged);
    console.log('FFmpeg Path:', ffmpegPath);
    console.log('Resources Path:', process.resourcesPath);
    console.log('===========================================');

    // FFmpeg가 파일 경로인지 확인 (문자열이면 시스템 PATH에서 찾기)
    if (ffmpegPath !== 'ffmpeg' && !fs.existsSync(ffmpegPath)) {
        throw new Error(`FFmpeg not found at: ${ffmpegPath}\n\nPlease install FFmpeg and add it to your system PATH.\nSee FFMPEG_SETUP.md for installation instructions.`);
    }

    console.log('✓ Using FFmpeg (LGPL):', ffmpegPath);

    // 음성프로필이 없으면 기본값 사용
    if (!voiceProfile) {
        console.warn('⚠️ voiceProfile이 undefined입니다. 기본값을 사용합니다.');
        voiceProfile = { type: 'f1', pitchShift: 0, variation: 0, intonation: 0 };
    }

    return new Promise((resolve, reject) => {
        try {
            // 임시 디렉토리 생성
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
            const outputFile = path.join(tempDir, 'output.wav');

            console.log('=== Single FFmpeg with filter_complex ===');
            console.log('Converting %d segments', audioFiles.length);

            // 파일별 인덱스 매핑 (같은 파일을 여러 번 사용)
            const fileIndexMap = new Map();
            const inputArgs = [];
            const filterParts = [];
            let totalInputs = 0;

            // 고유 파일 목록 생성
            for (const audioFile of audioFiles) {
                const absolutePath = path.isAbsolute(audioFile.path) ?
                    audioFile.path :
                    getAudioAssetPath(audioFile.path);

                if (!fileIndexMap.has(absolutePath)) {
                    fileIndexMap.set(absolutePath, totalInputs);
                    inputArgs.push('-i', absolutePath);
                    totalInputs++;
                }
            }

            console.log('Unique files: %d', totalInputs);

            // 각 세그먼트에 대해 atrim 필터 생성
            audioFiles.forEach((audioFile, index) => {
                const absolutePath = path.isAbsolute(audioFile.path) ?
                    audioFile.path :
                    getAudioAssetPath(audioFile.path);

                const inputIndex = fileIndexMap.get(absolutePath);
                // offset: sprite 내 시작 위치, duration: sprite 전체 길이
                const startTime = audioFile.offset.toFixed(3);
                // ✅ 수정: offset + duration (전체 길이)로 계산
                const endTime = (audioFile.offset + audioFile.duration).toFixed(3);

                console.log(`\n=== 세그먼트 ${index} FFmpeg 필터 ===`);
                console.log(`File: ${path.basename(absolutePath)}`);
                console.log(`Input Index: ${inputIndex}`);
                console.log(`Original Time: [${startTime}s - ${endTime}s]`);

                // 첫 세그먼트에 0.01초 오프셋 추가
                const actualStartTime = (index === 0 && startTime === 0) ? 0.01 : (parseFloat(startTime) + 0.01);

                console.log(`Adjusted Start: ${actualStartTime}s (${startTime}s + 0.01s offset)`);
                console.log(`Sprite Duration: ${audioFile.duration}s`);
                console.log(`Playback Duration: ${audioFile.soundDuration}s`);

                // 세그먼트 길이에 따른 페이드 시간 계산
                // acrossfade를 사용하므로 per-segment fade-out 제거, fade-in만 짧게 유지 (클릭 방지)
                const segmentDuration = audioFile.soundDuration;
                const fadeInDuration = Math.min(0.010, Math.max(0.005, segmentDuration * 0.03)); // 5-10ms (클릭 방지용)
                // acrossfade가 모든 전환을 처리하므로 per-segment fade-out 제거

                // 페이드아웃 시작 시점 계산 (acrossfade가 처리하므로 더 이상 필요 없음)
                // const fadeOutStart = Math.max(0, segmentDuration - fadeOutDuration);

                // 음성프로필 강제 적용 (pitchShift, variation, intonation)
                const pitchShift = voiceProfile.pitchShift || 0;
                const variation = voiceProfile.variation || 0;
                const intonation = voiceProfile.intonation || 0;

                // 기본 피치 계산 (semitone → ratio 변환)
                const basePitchFactor = Math.pow(2, pitchShift / 12);

                // Variation을 slight pitch modulation으로 적용 (부드러운 variation)
                // variation 값이 클수록 더 많은 음조 변화 (±2% per unit) - 더 자연스럽게
                // 연속된 세그먼트들 간의 급격한 변화를 피하기 위해 범위 축소
                const variationFactor = 1 + (variation * 0.02); // ±2% per unit
                const basePitchWithVariation = basePitchFactor * variationFactor;

                // Intonation을 피치 컨투어로 적용 (시간에 따른 피치 변화)
                // 세그먼트 인덱스에 따라 피치 오프셋 계산 (0~1 사이의_progress)
                const progress = index / Math.max(1, audioFiles.length - 1);

                // Intonation 강도에 따른 피치 변화 범위 (최대 ±2 semitones)
                const intonationRange = Math.abs(intonation) * 2;
                const intonationDirection = intonation > 0 ? 1 : (intonation < 0 ? -1 : 0);

                // 부드러운 피치 컨투어 계산 (sin 곡선 사용)
                // progress=0: 시작, progress=1: 끝
                const intonationContour = Math.sin(progress * Math.PI) * intonationRange * intonationDirection;

                // 최종 피치 팩터 계산 (base + intonation)
                const finalPitchFactor = basePitchWithVariation * Math.pow(2, intonationContour / 12);

                console.log(`\n🎛️ 음성프로필:`);
                console.log(`  Base Pitch: ${pitchShift} semitones (${basePitchFactor.toFixed(3)}x)`);
                console.log(`  Variation: ${variation} (${variationFactor.toFixed(3)}x, ±2% range - 부드럽게)`);
                console.log(`  Intonation: ${intonation} → contour range: ±${intonationRange.toFixed(2)} semitones`);
                console.log(`  Segment Progress: ${(progress * 100).toFixed(1)}% (index ${index}/${audioFiles.length - 1})`);
                console.log(`  Intonation Contour: ${intonationContour.toFixed(3)} semitones (${intonationContour > 0 ? 'rising' : (intonationContour < 0 ? 'falling' : 'flat')})`);
                console.log(`  Final Pitch Factor: ${finalPitchFactor.toFixed(3)}x (${basePitchWithVariation.toFixed(3)}x × ${Math.pow(2, intonationContour / 12).toFixed(3)}x)`);

                console.log(`\n🎚️ 필터 체인 (Pitch 변경, 속도 불변):`);

                // rubberband 필터 사용 (피치를 속도 영향 없이 변경)
                // rubberband=pitch=<factor> (속도 불변)
                const useRubberband = false; // ffmpeg에서 rubberband 지원 확인 필요 (LGPL 빌드에서는 비활성화)

                let filterString;
                if (useRubberband) {
                    console.log(`  1. atrim=start=${actualStartTime}:end=${endTime} (오디오 추출)`);
                    console.log(`  2. asetpts=PTS-STARTPTS (타임스탬프 재설정)`);
                    console.log(`  3. rubberband=pitch=${finalPitchFactor.toFixed(3)} (피치 변경: base ${basePitchWithVariation.toFixed(3)}x + intonation ${intonationContour.toFixed(3)} semitones)`);
                    console.log(`  4. afade=t=in:st=0:d=${fadeInDuration} (클릭 방지용 페이드 인)`);

                    filterString = `[${inputIndex}:a]atrim=start=${actualStartTime}:end=${endTime},asetpts=PTS-STARTPTS,rubberband=pitch=${finalPitchFactor.toFixed(3)},afade=t=in:st=0:d=${fadeInDuration}[seg${index}]`;
                } else {
                    // Fallback: asetrate + atempo补偿 (속도 보정)
                    // asetrate로 피치 변경 + atempo로 속도 원상복귀
                    const compensatedTempo = 1.0 / finalPitchFactor;
                    console.log(`  1. atrim=start=${actualStartTime}:end=${endTime} (오디오 추출)`);
                    console.log(`  2. asetpts=PTS-STARTPTS (타임스탬프 재설정)`);
                    console.log(`  3. asetrate=${(44100 * finalPitchFactor).toFixed(0)},aresample=44100 (피치 변경: base + intonation)`);
                    console.log(`  4. atempo=${compensatedTempo.toFixed(3)} (속도 보정)`);
                    console.log(`  5. afade=t=in:st=0:d=${fadeInDuration} (클릭 방지용 페이드 인)`);

                    filterString = `[${inputIndex}:a]atrim=start=${actualStartTime}:end=${endTime},asetpts=PTS-STARTPTS,asetrate=${(44100 * finalPitchFactor).toFixed(0)},aresample=44100,atempo=${compensatedTempo.toFixed(3)},afade=t=in:st=0:d=${fadeInDuration}[seg${index}]`;
                }

                console.log(`\n✅ 필터 문자열: ${filterString}`);
                filterParts.push(filterString);

                console.log(`\n  🔊 세그먼트 길이: ${segmentDuration.toFixed(3)}s`);
                console.log(`  🎚️ 페이드 인: ${fadeInDuration.toFixed(3)}s (클릭 방지용, ${(fadeInDuration / segmentDuration * 100).toFixed(1)}%)`);
                console.log(`  🎚️ 페이드 아웃: 제거됨 (acrossfade가 모든 전환 처리)`);
                console.log(`  🎛️ 다음 세그먼트와는 ${(audioFiles.length > 1 && index < audioFiles.length - 1) ? '크로스페이드로 자연스럽게 연결' : '단일 세그먼트'}`);
            });

            // acrossfade로 부드러운 연결 (무음 패드 제거)
            // 재생 속도 1.0로 고정 (원래 속도)
            const fixedTempo = 1.0;

            if (audioFiles.length > 0) {
                if (audioFiles.length === 1) {
                    // 세그먼트 1개: 고정된 playbackRate만 적용 (피치는 이미 각 세그먼트에서 처리됨)
                    console.log(`\n=== 최종 필터 (단일 세그먼트) ===`);
                    console.log(`🎬 재생 속도: atempo=${fixedTempo} (피치는 rubberband/asetrate로 이미 처리됨)`);
                    filterParts.push(`[seg0]atempo=${fixedTempo}[out]`);
                } else {
                    // 여러 세그먼트: acrossfade로 자연스럽게 연결
                    console.log(`\n=== Acrossfade 필터 (더블 페이딩 제거) ===`);
                    console.log(`총 ${audioFiles.length}개 세그먼트 부드럽게 연결`);
                    console.log(`💡 per-segment fade-out 제거, acrossfade가 모든 전환 처리`);

                    console.log(`\n📋 세그먼트 목록:`);
                    for (let i = 0; i < audioFiles.length; i++) {
                        console.log(`  [${i}] ${path.basename(audioFiles[i].path)} - ${audioFiles[i].soundDuration.toFixed(3)}s`);
                    }

                    // 첫 번째 세그먼트부터 시작
                    let previousLabel = 'seg0';

                    // 각 연속된 세그먼트 쌍에 대해 acrossfade 적용
                    for (let i = 1; i < audioFiles.length; i++) {
                        const currentLabel = `seg${i}`;

                        // 이전 세그먼트 길이에 따른 크로스페이드 시간 계산
                        const prevDuration = audioFiles[i - 1].soundDuration;

                        // 크로스페이드 시간: 세그먼트 길이의 25%, 최소 18ms, 최대 25ms
                        // 더 부드러운 전환을 위해 더 긴 크로스페이드 사용
                        const crossfadeDuration = Math.max(0.018, Math.min(0.025, prevDuration * 0.25));
                        const crossfadeLabel = `xf${i}`;

                        console.log(`\n🔗 크로스페이드 ${i}/${audioFiles.length - 1}:`);
                        console.log(`  [${previousLabel}] (${prevDuration.toFixed(3)}s) + [${currentLabel}]`);
                        console.log(`  ⇒ acrossfade=${crossfadeDuration.toFixed(3)}s (${(crossfadeDuration / prevDuration * 100).toFixed(1)}% of segment) → [${crossfadeLabel}]`);

                        // acrossfade 필터 추가
                        filterParts.push(
                            `[${previousLabel}][${currentLabel}]acrossfade=d=${crossfadeDuration.toFixed(3)}:curve1=tri:curve2=tri[${crossfadeLabel}]`
                        );

                        // 현재 레이블을 다음 반복에서 이전 레이블로 사용
                        previousLabel = crossfadeLabel;
                    }

                    // 마지막에 고정된 playbackRate만 적용
                    console.log(`\n🎬 최종 처리:`);
                    console.log(`  [${previousLabel}]atempo=${fixedTempo}[out] (재생 속도)`);
                    filterParts.push(`[${previousLabel}]atempo=${fixedTempo}[out]`);

                    console.log(`\n✅ ${audioFiles.length - 1}개 크로스페이드 적용됨 (18-25ms, 더블 페이딩 제거, 자연스러운 흐름)`);
                }
            }

            // 전체 ffmpeg 인자 구성
            const args = [
                '-y',                    // 출력 파일 덮어쓰기
                ...inputArgs,           // 입력 파일들 (-i file1 -i file2 ...)
                '-filter_complex', filterParts.join(';'),  // 필터 복잡도
                '-map', '[out]',        // 출력 매핑
                '-c:a', 'pcm_s16le',   // 오디오 코덱: 16-bit PCM
                '-ar', '44100',         // 샘플레이트: 44.1kHz
                '-ac', '1',             // 채널 수: 모노 (1채널)
                '-f', 'wav',            // 포맷: WAV
                outputFile              // 출력 파일 경로
            ];

            console.log('\n═══════════════════════════════════════');
            console.log('  🎬 FFmpeg 명령어 전체 구조');
            console.log('═══════════════════════════════════════\n');

            console.log('📁 입력 파일들:');
            inputArgs.filter((_, i) => i % 2 === 1).forEach((file, i) => {
                console.log(`  [${i}] ${file}`);
            });

            console.log('\n🎛️ 필터 복잡도 (Filter Complex):');
            console.log('  ' + filterParts.join(';\n  '));

            console.log('\n🎚️ 출력 설정:');
            console.log('  Codec: pcm_s16le (16-bit PCM)');
            console.log('  Sample Rate: 44100 Hz');
            console.log('  Channels: 1 (Mono)');
            console.log('  Format: WAV');
            console.log('  Playback Rate: ' + playbackRate + 'x');
            console.log('  Quality: ' + quality);

            console.log('\n📤 출력 파일:');
            console.log('  ' + outputFile);

            console.log('\n═══════════════════════════════════════');
            console.log('  💻 전체 명령어');
            console.log('═══════════════════════════════════════');
            console.log(args.join(' '));
            console.log('═══════════════════════════════════════\n');

            console.log('🚀 FFmpeg 실행 시작...\n');

            // 각 입력 파일 존재 확인
            console.log('\n📋 입력 파일 검증:');
            for (const [, inputIndex] of fileIndexMap) {
                const inputFile = inputArgs[(inputIndex * 2) + 1];  // -i filename
                console.log(`  [${inputIndex}] ${inputFile}`);
                try {
                    const exists = fs.existsSync(inputFile);
                    console.log(`    ✓ Exists: ${exists ? 'YES' : 'NO'}`);
                    if (exists) {
                        const stats = fs.statSync(inputFile);
                        console.log(`    📏 Size: ${stats.size.toLocaleString()} bytes`);
                    }
                } catch (e) {
                    console.log(`    ❌ Error checking file: ${e.message}`);
                }
            }

            // ffmpeg 실행 (ffmpeg-static 사용)
            const ffmpeg = spawn(ffmpegPath, args, { stdio: 'pipe' });

            let stderrData = '';
            ffmpeg.stderr.on('data', (data) => {
                const str = data.toString();
                stderrData += str;
                // Print ffmpeg stderr in real-time
                console.log('🔧 FFmpeg stderr:', str.trim());
            });

            ffmpeg.on('close', (code) => {
                // 임시 디렉토리 정리
                const cleanup = () => {
                    try {
                        fs.rmSync(tempDir, { recursive: true, force: true });
                        console.log('🗑️ Temp directory deleted');
                    } catch (e) {
                        console.warn('⚠️ Failed to delete temp directory:', e.message);
                    }
                };

                if (code !== 0) {
                    console.error('❌ FFmpeg 실행 실패 (코드: %d)', code);
                    console.error('FFmpeg stderr:', stderrData);
                    cleanup();
                    reject(new Error(`ffmpeg conversion failed (code ${code}): ${stderrData}`));
                    return;
                }

                console.log('✅ FFmpeg 실행 완료 (코드: %d)', code);

                // 출력 파일 읽기
                // 출력 파일 읽기
                fs.readFile(outputFile, (err, data) => {
                    if (err) {
                        console.error('❌ 출력 파일 읽기 실패:', err);
                        cleanup();
                        reject(new Error('Cannot read output file'));
                        return;
                    }

                    console.log('\n📥 출력 파일 읽기 완료: %d bytes', data.length);
                    console.log('📝 첫 100 bytes (hex):', data.slice(0, 100).toString('hex'));
                    console.log('📝 첫 100 bytes (ascii):', data.slice(0, 100).toString('ascii'));
                    cleanup();

                    console.log('\n✅ 모든 작업 완료!\n');
                    resolve(data);
                });
            });

            ffmpeg.on('error', (err) => {
                console.error('❌ FFmpeg 프로세스 오류:', err);
                reject(new Error('ffmpeg execution error: ' + err.message));
            });

        } catch (error) {
            reject(error);
        }
    });
}

// 품질 설정 반환
function getWavConfig(quality) {
    switch (quality) {
        case 'high':
            return { sampleRate: 48000, bitDepth: 24, channels: 1 };
        case 'standard':
            return { sampleRate: 44100, bitDepth: 16, channels: 1 };
        case 'low':
        default:
            return { sampleRate: 22050, bitDepth: 8, channels: 1 };
    }
}

var bgwin = null;
var remapwin = null;
var tray = null;
let muted = false;
var disabled = muted || !preferences.get('always_active');
let lastFocusedWindow = null;
let focusedWindows = [];

// check for active window changes and update `lastFocusedWindow` when the window changes
async function monitorFocusedWindow() {
    // Skip window monitoring on Linux or if getFocusedWindow is not available
    if (!getFocusedWindow) return;
    
    try {
        const focusedWindow = await getFocusedWindow();

        if (!focusedWindow?.owner?.name) return;// return early if invalid window

        const winName = focusedWindow.owner.name
        if (winName === lastFocusedWindow?.owner?.name) return;// return early if the active window hasn't changed.
        
        const selectedApps = preferences.get('selected_apps');

        // change disable value when focusing in or out of selected-apps.
        setDisable( (preferences.get('selected_active')?!selectedApps.includes(winName):selectedApps.includes(winName)) && 
        (focusedWindow?.owner?.processId !== process.pid || winName === 'Animalese TTS') );

        lastFocusedWindow = focusedWindow;
        if (!focusedWindows.includes(winName)) {
            focusedWindows.push(winName);
            if (focusedWindows.length > 8) focusedWindows.shift();
            bgwin.webContents.send('focused-window-changed', focusedWindows);
        }
    } catch (error) {
        console.debug('Window monitoring error:', error.message);
    }
}

function startWindowMonitoring() {
    setInterval(monitorFocusedWindow, 500); // check window every .5 seconds
}
function createMainWin() {
    if(bgwin !== null) return;

    // Preload 경로 확인 및 로깅
    const preloadPath = path.join(__dirname, 'preload.cjs');
    console.log('=== PRELOAD SETUP DEBUG ===');
    console.log('Preload path:', preloadPath);
    console.log('Preload file exists:', fs.existsSync(preloadPath));
    console.log('Preload file size:', fs.existsSync(preloadPath) ? fs.statSync(preloadPath).size + ' bytes' : 'N/A');
    console.log('=========================');

    bgwin = new BrowserWindow({
        width: 580,        // 고정 크기
        height: 450,        // 고정 크기
        icon: getIconPath(),
        resizable: false,   // 크기 변경 금지
        frame: false,
        skipTaskbar: false,
        show: true,  // 즉시 표시
        minWidth: 580,     // 최소 가로 크기
        minHeight: 450,     // 최소 세로 크기
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            // Audio-related options for debugging
            audio: true,
            experimentalFeatures: false
        }
    });

    console.log('🎵 BrowserWindow audio settings:');
    console.log('  preload:', preloadPath);
    console.log('  contextIsolation:', true);
    console.log('  nodeIntegration:', false);
    console.log('  audio:', true);
    bgwin.removeMenu();
    bgwin.loadFile('editor.html');
    bgwin.webContents.send('muted-changed', muted);

    // Ready-to-show 이벤트에서 show() 호출
    bgwin.once('ready-to-show', () => {
        console.log('Main window ready, showing...');
        bgwin.show();
    });

    bgwin.on('close', function (e) {
        if (!app.isQuiting) {
            // 창을 닫을 때 트레이로 보내지 않고 실제로 닫음
            app.isQuiting = true;
            bgwin.destroy();
        }
    });

    bgwin.on('closed', function () {
        bgwin = null;
    });

    bgwin.webContents.on('before-input-event', (e, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            const wc = bgwin.webContents;
            if (wc.isDevToolsOpened()) wc.closeDevTools();
            else  wc.openDevTools({ mode: 'detach' });
            e.preventDefault();
        }
    });
}
function createRemapWin() {
    if(remapwin !== null) {
        remapwin.close();
        return;
    }
    remapwin = new BrowserWindow({
        width: 526,
        height: 628,
        icon: getIconPath(),
        resizable: true,
        frame: true,
        skipTaskbar: false,
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });
    remapwin.removeMenu();
    remapwin.loadFile('remap.html');

    remapwin.on('closed', function () {
        remapwin = null;
    });

    remapwin.webContents.on('before-input-event', (e, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            const wc = remapwin.webContents;
            if (wc.isDevToolsOpened()) wc.closeDevTools();
            else  wc.openDevTools({ mode: 'detach' });
            e.preventDefault();
        }
    });
}

// 트레이 메뉴 기능 제거
/*
function updateTrayMenu() {
    // 트레이 메뉴 제거됨
}

function createTrayIcon() {
    // 트레이 아이콘 생성 제거됨
}
*/

function updateDisableHotkey(hotkey) {
    globalShortcut.unregisterAll();
    globalShortcut.register(hotkey, () => {// TODO: give warning to renderer when hotkey registration fails
        muted = !muted;
        setDisable();
        // updateTrayMenu(); 트레이 메뉴 업데이트 제거
        if (bgwin) bgwin.webContents.send('muted-changed', muted);
    });
}

//#region KeyListener
let keyListener;

async function startKeyListener() {
    const platform = process.platform;
    let listenerPath;

    if (platform === 'win32') {
        listenerPath = isDev
            ? path.join(__dirname, 'libs', 'key-listeners', 'animalese-listener.exe')
            : path.join(process.resourcesPath, 'animalese-listener.exe');
    } else if (platform === 'darwin') {
        listenerPath = isDev
            ? path.join(__dirname, 'libs', 'key-listeners', 'animalese-listener')
            : path.join(process.resourcesPath, 'animalese-listener');
    } else if (platform === 'linux') {
        listenerPath = isDev
            ? path.join(__dirname, 'libs', 'key-listeners', 'animalese-listener')
            : `${process.resourcesPath}/animalese-listener`;// TODO: fix path for linux packaged app
    } else {
        console.error('Unsupported platform'); return;
    }
    try {
        if (fs.existsSync(listenerPath) && fs.statSync(listenerPath).isFile()) console.log('Starting animalese-listener');
    } catch (err) {
        console.error('ERROR: animalese-listener not found at:', listenerPath);
        return;
    }

    //if (!keyListener) return;
    keyListener = spawn(listenerPath);
    keyListener.stdout.on('data', data => {
        const lines = data.toString().split('\n').filter(Boolean);

        for (const line of lines) {
            if (line.toLowerCase().includes('accessibility') || line.toLowerCase().includes('permission')) {
                bgwin.webContents.send('permission-error', line);
                continue;
            }
            try {
                const event = JSON.parse(line);
                if (event.type === 'keydown' || event.type === 'keyup') {
                    bgwin.webContents.send(event.type, {
                        keycode: event.keycode,
                        shiftKey: event.shift,
                        ctrlKey: event.ctrl,
                        altKey: event.alt,
                    });
                }
            } catch (err) {
                console.error(`Invalid JSON from ${platform}:`, line);
            }
        }
    });
    keyListener.stderr.on('data', data => {
        console.log(`${platform}-listener:`, data.toString());
    });
    keyListener.on('error', (err) => {
        console.error('animalese-listener spawn error:', err && err.message ? err.message : err);
    });
    keyListener.on('exit', (code, signal) => {
        console.error('animalese-listener exited:', code, signal);
    });
}
//#endregion

function stopKeyListener() {
    if (keyListener) {
        keyListener.kill();
        keyListener = null;
    }
}

// Set userData path for portable builds (exe가 있는 디렉토리에 userData 폴더 생성)
const portableUserDataPath = path.join(path.dirname(process.execPath), 'userData');
app.setPath('userData', portableUserDataPath);
console.log('Portable userData path:', portableUserDataPath);

app.on('ready', () => {
    startWindowMonitoring();
    createMainWin();
    // createTrayIcon(); // 트레이 아이콘 생성 비활성화
    if (!disabled) startKeyListener();
    if (process.platform === 'darwin') app.dock.hide();
    // bgwin.hide(); 제거 - 창을 계속 표시

    // stop keylisteners on sleep
    powerMonitor.on('suspend', () => {
        stopKeyListener();
    });
    powerMonitor.on('resume', () => {
        if (!disabled) startKeyListener();
    });

    updateDisableHotkey(preferences.get('disable_hotkey'));
    if(!isDev) updateElectronApp();
});

app.on('activate', function () {
    if (bgwin === null) createMainWin();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    stopKeyListener();
    if (keyListener) {
        keyListener.kill('SIGKILL');
        keyListener = null;
    }
    if (bgwin) {
        bgwin.removeAllListeners();
        bgwin.close();
    }
    // if (tray) tray.destroy(); // 트레이 제거 코드 제거

    ipcMain.removeAllListeners();
    globalShortcut.unregisterAll();
});

app.on('quit', () => {
    if (keyListener) {
        keyListener.kill('SIGKILL');
    }
    app.exit(0);
});

export default app;