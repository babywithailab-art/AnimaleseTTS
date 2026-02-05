/**
 * Animalese TTS Engine
 * 텍스트를 애니멀리즈 효과로 변환하는 메인 엔진
 */

// 한글 자모 매핑 테이블
const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGSEONG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGSEONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// 자모 → 알파벳 매핑 테이블
const JAMO_TO_ALPHA = {
    // 초성/종성 (자음)
    'ㄱ': 'g', 'ㄲ': 'kk', 'ㄳ': 'gs',
    'ㄴ': 'n', 'ㄵ': 'nj', 'ㄶ': 'nh',
    'ㄷ': 'd', 'ㄸ': 'dd',
    'ㄹ': 'r', 'ㄺ': 'rg', 'ㄻ': 'rm', 'ㄼ': 'rb', 'ㄽ': 'rs', 'ㄾ': 'rt', 'ㄿ': 'rp', 'ㅀ': 'rh',
    'ㅁ': 'm',
    'ㅂ': 'b', 'ㅃ': 'bb', 'ㅄ': 'bs',
    'ㅅ': 's', 'ㅆ': 'ss',
    'ㅇ': '',  // 무음 (초성/종성에서)
    'ㅈ': 'j', 'ㅉ': 'jj',
    'ㅊ': 'ch',
    'ㅋ': 'k',
    'ㅌ': 't',
    'ㅍ': 'p',
    'ㅎ': 'h',

    // 중성 (모음)
    'ㅏ': 'a',
    'ㅐ': 'ae',
    'ㅑ': 'ya',
    'ㅒ': 'yae',
    'ㅓ': 'eo',
    'ㅔ': 'e',
    'ㅕ': 'yeo',
    'ㅖ': 'ye',
    'ㅗ': 'o',
    'ㅘ': 'wa',
    'ㅙ': 'wae',
    'ㅚ': 'wi',
    'ㅛ': 'yo',
    'ㅜ': 'u',
    'ㅝ': 'wo',
    'ㅞ': 'we',
    'ㅟ': 'wi',
    'ㅠ': 'yu',
    'ㅡ': 'eu',
    'ㅢ': 'ui',
    'ㅣ': 'i'
};

class TextProcessor {
    constructor() {
        this.jamoMap = JAMO_TO_ALPHA;
    }

    /**
     * 텍스트를 문자 타입별로 파싱
     * @param {string} text - 입력 텍스트
     * @returns {Array} 파싱된 토큰 배열
     */
    parse(text) {
        const result = [];
        let buffer = '';
        let type = null;

        for (const char of text) {
            const charType = this.getCharType(char);

            if (charType !== type && buffer) {
                result.push({ type, text: buffer });
                buffer = '';
                type = charType;
            }

            type = charType;
            buffer += char;
        }

        if (buffer) {
            result.push({ type, text: buffer });
        }

        return result;
    }

    /**
     * 문자의 타입判定
     * @param {string} char - 입력 문자
     * @returns {string} 문자 타입 (korean, english, number, symbol)
     */
    getCharType(char) {
        const code = char.charCodeAt(0);

        // 한글 (자모 포함)
        if (code >= 44032 && code <= 55203) return 'korean';
        if (code >= 12593 && code <= 12643) return 'korean';

        // 영어
        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return 'english';

        // 숫자
        if (code >= 48 && code <= 57) return 'number';

        // ASCII 특수문자
        if (code <= 127) return 'symbol';

        return 'other';
    }

    /**
     * 한글 텍스트를 자모로 분리
     * @param {string} hangul - 한글 텍스트
     * @returns {Array} 자모 배열
     */
    decomposeHangul(hangul) {
        const result = [];
        for (const char of hangul) {
            const code = char.charCodeAt(0);

            if (code >= 44032 && code <= 55203) {
                // 한글 음절 분해
                const index = code - 44032;
                const choseongIndex = Math.floor(index / (21 * 28));
                const jungseongIndex = Math.floor((index % (21 * 28)) / 28);
                const jongseongIndex = index % 28;

                if (CHOSEONG[choseongIndex]) result.push(CHOSEONG[choseongIndex]);
                if (JUNGSEONG[jungseongIndex]) result.push(JUNGSEONG[jungseongIndex]);
                if (JONGSEONG[jongseongIndex]) result.push(JONGSEONG[jongseongIndex]);
            } else if (code >= 12593 && code <= 12643) {
                // 한글 자모
                result.push(char);
            } else {
                result.push(char);
            }
        }
        return result;
    }

    /**
     * 자모를 영어 알파벳으로 매핑
     * @param {string} jamo - 자모 문자
     * @returns {string} 매핑된 알파벳
     */
    mapJamoToAlpha(jamo) {
        return this.jamoMap[jamo] || jamo;
    }

    /**
     * 한글 텍스트를 알파벳으로 변환
     * @param {string} koreanText - 한글 텍스트
     * @returns {string} 알파벳 문자열
     */
    processKorean(koreanText) {
        const jamo = this.decomposeHangul(koreanText);
        return jamo.map(j => this.mapJamoToAlpha(j)).join('');
    }

