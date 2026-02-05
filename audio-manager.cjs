const { Howl, Howler } = require('howler');// TODO: handle audio playback manually, without howler.js.
// handling it manually will allow me to change pitch without changing playback rate, which is not supported by howler.js
const path = require('path');
const { ipcRenderer } = require('electron');

let master_volume = ipcRenderer.sendSync('get-store-data-sync').volume;
ipcRenderer.on('updated-volume', (_, value) => {
    master_volume = value;
    console.log('Master volume updated:', master_volume);
});
let voice_profile = ipcRenderer.sendSync('get-store-data-sync').voice_profile;
ipcRenderer.on('updated-voice_profile', (_, value) => voice_profile = value);
let note_profile = ipcRenderer.sendSync('get-store-data-sync').note_profile;
ipcRenderer.on('updated-note_profile', (_, value) => note_profile = value);
let mode = ipcRenderer.sendSync('get-store-data-sync').audio_mode;
ipcRenderer.on('updated-audio_mode', (_, value) => mode = value);

// 동적으로 결정되는 오디오 경로 (createAudioManager에서 설정)
let audio_path = null;
let file_type = ".ogg";

const waitingForRelease = {};// a list of audio paths waiting for key up event to be released
const activeChannels = {};// map of currently playing sounds on a given channel (only one sound per channel)

//#region Audio Sprite Maps
// (60,000/2) / 150bpm = 200ms
const voice_sprite = {
    'a': [200 * 0,    200],
    'b': [200 * 1,    200],
    'c': [200 * 2,    200],
    'd': [200 * 3,    200],
    'e': [200 * 4,    200],
    'f': [200 * 5,    200],
    'g': [200 * 6,    200],
    'h': [200 * 7,    200],
    'i': [200 * 8,    200],
    'j': [200 * 9,    200],
    'k': [200 * 10,   200],
    'l': [200 * 11,   200],
    'm': [200 * 12,   200],
    'n': [200 * 13,   200],
    'o': [200 * 14,   200],
    'p': [200 * 15,   200],
    'q': [200 * 16,   200],
    'r': [200 * 17,   200],
    's': [200 * 18,   200],
    't': [200 * 19,   200],
    'u': [200 * 20,   200],
    'v': [200 * 21,   200],
    'w': [200 * 22,   200],
    'x': [200 * 23,   200],
    'y': [200 * 24,   200],
    'z': [200 * 25,   200],
    '1': [200 * 26,   200],
    '2': [200 * 27,   200],
    '3': [200 * 28,   200],
    '4': [200 * 29,   200],
    '5': [200 * 30,   200],
    '6': [200 * 31,   200],
    '7': [200 * 32,   200],
    '8': [200 * 33,   200],
    '9': [200 * 34,   200],
    '0': [200 * 35,   200],
    'ok':     [600 * 0 +200*36, 600],
    'gwah':   [600 * 1 +200*36, 600],
    'deska':  [600 * 2 +200*36, 600]
}

const sing = { 
    'nah': [2000 * 0,  2000],
    'me':  [2000 * 1,  2000],
    'now': [2000 * 2,  2000],
    'way': [2000 * 3,  2000],
    'oh':  [2000 * 4,  2000],
    'oh2': [2000 * 5,  2000],
    'me2': [2000 * 6,  2000],
}

// 60,000 / 100bpm = 600ms
const sfx_sprite = {
    'backspace'           : [600 * 0,  600],
    'enter'               : [600 * 1,  600],
    'tab'                 : [600 * 2,  600],
    'question'            : [600 * 3,  600],
    'exclamation'         : [600 * 4,  600],
    'space'               : [600 * 5,  600],
    'period'              : [600 * 6,  600],
    'comma'               : [600 * 7,  600],
    'at'                  : [600 * 8,  600],
    'pound'               : [600 * 9,  600],
    'dollar'              : [600 * 10, 600],
    'caret'               : [600 * 11, 600],
    'ampersand'           : [600 * 12, 600],
    'asterisk'            : [600 * 13, 600],
    'parenthesis_open'    : [600 * 14, 600],
    'parenthesis_closed'  : [600 * 15, 600],
    'bracket_open'        : [600 * 16, 600],
    'bracket_closed'      : [600 * 17, 600],
    'brace_open'          : [600 * 18, 600],
    'brace_closed'        : [600 * 19, 600],
    'tilde'               : [600 * 20, 600],
    'default'             : [600 * 21, 600],
    'arrow_left'          : [600 * 22, 600],
    'arrow_up'            : [600 * 23, 600],
    'arrow_right'         : [600 * 24, 600],
    'arrow_down'          : [600 * 25, 600],
    'slash_forward'       : [600 * 26, 600],
    'slash_back'          : [600 * 27, 600],
    'percent'             : [600 * 28, 600]
}
//endregion

