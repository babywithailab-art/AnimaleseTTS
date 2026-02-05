/* Used to get the current state of the CapsLock key on different platforms */
const os = require('os');
const { execSync } = require('child_process');
const { ipcRenderer } = require('electron');

const capsLockKeycode = (() => {
    switch (os.platform()) {
        case 'win32':
            return 20;
        case 'darwin':
            return 57;
        case 'linux':
            return 66;
        default:
            throw new Error(`Unsupported platform: ${os.platform()}`);
    }
})();
capsActive = getInitialCapsState();

function initCapsLockState() {
    ipcRenderer.on('keydown', (_event, e) => {
        if (e.keycode === capsLockKeycode) {
            capsActive = !capsActive;
        }
    });
}

function getInitialCapsState() {
    const platform = os.platform();
    try {
        if (platform === 'win32') {
            const output = execSync('powershell -command "[console]::CapsLock"').toString().trim();
            return output === 'True';
        } else if (platform === 'darwin') {
            const script = `tell application \"System Events\" to get caps lock down`;
            const result = execSync(`osascript -e '${script}'`).toString().trim();
            return result === 'true';
        } else if (platform === 'linux') {
            const result = execSync('xset q | grep Caps').toString();
            return /Caps Lock:\s+on/.test(result);
        }
    } catch (e) {
        console.error('Failed to detect initial Caps Lock state:', e);
    }

    return false;
}

function isCapsLockActive() {return capsActive;}

module.exports = {
    initCapsLockState,
    isCapsLockActive,
};