    /**
     * 텍스트를 애니멀리즈 시퀀스로 변환
     * @param {string} text - 입력 텍스트
     * @param {Object} voiceProfile - 음성 프로필
     * @returns {Array} 애니멀리즈 시퀀스
     */
    textToAnimalese(text, voiceProfile) {
        const tokens = this.parse(text);
        const sequence = [];

        console.log('🎵 TTS 변환 시작:', text);
        console.log('🎛️ Voice Profile:', {
            volume: voiceProfile.volume,
            pitchShift: voiceProfile.pitchShift,
            variation: voiceProfile.variation,
            intonation: voiceProfile.intonation,
            type: voiceProfile.type
        });

        for (const token of tokens) {
            let sounds = [];

            switch (token.type) {
                case 'korean':
                    // 한글: 자모 분리 → 알파벳 매핑
                    const alpha = this.processKorean(token.text);
                    sounds = this.alphaToSounds(alpha, voiceProfile);
                    break;

                case 'english':
                    // 영어: 알파벳을 직접 매핑
                    sounds = this.alphaToSounds(token.text.toLowerCase(), voiceProfile);
                    break;

                case 'number':
                    // 숫자: 기존 방식 (&.0, &.1, ...)
                    sounds = this.numberToSounds(token.text, voiceProfile);
                    break;

                case 'symbol':
                    // 특수문자: SFX 시스템
                    sounds = this.symbolToSounds(token.text, voiceProfile);
                    break;

                default:
                    // 기타 문자: 각 문자별로 처리
                    sounds = this.charToSounds(token.text, voiceProfile);
            }

            sequence.push(...sounds);
        }

        console.log('✅ TTS 변환 완료, 시퀀스 길이:', sequence.length);
        console.log('📝 첫 5개 소리:', sequence.slice(0, 5));

        return sequence;
    }

    /**
     * 알파벳을 애니멀리즈 소리로 변환
     * @param {string} alpha - 알파벳 문자열
     * @param {Object} voiceProfile - 음성 프로필
     * @returns {Array} 소리 시퀀스
     */
    alphaToSounds(alpha, voiceProfile) {
        const sounds = [];
        for (const char of alpha) {
            if (char.match(/[a-z]/)) {
                // variation은 audio-manager에서만 적용 (중복 방지)
                const pitchVariation = this.getCharPitch(char);

                sounds.push({
                    path: `&.${char}`,
                    duration: this.getCharDuration(char),
                    volume: voiceProfile.volume || 0.65,
                    pitchShift: (voiceProfile.pitchShift || 0) + pitchVariation,
                    variation: voiceProfile.variation || 0,  // variation 값을 audio-manager에 전달
                    intonation: voiceProfile.intonation || 0,
                    rate: 1.0,
                    type: voiceProfile.type || 'f1'  // 음성 타입 추가
                });
            }
        }
        return sounds;
    }

    /**
     * 숫자를 애니멀리즈 소리로 변환
     * @param {string} number - 숫자 문자열
     * @param {Object} voiceProfile - 음성 프로필
     * @returns {Array} 소리 시퀀스
     */
    numberToSounds(number, voiceProfile) {
        const sounds = [];
        for (const digit of number) {
            sounds.push({
                path: `&.${digit}`,
                duration: this.getCharDuration(digit),
                volume: voiceProfile.volume || 0.65,
                pitchShift: (voiceProfile.pitchShift || 0),
                variation: voiceProfile.variation || 0,
                intonation: voiceProfile.intonation || 0,
                rate: 1.0,
                type: voiceProfile.type || 'f1'  // 음성 타입 추가
            });
        }
        return sounds;
    }

    /**
     * 특수문자를 SFX로 변환
     * @param {string} symbol - 특수문자
     * @param {Object} voiceProfile - 음성 프로필
     * @returns {Array} 소리 시퀀스
     */
    /**
     * SFX 버튼 상태 확인
     * @returns {boolean} SFX가 활성화되어 있는지 여부
     */
    isSFXEnabled() {
        const sfxButton = document.getElementById('sfx_button');
        if (!sfxButton) return true; // 버튼이 없으면 기본값 true
        return sfxButton.getAttribute('pressed') === 'true';
    }

    symbolToSounds(symbol, voiceProfile) {
        // SFX 버튼이 비활성화되어 있으면 빈 배열 반환
        if (!this.isSFXEnabled()) {
            return [];
        }

        const sounds = [];
        const sfxMap = {
            ' ': { path: 'sfx.space', duration: 150 },
            '!': { path: 'sfx.exclamation', duration: 200 },
            '?': { path: 'sfx.question', duration: 200 },
            '.': { path: 'sfx.period', duration: 200 },
            ',': { path: 'sfx.comma', duration: 150 },
            '\n': { path: 'sfx.enter', duration: 250 }
        };

        for (const char of symbol) {
            const sfx = sfxMap[char];
            if (sfx) {
                sounds.push({
                    ...sfx,
                    volume: voiceProfile.volume || 0.65,
                    pitchShift: voiceProfile.pitchShift || 0,
                    variation: voiceProfile.variation || 0,
                    intonation: voiceProfile.intonation || 0,
                    rate: 1.0,
                    type: voiceProfile.type || 'f1'  // 음성 타입 추가
                });
            }
        }
        return sounds;
    }

    /**
     * 문자를 개별적으로 처리
     * @param {string} char - 문자
     * @param {Object} voiceProfile - 음성 프로필
     * @returns {Array} 소리 시퀀스
     */
    charToSounds(char, voiceProfile) {
        if (char === ' ') {
            // SFX 버튼이 비활성화되어 있으면 빈 배열 반환
            if (!this.isSFXEnabled()) {
                return [];
            }
            return [{ path: 'sfx.space', duration: 150, volume: voiceProfile.volume || 0.65, pitchShift: voiceProfile.pitchShift || 0, variation: voiceProfile.variation || 0, intonation: voiceProfile.intonation || 0, rate: 1.0, type: voiceProfile.type || 'f1' }];
        }
        return [];
    }

