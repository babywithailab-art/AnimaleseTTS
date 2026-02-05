/**
 * author: joshxviii
 */

//TODO: whole code base needs major overhaul at some point.
// It is slowly becoming hard to manage

document.addEventListener('DOMContentLoaded', () => {
    initControls();
    updatedFocusedWindows();

    // TTS 초기화 (window.audio와 TTSEngine이 모두 준비될 때까지 대기)
    const initTTSWhenReady = setInterval(() => {
        if (window.audio && window.TTSEngine && !window.ttsInitialized) {
            initTTS(window.audio);
            loadVoiceProfiles();
            window.ttsInitialized = true;
            clearInterval(initTTSWhenReady);
        }
    }, 100);

    // close settings when clicking outside
    const focusOut = document.getElementById('focus_out');
    const settingsOverlay = document.getElementById('settings_overlay');
    focusOut.addEventListener('mousedown', function(event) {
        if (focusOut.getAttribute('show') === 'true' && !settingsOverlay.contains(event.target)) {
            focusOut.setAttribute('show', 'false');
        }
    });
});

// Initialize controls
const versionElement = document.getElementById('version');
if (versionElement) {
    versionElement.innerHTML = `v${window.api.getAppInfo().version}`;
}

// initControls 함수는 editor.html에 있음

function initVoiceControls() {
    // Voice pitch
    const voicePitch = document.getElementById('voice_pitch');
    const voicePitchOut = document.getElementById('voice_pitch_out');
    if (voicePitch && voicePitchOut) {
        const currentProfile = preferences.get('voice_profile') || { type: 'f1', pitch: 0, variation: 0.2, intonation: 0 };
        voicePitch.value = currentProfile.pitch;
        voicePitchOut.value = voicePitch.value;
        voicePitch.addEventListener('input', (e) => {
            voicePitchOut.value = e.target.value;
            const updatedProfile = { ...preferences.get('voice_profile'), pitch: parseFloat(e.target.value) };
            preferences.set('voice_profile', updatedProfile);
        });
    }

    // Voice intonation
    const voiceIntonation = document.getElementById('voice_intonation');
    const voiceIntonationOut = document.getElementById('voice_intonation_out');
    if (voiceIntonation && voiceIntonationOut) {
        const currentProfile = preferences.get('voice_profile') || { type: 'f1', pitch: 0, variation: 0.2, intonation: 0 };
        voiceIntonation.value = currentProfile.intonation;
        voiceIntonationOut.value = voiceIntonation.value;
        voiceIntonation.addEventListener('input', (e) => {
            voiceIntonationOut.value = e.target.value;
            const updatedProfile = { ...preferences.get('voice_profile'), intonation: parseFloat(e.target.value) };
            preferences.set('voice_profile', updatedProfile);
        });
    }

    // Voice variation
    const voiceVariation = document.getElementById('voice_variation');
    const voiceVariationOut = document.getElementById('voice_variation_out');
    if (voiceVariation && voiceVariationOut) {
        const currentProfile = preferences.get('voice_profile') || { type: 'f1', pitch: 0, variation: 0.2, intonation: 0 };
        voiceVariation.value = currentProfile.variation;
        voiceVariationOut.value = voiceVariation.value;
        voiceVariation.addEventListener('input', (e) => {
            voiceVariationOut.value = e.target.value;
            const updatedProfile = { ...preferences.get('voice_profile'), variation: parseFloat(e.target.value) };
            preferences.set('voice_profile', updatedProfile);
        });
    }

    // Voice type
    const voiceType = document.getElementById('voice_type');
    if (voiceType) {
        voiceType.addEventListener('change', (e) => {
            // Get current voice profile and update only the type
            const currentProfile = preferences.get('voice_profile') || { type: 'f1', pitch: 0, variation: 0.2, intonation: 0 };
            const updatedProfile = { ...currentProfile, type: e.target.value };
            preferences.set('voice_profile', updatedProfile);
            updateVoiceTypeButtons(e.target.value);
        });

        // Initialize button states based on saved preference
        const savedProfile = preferences.get('voice_profile');
        const savedType = savedProfile ? savedProfile.type : 'f1';
        voiceType.value = savedType;
        updateVoiceTypeButtons(savedType);
    }
}

function updateVoiceTypeButtons(selectedType) {
    const maleButton = document.getElementById('male');
    const femaleButton = document.getElementById('female');
    const voiceTypeSelect = document.getElementById('voice_type');

    if (maleButton && femaleButton && voiceTypeSelect) {
        const isMale = selectedType.startsWith('m');
        voiceTypeSelect.className = isMale ? 'male' : 'female';

        // Show/hide options
        document.querySelectorAll('option').forEach(option => {
            if (option.className === 'male') {
                option.style.display = isMale ? 'block' : 'none';
            } else if (option.className === 'female') {
                option.style.display = isMale ? 'none' : 'block';
            }
        });
    }
}

function selectVoiceType(type) {
    const voiceType = document.getElementById('voice_type');
    const maleButton = document.getElementById('male');
    const femaleButton = document.getElementById('female');

    if (voiceType) {
        // Find the first option with the matching class (male or female)
        const option = voiceType.querySelector(`option.${type}`);
        if (option) {
            voiceType.value = option.value;
            voiceType.dispatchEvent(new Event('change'));

            // Update button pressed states
            if (type === 'male') {
                maleButton.setAttribute('pressed', 'true');
                femaleButton.setAttribute('pressed', 'false');
            } else {
                femaleButton.setAttribute('pressed', 'true');
                maleButton.setAttribute('pressed', 'false');
            }
        }
    }
}

function updatedFocusedWindows() {
    // Stub function for compatibility
}

function openSettings() {
    const focusOut = document.getElementById('focus_out');
    const isShown = focusOut.getAttribute('show') === 'true';
    focusOut.setAttribute('show', isShown ? 'false' : 'true');
}

// Voice profile functions
function saveVoiceProfile() {
    // Stub function
    console.log('Save voice profile');
}

function deleteVoiceProfile() {
    // Stub function
    console.log('Delete voice profile');
}

function loadVoiceProfile() {
    // Stub function
    console.log('Load voice profile');
}
