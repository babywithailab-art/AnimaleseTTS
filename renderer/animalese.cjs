/**
 * author: joshxviii 
 */

//#region General setup
const preferences = window.settings;

document.addEventListener('DOMContentLoaded', () => {
    updateLanguage(preferences.get('lang'));
    updateTheme(preferences.get('theme'));
});

// custom svg button element
customElements.define('svg-button', class extends HTMLElement {
    connectedCallback() {
        const icon = this.getAttribute('icon');
        const onclick = this.getAttribute('onclick');
        const pressed = this.getAttribute('pressed') === 'true';

        fetch(`assets/svg/${icon}.svg`)
        .then(res => res.text())
        .then(svg => {
            this.innerHTML = svg;
            const svgEl = this.querySelector('svg');
            svgEl.classList.add('svg-button');

            // Update visual state based on pressed attribute
            if (pressed) {
                svgEl.classList.add('pressed');
            }

            // Store the onclick handler for later use
            if (onclick) {
                // Parse function call like "selectVoiceType('male')"
                const match = onclick.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*)\)$/);
                if (match) {
                    const funcName = match[1];
                    const argsStr = match[2];

                    // Parse arguments (handle strings, numbers, etc.)
                    let args = [];
                    if (argsStr.trim()) {
                        // Simple parser for quoted strings and numbers
                        const argMatches = argsStr.match(/'([^']*)'|"([^"]*)"|([0-9.]+)/g);
                        if (argMatches) {
                            args = argMatches.map(arg => {
                                const strMatch = arg.match(/^['"](.*)['"]$/);
                                if (strMatch) return strMatch[1];
                                return parseFloat(arg);
                            });
                        }
                    }

                    this._onclick = () => {
                        window[funcName](...args);
                    };
                }
            }
        });

        // Add click event listener
        this.addEventListener('click', (e) => {
            if (this._onclick) {
                this._onclick(e);
            }
        });

        // Observe pressed attribute changes
        this._observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'pressed') {
                    const svgEl = this.querySelector('svg');
                    if (svgEl) {
                        if (this.getAttribute('pressed') === 'true') {
                            svgEl.classList.add('pressed');
                        } else {
                            svgEl.classList.remove('pressed');
                        }
                    }
                }
            });
        });
        this._observer.observe(this, { attributes: true });
    }

    disconnectedCallback() {
        if (this._observer) {
            this._observer.disconnect();
        }
    }
});

function updateLanguage(lang) {// language selection update
    preferences.set('lang', lang);
    window.translator.load(lang);
    window.translator.update();
}

function updateTheme(theme) {
    preferences.set('theme', theme);
    const themeStyle = document.getElementById('theme-style');
    if (themeStyle) {
        themeStyle.setAttribute('href', `assets/styles/themes/${theme}.css`);
    }
}

window.api.onMutedChanged((muted) => {
    const warning = document.getElementById('disabled_warning');
    warning.setAttribute('translation', muted ? 'warning.disabled' : 'warning.enabled');
    setTimeout(() => {
        const hotkeySpan = document.getElementById('hotkey');
        if (hotkeySpan) hotkeySpan.innerHTML = `${preferences.get('disable_hotkey')}`.toUpperCase();
    }, 0);
});

window.api.onSettingUpdate('updated-disable_hotkey', () => {
    const hotkeySpan = document.getElementById('hotkey');
    if (hotkeySpan) hotkeySpan.innerHTML = `${preferences.get('disable_hotkey')}`.toUpperCase();
});
//#endregion

function handleSpeicalCommand(command) {
    switch (command) {
        case '#no_sound':// do nothing
        break;
        case '#disable_toggle': // handled in remapper
        break;
        case '#show_window':
            window.api.showWindow();
        break;
    }
}

//#region Key press detect
window.api.onKeyDown( (keyInfo) => {
    const { keycode, isCapsLock, isShiftDown, finalSound } = keyInfo;
    
    if (finalSound === undefined || finalSound === '') return;
    const isSpecial = finalSound.startsWith('#');
    const isVoice = finalSound.startsWith('&');
    const isInstrument = finalSound.startsWith('%');
    const isSfx = finalSound.startsWith('sfx')
    const options = {}
    if (!preferences.get('hold_repeat')) Object.assign(options, { hold: keycode });
    switch (true) {
        case ( isSpecial ):// handle special commands
           handleSpeicalCommand(finalSound);
        return;
            
        case ( isVoice ): // uppercase typing has higher pitch and variation
            Object.assign(options, {
                yelling: isCapsLock !== isShiftDown
            });
        break;
        
        case ( isInstrument ):// notes should always hold until released with keyup 
            Object.assign(options, {
                hold: keycode,
                pitchShift: isCapsLock? -12 : 0
            });
        break;
    }
    window.audio.play(finalSound, options);
});
window.api.onKeyUp( (keyInfo) => {
    const { keycode, finalSound } = keyInfo;

    if (finalSound === undefined) return;
    switch (true) {
        case ( finalSound.startsWith('%') ):
            window.audio.release(keycode, true /* cutOff */)
        break;
        default:
            window.audio.release(keycode, false)
        break;
    }
});
//#endregion