    /**
     * 문자의 지속 시간 계산
     * @param {string} char - 문자
     * @returns {number} 지속 시간 (ms)
     */
    getCharDuration(char) {
        // 모음은 더 길게, 자음은 더 짧게
        const vowels = 'aeiouy';
        const durationMap = {
            'a': 120, 'e': 110, 'i': 100, 'o': 115, 'u': 105,
            'b': 80, 'c': 85, 'd': 85, 'f': 80, 'g': 80,
            'h': 90, 'j': 75, 'k': 80, 'l': 85, 'm': 85,
            'n': 85, 'p': 80, 'q': 80, 'r': 90, 's': 85,
            't': 85, 'v': 80, 'w': 100, 'x': 85, 'y': 100, 'z': 85
        };
        return durationMap[char] || 90;
    }

    /**
     * 문자의 피치 계산
     * @param {string} char - 문자
     * @returns {number} 피치 값
     */
    getCharPitch(char) {
        // 문자에 따른 피치 변화 (약간의 변주)
        const pitchMap = {
            'a': 0.5, 'e': 0.3, 'i': 0.8, 'o': 0.4, 'u': 0.6,
            'b': -0.2, 'c': 0, 'd': 0, 'f': -0.1, 'g': -0.1,
            'h': 0.1, 'j': 0.2, 'k': 0, 'l': 0.1, 'm': -0.1,
            'n': 0, 'p': -0.2, 'q': 0, 'r': 0.2, 's': 0,
            't': 0, 'v': 0, 'w': 0.3, 'x': 0, 'y': 0.4, 'z': 0
        };
        return pitchMap[char] || 0;
    }
}

class WaveRecorder {
    constructor(audioManager) {
        this.audioManager = audioManager;
    }

    /**
     * Howler 초기화 보장 (음소거状态下 테스트 사운드 재생)
     * Howler.ctx이 제대로 초기화되지 않은 경우, 음소거된 사운드를 재생하여 초기화합니다.
     *
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async ensureHowlerInitialized() {
        console.log('\n=== Howler 초기화 보장 ===');

        try {
            // 현재 AudioContext 상태 확인
            const ctx = this.audioManager.getAudioContext();
            console.log('현재 AudioContext:', ctx);
            console.log('AudioContext 상태:', ctx.state);

            // AudioContext가 suspended이면 resume
            if (ctx.state !== 'running') {
                console.log('AudioContext resume 시도...');
                await ctx.resume();
                console.log('AudioContext resume됨, 새 상태:', ctx.state);
            }

            // Howler._sounds 배열 확인
            if (typeof Howler !== 'undefined' && Howler._sounds) {
                console.log('Howler._sounds 존재:', Howler._sounds.length, '개 사운드');
            }

            // Howler.ctx가 여전히 빈 객체이면 테스트 사운드 재생
            if (Object.keys(ctx).length === 0) {
                console.warn('Howler.ctx이 빈 객체입니다. 테스트 사운드 재생하여 초기화 시도...');

                // 음소거된 사운드 재생 (0 볼륨)
                this.audioManager.play('&.a', { volume: 0, noRandom: true });

                // 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 100));

                // 다시 AudioContext 확인
                const newCtx = this.audioManager.getAudioContext();
                console.log('테스트 후 AudioContext:', newCtx);
                console.log('새 AudioContext 상태:', newCtx.state);

                if (Object.keys(newCtx).length === 0) {
                    console.error('AudioContext가 여전히 빈 객체입니다');
                    return false;
                }
            }

            console.log('✅ Howler 초기화 확인됨\n');
            return true;
        } catch (error) {
            console.error('Howler 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 오디오 캡처 연결 테스트
     * 연결이 정상적으로 작동하는지 간단한 테스트를 수행합니다.
     *
     * @returns {Promise<boolean>} 연결 성공 여부
     */
    async testAudioCapture() {
        console.log('\n=== 오디오 캡처 연결 테스트 ===');

        try {
            const audioContext = this.audioManager.getAudioContext();
            if (!audioContext || !audioContext.createMediaStreamDestination) {
                console.error('AudioContext 또는 MediaStreamDestination 지원 안 함');
                return false;
            }

            const destination = audioContext.createMediaStreamDestination();
            console.log('MediaStreamDestination 생성됨');

            // 빈 소리 재생으로 연결 테스트
            this.audioManager.connectToRecorder(destination);

            // 잠시 대기 후 연결 상태 확인
            await new Promise(resolve => setTimeout(resolve, 200));

            const track = destination.stream.getAudioTracks()[0];
            if (!track) {
                console.error('AudioTrack을 찾을 수 없음');
                return false;
            }

            console.log('✓ AudioTrack 발견:', {
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState
            });

            console.log('=== 테스트 완료: 성공 ===\n');
            return true;
        } catch (error) {
            console.error('=== 테스트 실패:', error.message, '===\n');
            return false;
        }
    }