function createAudioInstance(fileName, sprite = null, basePath = null) {
    const audioPath = basePath || audio_path;
    return new Howl({
        src: [path.join(audioPath, fileName + file_type)], sprite,
        onloaderror: (id, err) => console.error('Load error:', err)
    });
}
function buildSoundBanks() {
    const voices = ['f1', 'f2', 'f3', 'f4', 'm1', 'm2', 'm3', 'm4'];

    const instrumentVoices = ['girl', 'boy', 'cranky', 'kk_slider'];
    const instruments = ['organ', 'guitar', 'e_piano', 'synth', 'whistle'];

    const bank = {};
    for (const voice of voices) bank[voice] = createAudioInstance(`voice/${voice}`, voice_sprite, audio_path)

    bank['inst'] = {}
    for (const inst of instrumentVoices) bank.inst[inst] = createAudioInstance(`instrument/${inst}`, sing, audio_path);
    for (const inst of instruments) bank.inst[inst] = createAudioInstance(`instrument/${inst}`, null, audio_path);

    bank['sfx'] = createAudioInstance('sfx', sfx_sprite, audio_path);
    return bank;
}

function releaseSound(release_id, cut = true) {
    if (cut) cutOffAudio(waitingForRelease[release_id], 0.15);
    delete waitingForRelease[release_id];
}

function applyIntonation(bank, id, intonation, currentRate = 1, ramp = 2) {
const duration = 3200; // ms duration for ramp
    const startRate = Math.max(currentRate, 0.01);
    const endRate = startRate * (
        intonation >= 0
            ? 1 + intonation * 3
            : 1 - ((Math.sqrt(Math.abs(1 - intonation * 3)) - 1) * 0.75)
    );
    const steps = 64;
    const interval = duration / steps;

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;

        let easedT;
        if (ramp < 0) easedT = Math.pow(t, 1 - ramp); // ease-in
        else if (ramp > 0) easedT = 1 - Math.pow(1 - t, 1 + ramp); // ease-out
        else easedT = t; // linear
    
        const rate = startRate * ((endRate / startRate) ** easedT);

        setTimeout(() => bank.rate(rate, id), i * interval);
    }
}

// audio channel cutoff logic
function cutOffAudio(audio, release=0.025) {
    CUTOFF_DURATION=release;
    const prev = audio;
    if (!prev || !prev.bank.playing(prev.id)) return;

    prev.bank.fade(prev.bank.volume(prev.id), 0, CUTOFF_DURATION * 1000, prev.id);
    setTimeout(() => prev.bank.stop(prev.id), CUTOFF_DURATION * 1000);
};

