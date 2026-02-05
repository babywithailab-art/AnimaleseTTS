const { app, shell, contextBridge, ipcRenderer } = require('electron');
const keycodeToSound = require('./keycode-to-sound.cjs');
const translator = require('./translator.cjs');
const { createAudioManager } = require('./audio-manager.cjs');
const { initCapsLockState, isCapsLockActive } = require('./caps-lock-state.cjs');
initCapsLockState();

let settingsData = ipcRenderer.sendSync('get-store-data-sync');
const appInfo = ipcRenderer.sendSync('get-app-info');
const appPaths = ipcRenderer.sendSync('get-app-paths');
const defaultKeyMap = keycodeToSound[appInfo.platform];

function getKeyInfo(e) {// parse keyInfo from keyup/down event
    const remappedKey = settingsData.remapped_keys[e.keycode]
    const defaultKey = defaultKeyMap[e.keycode]
    if (defaultKey === undefined) return;

    const { sound = defaultKey.sound, shiftSound = defaultKey.shiftSound, ctrlSound = defaultKey.ctrlSound, altSound = defaultKey.altSound} = remappedKey || {};
    const { shiftKey, ctrlKey, altKey } = e;
    
    const finalSound = ctrlKey ? ctrlSound : altKey ? altSound : shiftKey ? shiftSound : sound;
    const defaultSound = ctrlKey ? defaultKey.ctrlSound : altKey ? defaultKey.altSound : shiftKey ? defaultKey.shiftSound : defaultKey.sound;

    return {
        keycode: e.keycode,
        key: defaultKey.key,
        sound,
        isShiftDown: shiftKey,
        shiftSound,
        isCtrlDown: ctrlKey,
        ctrlSound,
        isAltDown: altKey,
        altSound,
        finalSound,
        defaultSound,
        isCapsLock: isCapsLockActive()
    };
}

// general app messages 
contextBridge.exposeInMainWorld('api', {
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    showWindow: () => ipcRenderer.send('show-window'),
    getDefaultMapping: () => defaultKeyMap,
    sendRemapSound: (remapSound) => ipcRenderer.send('remap-send', remapSound),
    onRemapSound: (callback) => ipcRenderer.on('remap-sound', (_, remapSound) => callback(remapSound)),
    openRemapSettings: () => ipcRenderer.send('open-remap-settings'),
    onKeyDown: (callback) => ipcRenderer.on('keydown', (_, e) =>  callback( getKeyInfo(e) )),
    onKeyUp: (callback) => ipcRenderer.on('keyup', (_, e) =>  callback( getKeyInfo(e) )),
    onSettingUpdate: (key, callback) => {
        const channel = `${key}`;
        const handler = (_, value) => {
            if (document.readyState === 'loading') window.addEventListener('load', () => callback(value));
            else callback(value);
        };
        ipcRenderer.on(channel, handler);
        
        return () => ipcRenderer.removeListener(channel, handler);
    },
    onFocusedWindowChanged: (callback) => ipcRenderer.on('focused-window-changed', (_event, e) => callback(e)),
    onMutedChanged: (callback) => ipcRenderer.on('muted-changed', (_, value) => callback(value)),
    getAppInfo: () => appInfo,
    goToUrl: (url) => shell.openExternal(url),
    onPermissionError: (callback) => {
        ipcRenderer.on('permission-error', (_event, message) => callback(message));
    },
    // TTS 변환 (voiceProfile 포함)
    convertTtsToWav: (audioFiles, quality, playbackRate = 1.0, voiceProfile = { type: 'f1', pitchShift: 0, variation: 0, intonation: 0 }) =>
        ipcRenderer.invoke('tts-convert-to-wav', audioFiles, quality, playbackRate, voiceProfile),
    // 파일 저장
    saveFile: (filePath, data) =>
        ipcRenderer.invoke('save-file', filePath, data),
    // SRT 파일 선택
    selectSRTFile: () =>
        ipcRenderer.invoke('select-srt-file'),
    // 파일 읽기
    readFile: (filePath) =>
        ipcRenderer.invoke('read-file', filePath),
    // 저장 폴더 선택
    selectSaveFolder: (defaultPath) =>
        ipcRenderer.invoke('select-save-folder', defaultPath)
});

// translation functions
contextBridge.exposeInMainWorld('translator', {
    load: (lang) => translator.loadLanguage(lang),
    update: () => translator.updateHtmlDocumentTranslations()
});

// user settings get/set
contextBridge.exposeInMainWorld('settings', {
    get: (key) => settingsData[key],
    set: (key, value) => {
        settingsData[key] = value;
        return ipcRenderer.invoke('store-set', key, value)
    },
    reset: (key) => {
        ipcRenderer.invoke('store-reset', key)
        settingsData = ipcRenderer.sendSync('get-store-data-sync');
    }
});

// audio manager (자산 경로 정보 전달)
const audioManager = createAudioManager(appPaths);
contextBridge.exposeInMainWorld('audio', audioManager);

// Electron API for file operations
contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, ...args) => {
        // 유효한 채널만 허용
        const validChannels = [
            'save-to-output-folder',
            'tts-convert-to-wav',
            'save-file',
            'select-srt-file',
            'read-file',
            'select-save-folder'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Invalid channel: ${channel}`);
    }
});