    /**
     * 음성 시퀀스를 WAV로 변환 (원본 파일 기반)
     *
     * MediaRecorder 대신 원본 오디오 파일들을 ffmpeg로 직접 변환합니다.
     * 더 안정적이고 Electron 환경에서도 작동합니다.
     *
     * @param {Array} soundSequence - 음성 시퀀스
     * @param {Object} options - 옵션 (quality 등)
     * @returns {Promise<Blob>} WAV Blob
     */
    async recordSequence(soundSequence, options = {}) {
        console.log('\n========================================');
        console.log('=== 원본 파일 기반 변환 시작 ===');
        console.log('========================================');
        console.log('시퀀스 길이:', soundSequence.length);
        console.log('옵션:', options);

        const quality = options.quality || 'low';
        const playbackRate = options.playbackRate || 1.0;
        let voiceProfile = options.voiceProfile || { type: 'f1', pitchShift: 0, variation: 0, intonation: 0 };

        // 음성프로필이 없으면 기본값 사용 (강제 적용)
        if (!voiceProfile) {
            console.warn('⚠️ voiceProfile이 undefined입니다. 기본값을 사용합니다.');
            voiceProfile = { type: 'f1', pitchShift: 0, variation: 0, intonation: 0 };
        }

        try {
            // 음성 시퀀스를 오디오 파일 목록으로 변환
            const audioFiles = this.sequenceToAudioFiles(soundSequence, voiceProfile);
            console.log('변환된 오디오 파일 목록:', audioFiles);

            // ffmpeg로 오디오 파일들을 하나의 WAV로 변환
            const wavBlob = await this.convertAudioFilesToWav(audioFiles, quality, playbackRate, voiceProfile);
            console.log('\n========================================');
            console.log('=== 변환 성공 ===');
            console.log('========================================\n');
            return wavBlob;
        } catch (error) {
            console.error('변환 실패:', error);
            throw new Error(`오디오 변환 중 오류가 발생했습니다: ${error.message}`);
        }
    }

    /**
     * 음성 시퀀스에서 음성프로필 정보 추출
     * @param {Array} audioFiles - 오디오 파일 정보 배열
     * @returns {Object} 음성 프로필 정보
     */
    extractVoiceProfileFromSequence(audioFiles) {
        // audioFiles에는 음성프로필 정보가 없으므로 기본값 반환
        // 실제 값은 voiceProfile 파라미터로 전달받음
        return {
            type: 'f1',
            pitchShift: 0,
            variation: 0,
            intonation: 0
        };
    }

    /**
     * 음성 시퀀스를 오디오 파일 목록으로 변환
     * @param {Array} soundSequence - 음성 시퀀스
     * @param {Object} voiceProfile - 음성 프로필 (type 포함)
     * @returns {Array} 오디오 파일 정보 배열
     */
    sequenceToAudioFiles(soundSequence, voiceProfile) {
        const audioFiles = [];
        const voiceType = voiceProfile?.type || 'f1';

        for (const sound of soundSequence) {
            // 음성 경로를 파일 정보로 변환 (voiceType 포함)
            const fileInfo = this.soundPathToFileInfo(sound.path, voiceType);
            if (fileInfo) {
                audioFiles.push({
                    path: fileInfo.filePath,
                    offset: fileInfo.offset,
                    duration: fileInfo.duration,
                    soundDuration: sound.duration / 1000 // seconds
                });
            }
        }

        // 최적화: 동일한 파일 경로, 오프셋, duration을 가진 연속된 세그먼트들을 합치기
        const optimizedFiles = this.optimizeAudioFiles(audioFiles);
        return optimizedFiles;
    }

    /**
     * 연속된 동일 세그먼트들을 하나로 합치기 (최적화)
     * @param {Array} audioFiles - 오디오 파일 정보 배열
     * @returns {Array} 최적화된 오디오 파일 정보 배열
     */
    optimizeAudioFiles(audioFiles) {
        if (audioFiles.length === 0) return audioFiles;

        // 최적화 비활성화 - ffmpeg에서 세그먼트 합치기 문제가 있어 임시 비활성화
        // TODO: 추후 최적화 로직 개선 필요
        return audioFiles;

        /* 이전 최적화 로직 (문제 있음 - 비활성화)
        const optimized = [];
        let current = { ...audioFiles[0] };

        for (let i = 1; i < audioFiles.length; i++) {
            const next = audioFiles[i];

            // 현재와 다음이 동일하고 연속되어 있는지 확인
            if (
                current.path === next.path &&
                current.offset === next.offset &&
                current.duration === next.duration
            ) {
                // 연속된 동일 세그먼트를 하나로 합치기
                current.soundDuration += next.soundDuration;
            } else {
                // 다르면 현재 세그먼트를 저장하고 새로운 세그먼트 시작
                optimized.push(current);
                current = { ...next };
            }
        }

        // 마지막 세그먼트 추가
        optimized.push(current);

        return optimized;
        */
    }