//#region Init Audio Manager
function createAudioManager(appPaths = null) {
    // 오디오 자산 경로 설정
    if (appPaths && appPaths.audioAssetsPath) {
        audio_path = path.join(appPaths.audioAssetsPath, 'audio');
        console.log('=== Audio Path Resolution ===');
        console.log('Is Packaged:', appPaths.isPackaged);
        console.log('Audio Assets Path:', appPaths.audioAssetsPath);
        console.log('Final Audio Path:', audio_path);
        console.log('===========================');
    } else {
        console.warn('⚠️ appPaths not provided, using default audio path');
    }

    const audioFileCache = {};
    const soundBanks = buildSoundBanks();

    // main audio playback function
    function playSound(path, {volume=1, pitchShift=0, pitchVariation=0, intonation=0, note=60, channel=undefined, hold=undefined, noRandom=false, yelling=false, type=undefined} = {}) {
        console.log(`\n🔊 [AUDIO MANAGER] playSound called:`);
        console.log('  Input path:', path);
        console.log('  Volume:', volume);
        console.log('  Pitch:', pitchShift);
        console.log('  Pitch variation:', pitchVariation);
        console.log('  Intonation:', intonation);
        console.log('  Note:', note);
        console.log('  Channel:', channel);
        console.log('  Hold:', hold);
        console.log('  No random:', noRandom);
        console.log('  Yelling:', yelling);
        console.log('  Type:', type);
        console.log('  Mode:', mode);

        if (!path || path === '') {
            console.log('⚠️ [AUDIO MANAGER] Empty path, returning');
            return;
        }
        if (waitingForRelease[hold]) {
            console.log('⚠️ [AUDIO MANAGER] Waiting for release, returning');
            return;
        }

        if(path === '&.gwah' && mode!==3) playSound('sfx.exclamation');
        if(path === '&.deska' && mode!==3) playSound('sfx.question');

        const isSpecial = path.startsWith('#');
        const isVoice = path.startsWith('&');
        const isInstrument = path.startsWith('%');
        const isSfx = path.startsWith('sfx')
        if (isSpecial) return; // no sounds for special commands
        
        if (mode===1 && isSfx) path = 'sfx.default';
        if (mode===2 && isVoice) path = 'sfx.default';
        if (mode===3 && !noRandom) {
            if (isVoice) { // play random animalese sound
                const sounds = Object.assign(Object.keys(voice_sprite))
                path = `&.${ sounds[Math.floor(Math.random() * 26)] }`;
            }
            else if (isInstrument) { // play random note pitch
                path = `%.${ Math.floor(Math.random() * 36) + 36 }`;
            }
            else if (isSfx) { // play random sound effect
                const sounds = Object.keys(sfx_sprite)
                path = `sfx.${ sounds[Math.floor(Math.random() * sounds.length)] }`;
            }
        }

        if (isInstrument) {
            const parsedNote = parseInt(path.replace('%.', ''));
            note = isNaN(parsedNote) ? note : parsedNote;
            path = `inst.${note_profile.instrument}`;
            pitchShift += note_profile.transpose;
        }

        if (isVoice) { // apply animalese voice profile
            volume = yelling? .75: .65;
            // TTS에서 전달한 pitchShift와 voice_profile.pitch 합산
            pitchShift = (yelling? 1.5: 0) + voice_profile.pitch + pitchShift;
            // variation: TTS에서 전달한 값 또는 voice_profile의 기본값
            pitchVariation = (yelling? 1: 0) + voice_profile.variation + (pitchVariation || 0);
            intonation = voice_profile.intonation;
            channel = channel ?? 1;
            // TTS에서 전달한 type이 있으면 사용, 否则 기본 voice_profile.type 사용
            const voiceType = type || voice_profile.type;
            path = path.replace('&', voiceType);
        }

        const parts = path.split(".");
        let bank, sprite;
        
        //parse audio identifier
        switch (parts.length) {
            case 1: {
                if (audioFileCache[path]) bank = audioFileCache[path];  
                else {
                    bank = new Howl({
                        src: [audio_path + path + file_type],
                        onloaderror: (id, err) => console.warn(`Load error for ${path}:`)
                    });
                    audioFileCache[path] = bank;
                }
                break;
            }
            case 2: {
                const [bankKey, soundName] = parts;
                bank = soundBanks[bankKey];
                sprite = soundName;
                break;
            }
            case 3: {
                const [bankKey, typeKey, soundName] = parts;
                bank = soundBanks[bankKey]?.[typeKey];
                sprite = soundName;
                break;
            }
            default:
                console.warn(`Unrecognized audio path format: ${path}`);
                return;
        }

        if (isInstrument){
            bank = bank[`${sprite}`];
            if (bank._sprite.length === 0) bank._sprite = {[`${sprite}`]: [0, 1000]};
            else {
                const sounds = Object.keys(bank._sprite);
                sprite = `${ sounds[Math.floor(Math.random() * sounds.length)] }`;
            }
        } 

        if ( !bank || !(sprite in bank._sprite) ) {
            console.warn(`Sound not found: ${path}`);
            return;
        }
        if (channel !== undefined) cutOffAudio(activeChannels[channel]);

        console.log(`🎵 [AUDIO MANAGER] About to play with Howler.js:`);
        console.log('  Bank:', bank);
        console.log('  Bank type:', typeof bank);
        console.log('  Bank._sprite:', bank._sprite);
        console.log('  Sprite name:', sprite);
        console.log('  Channel:', channel);

        // play the audio
        console.log('🚀 [AUDIO MANAGER] Calling bank.play()...');
        const id = (bank._sprite) ? bank.play(sprite) : bank.play();
        console.log('✓ [AUDIO MANAGER] bank.play() returned id:', id);

        // Add error handler for Howler.js
        bank.on('error', (error) => {
            console.error('🚨 [AUDIO MANAGER] Howler.js error:', error);
        });
        bank.on('loaderror', (id, error) => {
            console.error('🚨 [AUDIO MANAGER] Howler.js load error:', { id, error });
        });
        bank.on('playerror', (id, error) => {
            console.error('🚨 [AUDIO MANAGER] Howler.js play error:', { id, error });
        });

        // apply volume
        console.log('🔊 [AUDIO MANAGER] Setting volume:', master_volume*volume, 'for id:', id);
        bank.volume(master_volume*volume, id);

        // calculate pitch with variation
        const finalPitch = (note - 60) + pitchShift + (Math.random()*2-1.0)*pitchVariation;
        const rate = Math.pow(2, finalPitch / 12.0);
        console.log('🎵 [AUDIO MANAGER] Setting rate:', rate, 'for id:', id);
        bank.rate(rate, id);

        // apply intonation
        if (intonation !== undefined) {
            console.log('🎼 [AUDIO MANAGER] Applying intonation:', intonation, 'for id:', id);
            applyIntonation(bank, id, intonation, bank.rate(id));
        }

        // add this sound to a cutoff channel
        if (channel !== undefined) {
            console.log('📍 [AUDIO MANAGER] Adding to channel:', channel, 'for id:', id);
            activeChannels[channel] = { bank, id };
        }
        if (hold !== undefined) {
            console.log('⏳ [AUDIO MANAGER] Adding to hold:', hold, 'for id:', id);
            waitingForRelease[hold] = { bank, id };
        }

        // Check for errors after setup
        console.log('✅ [AUDIO MANAGER] Sound playback setup completed');
        console.log('  Sound path:', path);
        console.log('  Bank loaded:', bank._sounds?.length || 0);
        console.log('  Bank muted:', bank._muted);
        console.log('  Bank volume:', bank._volume);
        console.log('  Master volume:', master_volume);
        console.log('===============================================');

        // Monitor for playback errors
        bank.on('end', () => {
            console.log('🔚 [AUDIO MANAGER] Sound playback ended:', path);
        });

        bank.on('stop', () => {
            console.log('⏹️ [AUDIO MANAGER] Sound playback stopped:', path);
        });
    }

    // ===== TTS 전용 함수들 =====

    /**
     * Howler AudioContext 반환 (TTS에서 사용)
     * @returns {AudioContext} AudioContext 인스턴스
     */
    function getAudioContext() {
        // Howler.ctx 유효성 검사
        const ctx = Howler.ctx;

        console.log('getAudioContext() 호출됨');
        console.log('Howler.ctx:', ctx);
        console.log('Howler.ctx 타입:', typeof ctx);
        console.log('Howler.ctx 생성자:', ctx && ctx.constructor.name);

        // 빈 객체이거나 AudioContext가 아닌 경우
        if (!ctx ||
            (typeof ctx === 'object' && Object.keys(ctx).length === 0) ||
            !ctx.createMediaStreamDestination) {

            console.warn('❌ Howler.ctx이 유효하지 않습니다');
            console.warn('  - ctx 존재:', !!ctx);
            console.warn('  - ctx가 객체인지:', typeof ctx === 'object');
            console.warn('  - 빈 객체인지:', ctx && Object.keys(ctx).length === 0);
            console.warn('  - createMediaStreamDestination 있는지:', ctx && !!ctx.createMediaStreamDestination);

            // 새 AudioContext 생성
            console.log('새 AudioContext 생성 시도...');
            const newCtx = new (window.AudioContext || window.webkitAudioContext)();
            console.log('✅ 새 AudioContext 생성됨:', newCtx);
            console.log('AudioContext 상태:', newCtx.state);

            // Howler.ctx 업데이트 (가능한 경우)
            try {
                console.log('Howler.ctx 업데이트 시도...');
                Howler.ctx = newCtx;
                console.log('✅ Howler.ctx 업데이트됨');

                // Howler._ctx도 확인
                if (Howler._ctx) {
                    console.log('Howler._ctx도 존재함:', Howler._ctx);
                }
            } catch (e) {
                console.warn('⚠️ Howler.ctx를 업데이트할 수 없습니다:', e.message);
            }

            return newCtx;
        }

        // AudioContext가 유효한 경우
        console.log('✅ 기존 Howler.ctx 사용:', ctx);
        console.log('AudioContext 상태:', ctx.state);
        return ctx;
    }

    /**
     * MediaRecorder Destination에 Howler 마스터 연결
     * Electron 환경에서 Howler 오디오를 녹음용 destination에 연결합니다.
     *
     * @param {MediaStreamDestination} destination - 녹음용 destination
     */
    function connectToRecorder(destination) {
        console.log('\n=== Howler → MediaRecorder 연결 시작 ===');
        console.log('destination:', destination);
        console.log('destination.constructor.name:', destination.constructor.name);
        console.log('destination.stream:', destination.stream);
        console.log('destination.stream.active:', destination.stream ? destination.stream.active : 'undefined');

        // destination.stream 유효성 확인
        if (!destination.stream) {
            console.error('❌ destination.stream이 undefined/null입니다!');
            console.error('destination 전체 구조:', JSON.stringify(destination, null, 2));
            return; // 연결 시도하지 말고 즉시 반환
        }

        try {
            // Electron 환경 감지
            const isElectron = typeof window !== 'undefined' &&
                              typeof window.process === 'object' &&
                              window.process.type === 'renderer';

            console.log('Electron 환경:', isElectron);

            // Howler AudioContext 정보 출력
            console.log('Howler.ctx:', Howler.ctx);
            console.log('Howler.ctx.state:', Howler.ctx.state);
            console.log('Howler.ctx.sampleRate:', Howler.ctx.sampleRate);

            // Electron에서 Howler._sounds를 통한 직접 연결 시도
            if (isElectron) {
                console.log('\nElectron 환경: Howler._sounds 직접 연결 시도');
                connectViaHowlerSounds(destination);
                return;
            }

            // 브라우저 환경: 기존 방식 사용
            console.log('\n브라우저 환경: masterGain 연결 시도');

            let masterGain = null;

            // 방법 1: Howler._masterGain 시도
            if (Howler._masterGain && Howler._masterGain.connect) {
                masterGain = Howler._masterGain;
                console.log('방법 1 성공: Howler._masterGain 사용');
            }
            // 방법 2: Howler.masterGain 시도
            else if (Howler.masterGain && Howler.masterGain.connect) {
                masterGain = Howler.masterGain;
                console.log('방법 2 성공: Howler.masterGain 사용');
            }
            // 방법 3: AudioContext에 새 GainNode 생성
            else {
                console.log('방법 3: 새 masterGain 생성 시도');
                masterGain = Howler.ctx.createGain();
                masterGain.gain.value = 1.0; // 완전 볼륨으로 설정

                // Howler의 master에 연결할 수 있는지 확인
                if (Howler.ctx.destination && Howler.ctx.destination.connect) {
                    try {
                        masterGain.connect(Howler.ctx.destination);
                        console.log('새 masterGain이 AudioContext.destination에 연결됨');
                        Howler.masterGain = masterGain;
                    } catch (e) {
                        console.warn('AudioContext.destination 연결 실패:', e);
                    }
                }
            }

            if (masterGain) {
                masterGain.connect(destination);
                console.log('✅ masterGain → destination 연결 성공');

                // 연결 상태 검증
                const track = destination.stream.getAudioTracks()[0];
                if (track) {
                    console.log('AudioTrack 상태:', {
                        enabled: track.enabled,
                        muted: track.muted,
                        readyState: track.readyState,
                        label: track.label
                    });
                }

                // 500ms 후 연결 상태 다시 확인
                setTimeout(() => {
                    const active = destination.stream.active;
                    console.log('500ms 후 연결 상태:', { active });
                    if (!active) {
                        console.warn('⚠️ destination.stream이 inactive 상태입니다. 오디오가 캡처되지 않을 수 있습니다.');
                    }
                }, 500);
            } else {
                throw new Error('masterGain을 생성할 수 없습니다');
            }

        } catch (error) {
            console.error('❌ Howler AudioContext 접근 실패:', error);
            console.error('오류 스택:', error.stack);

            // 대안: AudioContext.destination에 직접 연결 (재생은 안 될 수 있음)
            try {
                console.log('\n대안: AudioContext.destination에 직접 연결 시도');
                Howler.ctx.connect(destination);
                console.log('⚠️ AudioContext.destination이 destination에 연결됨 (재생에 문제가 있을 수 있음)');
            } catch (directError) {
                console.error('❌ 대안 연결도 실패:', directError);
                throw new Error('모든 오디오 연결 방법이 실패했습니다. Electron에서 오디오 캡처가 지원되지 않을 수 있습니다.');
            }
        }
    }

    /**
     * Howler._sounds를 통한 직접 연결 (Electron 전용)
     *
     * Electron에서는 Howler._sounds 배열의 각 소리에 대해
     * 직접 audio object에 gain node를 삽입하여录音합니다.
     *
     * @param {MediaStreamDestination} destination - 녹음용 destination
     */
    function connectViaHowlerSounds(destination) {
        try {
            // _sounds가 존재하는지 확인
            if (!Howler._sounds) {
                console.error('Howler._sounds를 찾을 수 없습니다');
                return;
            }

            console.log('Howler._sounds 수:', Howler._sounds.length);

            // _sounds의 각 항목에 대해 연결
            const captureNodes = [];

            Howler._sounds.forEach((sound, index) => {
                try {
                    // Howler 사운드에서 WebAudio 노드 추출
                    if (sound._node && sound._node.gain) {
                        // Gain node 연결
                        sound._node.gain.connect(destination);
                        captureNodes.push(sound._node.gain);
                        console.log(`사운드 ${index} 연결됨`);
                    }
                    // alternative: sound._webAudio 노드 확인
                    else if (sound._webAudio) {
                        const sourceNode = sound._webAudio;
                        if (sourceNode.connect) {
                            sourceNode.connect(destination);
                            captureNodes.push(sourceNode);
                            console.log(`사운드 ${index} (_webAudio) 연결됨`);
                        }
                    }
                } catch (e) {
                    console.warn(`사운드 ${index} 연결 실패:`, e);
                }
            });

            if (captureNodes.length > 0) {
                console.log(`✅ ${captureNodes.length}개 사운드가 destination에 연결됨`);

                // 연결 상태 확인
                const track = destination.stream.getAudioTracks()[0];
                if (track) {
                    console.log('AudioTrack 상태:', track.enabled, track.muted, track.readyState);
                }
            } else {
                console.warn('⚠️ 연결된 사운드가 없습니다');
            }

        } catch (error) {
            console.error('❌ _sounds 연결 실패:', error);
            console.error('오류 스택:', error.stack);
        }
    }

    /**
     * 음성이 재생 중인지 확인
     * @returns {boolean} 재생 중 여부
     */
    function isPlaying() {
        // 활성화된 채널이 있는지 확인
        return Object.keys(activeChannels).length > 0;
    }

    // 마스터 볼륨 설정 함수
    function setMasterVolume(volume) {
        master_volume = volume;
        console.log('Master volume set to:', master_volume);
        // IPC를 통해 main 프로세스에 volume 변경 알림
        ipcRenderer.send('volume-changed', master_volume);
    }

    return {
        // 기존 함수들
        play: playSound,
        release: releaseSound,
        cutOffAudio: cutOffAudio,

        // TTS 전용
        getAudioContext,
        connectToRecorder,
        isPlaying,

        // 볼륨 제어
        setMasterVolume,
        getMasterVolume: () => master_volume
    };
}

module.exports = { createAudioManager };
//#endregion