    /**
     * 음성 경로를 실제 파일 정보로 변환
     * @param {string} soundPath - 음성 경로 (예: "&.a", "sfx.enter")
     * @param {string} voiceType - 음성 타입 (예: "f1", "m1")
     * @returns {Object|null} 파일 정보 { filePath, offset, duration }
     */
    soundPathToFileInfo(soundPath, voiceType = 'f1') {
        // voice_sprite 정보 (audio-manager.cjs에서 가져옴)
        const voice_sprite = {
            'a': [200 * 0, 200], 'b': [200 * 1, 200], 'c': [200 * 2, 200], 'd': [200 * 3, 200],
            'e': [200 * 4, 200], 'f': [200 * 5, 200], 'g': [200 * 6, 200], 'h': [200 * 7, 200],
            'i': [200 * 8, 200], 'j': [200 * 9, 200], 'k': [200 * 10, 200], 'l': [200 * 11, 200],
            'm': [200 * 12, 200], 'n': [200 * 13, 200], 'o': [200 * 14, 200], 'p': [200 * 15, 200],
            'q': [200 * 16, 200], 'r': [200 * 17, 200], 's': [200 * 18, 200], 't': [200 * 19, 200],
            'u': [200 * 20, 200], 'v': [200 * 21, 200], 'w': [200 * 22, 200], 'x': [200 * 23, 200],
            'y': [200 * 24, 200], 'z': [200 * 25, 200],
            '1': [200 * 26, 200], '2': [200 * 27, 200], '3': [200 * 28, 200], '4': [200 * 29, 200],
            '5': [200 * 30, 200], '6': [200 * 31, 200], '7': [200 * 32, 200], '8': [200 * 33, 200],
            '9': [200 * 34, 200], '0': [200 * 35, 200]
        };

        // sfx_sprite 정보
        const sfx_sprite = {
            'backspace': [600 * 0, 600], 'enter': [600 * 1, 600], 'tab': [600 * 2, 600],
            'question': [600 * 3, 600], 'exclamation': [600 * 4, 600],
            'space': [600 * 5, 600], 'period': [600 * 6, 600], 'comma': [600 * 7, 600],
            'at': [600 * 8, 600], 'pound': [600 * 9, 600], 'dollar': [600 * 10, 600],
            'caret': [600 * 11, 600], 'ampersand': [600 * 12, 600], 'asterisk': [600 * 13, 600]
        };

        console.log('음성 경로 파싱:', soundPath);

        // 패턴 1: &.char (예: &.a, &.b, &.z)
        const andMatch = soundPath.match(/^\&\.([a-z0-9]+)$/);
        if (andMatch) {
            const [, char] = andMatch;
            const sprite = voice_sprite[char];
            if (sprite) {
                // voice profile에서 가져온 voiceType 사용
                return {
                    filePath: `voice/${voiceType}.ogg`,
                    offset: sprite[0] / 1000, // ms to seconds
                    duration: sprite[1] / 1000 // ms to seconds
                };
            }
        }

        // 패턴 2: voiceType.char (예: f1.a, m2.z)
        const voiceMatch = soundPath.match(/^([fm]\d)\.([a-z0-9]+)$/);
        if (voiceMatch) {
            const [, voiceType, char] = voiceMatch;
            const sprite = voice_sprite[char];
            if (sprite) {
                return {
                    filePath: `voice/${voiceType}.ogg`,
                    offset: sprite[0] / 1000,
                    duration: sprite[1] / 1000
                };
            }
        }

        // 패턴 3: sfx.soundname
        const sfxMatch = soundPath.match(/^sfx\.([a-z]+)$/);
        if (sfxMatch) {
            const [, soundName] = sfxMatch;
            const sprite = sfx_sprite[soundName];
            if (sprite) {
                return {
                    filePath: 'sfx.ogg',
                    offset: sprite[0] / 1000,
                    duration: sprite[1] / 1000
                };
            }
        }

        console.warn(`알 수 없는 음성 경로: ${soundPath}`);
        return null;
    }

    /**
     * 오디오 파일 목록을 ffmpeg로 WAV로 변환
     * @param {Array} audioFiles - 오디오 파일 정보 목록
     * @param {string} quality - 품질 설정
     * @param {number} playbackRate - 재생 속도 (atempo 필터용)
     * @param {Object} voiceProfile - 음성 프로필 (pitch, variation, intonation 포함)
     * @returns {Promise<Blob>} WAV Blob
     */
    async convertAudioFilesToWav(audioFiles, quality, playbackRate = 1.0, voiceProfile = { type: 'f1', pitchShift: 0, variation: 0, intonation: 0 }) {
        console.log('ffmpeg 변환 시작:', audioFiles.length, '개 세그먼트');
        console.log('재생 속도:', playbackRate);
        console.log('음성 프로필:', voiceProfile);

        // 각 파일에서 필요한 부분만 추출하여 concat
        return this.extractAndConcatSegments(audioFiles, quality, playbackRate, voiceProfile);
    }

    /**
     * 오디오 세그먼트들을 추출하여 concat 후 WAV로 변환
     * IPC를 통해 메인 프로세스의 ffmpeg를 호출합니다.
     *
     * @param {Array} audioFiles - 오디오 파일 정보 목록
     * @param {string} quality - 품질 설정
     * @param {number} playbackRate - 재생 속도 (atempo 필터용)
     * @returns {Promise<Blob>} WAV Blob
     */
    async extractAndConcatSegments(audioFiles, quality, playbackRate = 1.0, voiceProfile) {
        console.log('IPC 변환 요청:', audioFiles.length, '개 세그먼트');
        console.log('전송할 재생 속도 (atempo):', playbackRate);

        // 음성프로필이 없으면 기본값 사용 (강제 적용)
        if (!voiceProfile) {
            console.warn('⚠️ voiceProfile이 undefined입니다. 기본값을 사용합니다.');
            voiceProfile = { type: 'f1', pitchShift: 0, variation: 0, intonation: 0 };
        }

        console.log('전송할 음성 프로필:', voiceProfile);

        // IPC를 통해 메인 프로세스의 ffmpeg 변환 호출
        const result = await window.api.convertTtsToWav(audioFiles, quality, playbackRate, voiceProfile);

        if (!result.success) {
            throw new Error(result.error);
        }

        console.log('IPC 변환 성공, 데이터 크기:', result.data.length);

        // Base64로 인코딩된 WAV 데이터를 Blob으로 변환
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const wavBlob = new Blob([bytes], { type: result.mimeType });

        return wavBlob;
    }


    /**
     * 녹음 시도 (내부 함수)
     * @private
     */

    /**
     * 지원되는 MIME 타입 확인
     * @returns {string} MIME 타입
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4'  // Fallback 추가
        ];

        console.log('MediaRecorder 지원 MIME 타입 확인...');
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log(`지원됨: ${type}`);
                return type;
            }
        }

        console.warn('지원되는 MIME 타입이 없음, 기본값 사용');
        return ''; // 기본값 사용
    }

    /**
     * 음성 시퀀스 재생
     * @param {Array} soundSequence - 음성 시퀀스
     * @returns {Promise<number>} 총 지속 시간
     */
    async playSequence(soundSequence) {
        return new Promise((resolve) => {
            let currentIndex = 0;
            let totalDuration = 0;

            const playNext = () => {
                if (currentIndex >= soundSequence.length) {
                    resolve(totalDuration);
                    return;
                }

                const sound = soundSequence[currentIndex];
                totalDuration += sound.duration;

                console.log(`\n🔊 Playing sound #${currentIndex + 1}/${soundSequence.length}:`);
                console.log('  Path:', sound.path);
                console.log('  Duration:', sound.duration, 'ms');
                console.log('  Volume:', sound.volume || 0.65);
                console.log('  Pitch:', sound.pitchShift || 0);
                console.log('  Variation:', sound.pitchVariation || 0);
                console.log('  Intonation:', sound.intonation || 0);
                console.log('  Rate:', sound.rate || 1.0);
                console.log('  Type:', sound.type || 'f1');

                this.audioManager.play(sound.path, {
                    volume: sound.volume || 0.65,
                    pitchShift: sound.pitchShift || 0,
                    pitchVariation: sound.variation || 0,
                    intonation: sound.intonation || 0,
                    rate: sound.rate || 1.0,
                    type: sound.type || 'f1'
                });

                console.log(`✓ Sound #${currentIndex + 1} playback initiated`);

                currentIndex++;
                setTimeout(playNext, sound.duration);
            };

            playNext();
        });
    }

    /**
     * WebM/OGG를 WAV로 변환
     * @param {Blob} audioBlob - 입력 오디오 Blob
     * @param {string} quality - 품질 설정
     * @returns {Promise<Blob>} WAV Blob
     */
    /**
     * WebM/ogg를 WAV로 변환
     *
     * WebAudio 기반 환경에서는 AudioContext.decodeAudioData를,
     * Node/Electron 환경에서는 FFmpeg를 사용합니다.
     *
     * @param {Blob} audioBlob - 변환할 오디오 Blob (WebM, OGG 등)
     * @param {string} quality - 품질 ('low', 'standard', 'high')
     * @returns {Promise<Blob>} WAV Blob
     */
    /**
     * NOTE: convertToWav functions have been removed.
     * All conversions now use IPC-based file conversion.
     */

    /**
     * 품질 설정 반환
     * @param {string} quality - 품질 ('low', 'standard', 'high')
     * @returns {Object} WAV 설정
     */
    getWavConfig(quality) {
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

    /**
     * AudioBuffer를 WAV로 인코딩
     * @param {AudioBuffer} audioBuffer - AudioBuffer
     * @param {Object} config - WAV 설정
     * @returns {Blob} WAV Blob
     */
    encodeWav(audioBuffer, config) {
        const length = audioBuffer.length;
        const bytesPerSample = config.bitDepth / 8;
        const blockAlign = config.channels * bytesPerSample;
        const byteRate = config.sampleRate * blockAlign;

        const arrayBuffer = new ArrayBuffer(44 + length * bytesPerSample);
        const view = new DataView(arrayBuffer);

        // WAV 헤더 작성
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * bytesPerSample, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, config.channels, true);
        view.setUint32(24, config.sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, config.bitDepth, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, length * bytesPerSample, true);

        // PCM 데이터 작성
        const channelData = audioBuffer.getChannelData(0);
        let offset = 44;

        for (let i = 0; i < length; i++) {
            const sample = this.convertSample(channelData[i], config.bitDepth);
            if (config.bitDepth === 8) {
                view.setUint8(offset, sample);
                offset += 1;
            } else if (config.bitDepth === 16) {
                view.setInt16(offset, sample, true);
                offset += 2;
            } else if (config.bitDepth === 24) {
                // 24bit는 특별한 처리 필요
                const int24 = sample >> 8;
                view.setUint8(offset, int24 & 0xFF);
                view.setUint8(offset + 1, (int24 >> 8) & 0xFF);
                view.setUint8(offset + 2, (int24 >> 16) & 0xFF);
                offset += 3;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    /**
     * 샘플 값 변환
     * @param {number} sample - 정규화된 샘플 (-1.0 ~ 1.0)
     * @param {number} bitDepth - 비트 심도
     * @returns {number} 변환된 샘플 값
     */
    convertSample(sample, bitDepth) {
        // 클리핑 방지
        sample = Math.max(-1, Math.min(1, sample));

        if (bitDepth === 8) {
            // 8bit: 0 ~ 255 (unsigned)
            return Math.floor((sample + 1) * 127.5);
        } else if (bitDepth === 16) {
            // 16bit: -32768 ~ 32767 (signed)
            return Math.floor(sample * 32767);
        } else if (bitDepth === 24) {
            // 24bit: -8388608 ~ 8388607 (signed)
            return Math.floor(sample * 8388607);
        }

        return 0;
    }

    /**
     * 문자열을 DataView에 쓰기
     * @param {DataView} view - DataView
     * @param {number} offset - 오프셋
     * @param {string} string - 문자열
     */
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}

class TTSEngine {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.textProcessor = new TextProcessor();
        this.waveRecorder = new WaveRecorder(audioManager);
    }

    /**
     * SRT 파일 파싱
     * @param {string} srtContent - SRT 파일 내용
     * @returns {Array} 파싱된 cue 배열
     */
    parseSRT(srtContent) {
        const cues = [];
        const blocks = srtContent.trim().split(/\n\s*\n/);

        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length >= 3) {
                const index = parseInt(lines[0]);
                const timeLine = lines[1];
                const text = lines.slice(2).join('\n');

                const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (match) {
                    const startTime = this.timeToMs(match[1], match[2], match[3], match[4]);
                    const endTime = this.timeToMs(match[5], match[6], match[7], match[8]);

                    cues.push({
                        index,
                        startTime,
                        endTime,
                        duration: endTime - startTime,
                        text
                    });
                }
            }
        }

        return cues;
    }

    /**
     * 시간 문자열을 밀리초로 변환
     * @param {string} hh - 시
     * @param {string} mm - 분
     * @param {string} ss - 초
     * @param {string} ms - 밀리초
     * @returns {number} 밀리초
     */
    timeToMs(hh, mm, ss, ms) {
        return (
            parseInt(hh) * 3600000 +
            parseInt(mm) * 60000 +
            parseInt(ss) * 1000 +
            parseInt(ms)
        );
    }

    /**
     * 밀리초를 시간 문자열로 변환
     * @param {number} ms - 밀리초
     * @returns {string} 시간 문자열 (HH:MM:SS.mmm)
     */
    msToTime(ms) {
        const hh = Math.floor(ms / 3600000);
        const mm = Math.floor((ms % 3600000) / 60000);
        const ss = Math.floor((ms % 60000) / 1000);
        const mmm = ms % 1000;

        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(mmm).padStart(3, '0')}`;
    }

    /**
     * 텍스트를 음성 시퀀스로 변환
     * @param {string} text - 입력 텍스트
     * @param {Object} voiceProfile - 음성 프로필
     * @returns {Array} 음성 시퀀스
     */
    textToAnimalese(text, voiceProfile) {
        return this.textProcessor.textToAnimalese(text, voiceProfile);
    }

    /**
     * 텍스트를 WAV로 변환
     * @param {string} text - 입력 텍스트
     * @param {Object} voiceProfile - 음성 프로필
     * @param {string} quality - 품질 ('low', 'standard', 'high')
     * @returns {Promise<Blob>} WAV Blob
     */
    async convertTextToWav(text, voiceProfile, quality = 'low') {
        console.log('\n========================================');
        console.log('=== TEXT TO WAV CONVERSION START ===');
        console.log('========================================');
        console.log('Input text:', text);
        console.log('Voice profile:', voiceProfile);
        console.log('Quality:', quality);
        console.log('ttsEngine:', this);
        console.log('Audio manager:', this.audioManager);

        if (!text || text.trim() === '') {
            throw new Error('변환할 텍스트가 비어있습니다');
        }

        const sequence = this.textToAnimalese(text, voiceProfile);
        console.log('생성된 시퀀스:', sequence);

        if (sequence.length === 0) {
            throw new Error('음성 시퀀스를 생성할 수 없습니다');
        }

        // 평균 rate 계산 (atempo 필터에 사용)
        let totalRate = 0;
        sequence.forEach((sound, i) => {
            const rate = sound.rate || 1.0;
            totalRate += rate;
        });
        const avgRate = 1.0; // ffmpeg atempo를 1로 고정
        console.log(`변환 시 평균 재생 속도 (atempo 값): ${avgRate.toFixed(3)}`);

        try {
            const wavBlob = await this.waveRecorder.recordSequence(sequence, { quality, playbackRate: avgRate, voiceProfile });
            console.log('WAV 변환 성공:', wavBlob.size, '바이트');
            return wavBlob;
        } catch (error) {
            console.error('WAV 변환 실패:', error);
            throw new Error(`WAV 변환 중 오류가 발생했습니다: ${error.message}`);
        }
    }

    /**
     * 선택한 cue를 WAV로 변환
     * @param {string} cueText - cue 텍스트
     * @param {Object} voiceProfile - 음성 프로필
     * @param {string} quality - 품질
     * @returns {Promise<Blob>} WAV Blob
     */
    async convertCueToWav(cueText, voiceProfile, quality = 'low') {
        const sequence = this.textToAnimalese(cueText, voiceProfile);

        // 평균 rate 계산 (atempo 필터에 사용)
        let totalRate = 0;
        sequence.forEach((sound) => {
            const rate = sound.rate || 1.0;
            totalRate += rate;
        });
        const avgRate = 1.0; // ffmpeg atempo를 1로 고정
        console.log(`Cue 변환 시 평균 재생 속도 (atempo 값): ${avgRate.toFixed(3)}`);

        return await this.waveRecorder.recordSequence(sequence, { quality, playbackRate: avgRate, voiceProfile });
    }

    /**
     * 전체 SRT를 WAV로 변환
     * @param {string} srtContent - SRT 파일 내용
     * @param {Object} options - 옵션 (voiceProfile, quality)
     * @returns {Promise<Blob>} WAV Blob
     */
    async convertSRTToWav(srtContent, options) {
        const cues = this.parseSRT(srtContent);
        const { voiceProfile, quality = 'low' } = options;

        const audioSegments = [];

        for (const cue of cues) {
            // 각 cue 변환
            const sequence = this.textToAnimalese(cue.text, voiceProfile);

            // 타임스탬프에 맞춰 길이 조정
            const adjusted = this.adjustToDuration(sequence, cue.duration);

            audioSegments.push({
                ...adjusted,
                startTime: cue.startTime,
                endTime: cue.endTime
            });
        }

        // 전체 타임라인 합치기
        return this.mergeToWav(audioSegments, quality);
    }

    /**
     * 시퀀스를 타임스탬프에 맞춰 조정
     * @param {Array} sequence - 음성 시퀀스
     * @param {number} targetDuration - 목표 지속 시간 (ms)
     * @returns {Array} 조정된 시퀀스
     */
    adjustToDuration(sequence, targetDuration) {
        const currentDuration = sequence.reduce((sum, s) => sum + s.duration, 0);

        if (currentDuration === 0) return sequence;

        const ratio = targetDuration / currentDuration;

        // 전체 길이 조정 (rate 변경으로)
        return sequence.map(sound => ({
            ...sound,
            duration: sound.duration * ratio,
            rate: sound.rate * ratio
        }));
    }

    /**
     * 여러 오디오 세그먼트를 하나로 합치기
     * @param {Array} segments - 오디오 세그먼트 배열
     * @param {string} quality - 품질
     * @returns {Promise<Blob>} 합쳐진 WAV Blob
     */
    async mergeToWav(segments, quality) {
        // 전체 시퀀스의 평균 rate 계산
        let totalRate = 0;
        let totalSounds = 0;
        for (const segment of segments) {
            for (const sound of segment.sequence) {
                const rate = sound.rate || 1.0;
                totalRate += rate;
                totalSounds++;
            }
        }
        const avgRate = 1.0; // ffmpeg atempo를 1로 고정
        console.log(`SRT 전체 변환 시 평균 재생 속도 (atempo 값): ${avgRate.toFixed(3)}`);

        // 각 세그먼트를 개별적으로 WAV로 변환
        const wavBlobs = [];
        for (const segment of segments) {
            const blob = await this.waveRecorder.recordSequence(segment.sequence, { quality, playbackRate: avgRate, voiceProfile });
            wavBlobs.push({ blob, startTime: segment.startTime, endTime: segment.endTime });
        }

        // 가장 긴 오디오를 기준으로 합치기
        const maxDuration = Math.max(...wavBlobs.map(w => w.endTime));
        return this.concatenateWavs(wavBlobs, maxDuration, quality);
    }

    /**
     * 여러 WAV를 타임라인에 맞춰 합치기
     * @param {Array} wavBlobs - WAV Blob 배열
     * @param {number} totalDuration - 총 지속 시간 (ms)
     * @param {string} quality - 품질
     * @returns {Promise<Blob>} 합쳐진 WAV Blob
     */
    async concatenateWavs(wavBlobs, totalDuration, quality) {
        // 간단한 구현: 첫 번째 WAV를 기준으로 나머지를 순차적으로 연결
        // (실제로는 타임스탬프에 맞춰 정확한 위치에 배치해야 함)

        const config = this.waveRecorder.getWavConfig(quality);
        const sampleRate = config.sampleRate;
        const totalSamples = Math.floor((totalDuration / 1000) * sampleRate);

        // 빈 WAV 버퍼 생성
        const audioContext = new AudioContext();
        const mergedBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);
        const mergedData = mergedBuffer.getChannelData(0);

        // 각 WAV를 해당 위치에 복사
        for (const item of wavBlobs) {
            const arrayBuffer = await item.blob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0);

            const startSample = Math.floor((item.startTime / 1000) * sampleRate);
            const endSample = Math.min(startSample + channelData.length, totalSamples);

            for (let i = startSample; i < endSample; i++) {
                if (i < totalSamples) {
                    mergedData[i] = channelData[i - startSample];
                }
            }
        }

        return this.waveRecorder.encodeWav(mergedBuffer, config);
    }

    /**
     * 텍스트 미리듣기
     * @param {string} text - 입력 텍스트
     * @param {Object} voiceProfile - 음성 프로필
     * @returns {Promise<void>}
     */
    async preview(text, voiceProfile) {
        try {
            console.log('TTS 미리듣기 시작:', text);
            console.log('음성 프로필:', voiceProfile);

            // 텍스트→WAV 변환과 동일한 방식으로 처리
            const wavBlob = await this.convertTextToWav(text, voiceProfile, 'low');

            // WAV Blob을 Blob URL로 변환
            const audioUrl = URL.createObjectURL(wavBlob);

            // HTML5 Audio로 재생
            const audio = new Audio(audioUrl);
            audio.volume = voiceProfile.volume || 0.65;

            audio.onended = () => {
                console.log('TTS 미리듣기 완료');
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = (error) => {
                console.error('미리듣기 재생 오류:', error);
                URL.revokeObjectURL(audioUrl);
            };

            console.log('미리듣기 WAV 재생 시작');
            await audio.play();

        } catch (error) {
            console.error('미리듣기 실패:', error);
            throw error;
        }
    }
}

// 모듈.exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TTSEngine,
        TextProcessor,
        WaveRecorder
    };
}

// 브라우저 전역에 노출
if (typeof window !== 'undefined') {
    window.TTSEngine = TTSEngine;
    window.TextProcessor = TextProcessor;
    window.WaveRecorder = WaveRecorder;
    console.log('TTS Engine 전역 변수 등록됨');
}
