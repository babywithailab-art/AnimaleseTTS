/**
 * TTS UI Handler
 * TTS 관련 UI 이벤트 처리 및 사용자 인터랙션 관리
 */

// TTSEngine 인스턴스 (전역)
let ttsEngine = null;
let currentSRTData = null;
let srtPopupWindow = null;  // SRT 팝업창 레퍼런스
let srtFilePath = null;  // SRT 파일 경로 저장
let srtContent = null;  // SRT 파일 내용 저장

/**
 * TTS 모듈 초기화
 * @param {Object} audioManager - 오디오 매니저 인스턴스
 */
function initTTS(audioManager) {
    console.log('TTS 초기화 시작...');
    console.log('window.TTSEngine:', typeof window.TTSEngine);

    if (typeof window !== 'undefined') {
        if (!window.TTSEngine) {
            console.error('TTSEngine이 로드되지 않았습니다');
            return;
        }

        try {
            window.ttsEngine = new window.TTSEngine(audioManager);
            ttsEngine = window.ttsEngine;
            console.log('TTS Engine 초기화 완료');

            // 새창 메시지 리스너 등록
            window.addEventListener('message', async (event) => {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`\n${'='.repeat(60)}`);
                console.log(`[${timestamp}] === MAIN WINDOW MESSAGE RECEIVED ===`);
                console.log('Event source:', event.source ? '[Window Object]' : 'Unknown/Null');
                console.log('Event origin:', event.origin);
                console.log('Event data type:', event.data ? event.data.type : 'undefined/null');
                console.log('Event data:', JSON.stringify(event.data, null, 2));
                console.log('='.repeat(60), '\n');

                // For testing: send a test message to popup
                if (event.source && event.source !== window) {
                    try {
                        event.source.postMessage({
                            type: 'testEcho',
                            message: 'Main window received your message!'
                        }, '*');
                        console.log('Test echo sent back to popup');
                    } catch (e) {
                        console.error('Failed to send test echo:', e);
                    }
                }

                if (event.data && event.data.type === 'srtSelected') {
                    const selectedCues = event.data.cues;
                    const shouldConvert = event.data.convert || false;
                    const filePath = event.data.filePath || null;

                    console.log('\n=== MESSAGE RECEIVED FROM POPUP ===');
                    console.log('Number of cues:', selectedCues.length);
                    console.log('Should convert:', shouldConvert);
                    console.log('File path from popup:', filePath);
                    console.log('===================================\n');

                    // 새창 레퍼런스 저장 (진행률 업데이트용)
                    // event.source는 popup window의 window object
                    if (event.source) {
                        srtPopupWindow = event.source;
                        console.log('Popup window reference saved');
                    }

                    // 파일 경로 저장 (popup에서 받은 경로 사용)
                    if (filePath) {
                        srtFilePath = filePath;
                        console.log('✓ SRT File Path updated from popup:', srtFilePath);
                    } else {
                        console.log('⚠️ No file path received from popup, using global:', srtFilePath);
                    }

                    console.log('새창에서 선택된 Cue:', selectedCues.length, '개', shouldConvert ? '(자동 변환 요청)' : '');

                    // 선택된 cue로 currentSRTData 업데이트
                    currentSRTData = {
                        cues: selectedCues,
                        selectedIndices: selectedCues.map(cue => cue.index).filter(idx => idx !== undefined)
                    };

                    if (shouldConvert) {
                        console.log('Starting conversion...');
                        console.log('Current srtFilePath at conversion time:', srtFilePath);
                        // 자동 변환 요청 시 바로 변환 시작
                        await convertCueListToWav(selectedCues);
                    } else {
                        // 미리보기 표시
                        displaySRTPreview(selectedCues);
                    }
                } else if (event.data && event.data.type === 'convertAllSRT') {
                    // 전체 SRT 변환 요청 (popup에서)
                    const filePath = event.data.filePath || null;

                    console.log('\n=== CONVERT ALL SRT REQUEST FROM POPUP ===');
                    console.log('File path from popup:', filePath);
                    console.log('==========================================\n');

                    if (filePath) {
                        srtFilePath = filePath;
                        console.log('✓ SRT File Path updated from popup:', srtFilePath);
                    }

                    // convertAllSRT 함수 호출
                    convertAllSRT();
                }
            });
        } catch (error) {
            console.error('TTS Engine 초기화 실패:', error);
        }
    }
}

/**
 * SRT 파일 로드 - 새창에서 Cue 선택
 */
function loadSRTFile() {
    if (!ttsEngine) {
        console.error('TTS Engine이 초기화되지 않았습니다');
        alert('TTS Engine이 초기화되지 않았습니다');
        return;
    }

    console.log('SRT 파일 로드를 시작합니다...');

    // Electron 대화상자를 사용하여 파일 선택
    if (window.api && window.api.selectSRTFile) {
        window.api.selectSRTFile()
            .then((result) => {
                console.log('파일 선택 결과:', result);

                if (!result.success) {
                    if (!result.canceled) {
                        console.error('SRT 파일 선택 실패:', result.error);
                        alert('SRT 파일 선택에 실패했습니다: ' + result.error);
                    }
                    return;
                }

                // 파일 경로와 폴더 경로 저장
                srtFilePath = result.folderPath;  // 저장용 폴더 경로 저장
                console.log('SRT 폴더 경로 저장됨:', srtFilePath);

                // 파일 내용 읽기
                loadSRTFileFromPath(result.filePath, result.folderPath);
            })
            .catch((error) => {
                console.error('파일 선택 오류:', error);
                alert('파일 선택 중 오류가 발생했습니다');
            });
    } else {
        console.error('window.api.selectSRTFile를 사용할 수 없습니다');
        alert('Electron API를 사용할 수 없습니다. 브라우저를 사용해주세요.');
    }
}

/**
 * 파일 경로로 SRT 파일 로드
 * @param {string} filePath - 파일 경로
 * @param {string} folderPath - 폴더 경로
 */
function loadSRTFileFromPath(filePath, folderPath) {
    console.log('SRT 파일 읽기 시작:', filePath);
    console.log('저장 폴더 경로:', folderPath);

    // IPC를 통해 파일 내용 읽기
    if (window.api && window.api.readFile) {
        window.api.readFile(filePath)
            .then((content) => {
                srtContent = content;
                srtFilePath = folderPath;  // 저장용 폴더 경로 저장
                console.log('✓ SRT 파일 내용 로드됨, 크기:', content.length);
                console.log('✓ 저장 폴더 경로:', srtFilePath);

                const cues = ttsEngine.parseSRT(srtContent);

                if (cues.length === 0) {
                    alert('유효한 SRT 파일이 아닙니다');
                    return;
                }

                console.log('파싱된 Cue 개수:', cues.length);

                // 새창으로 열기 (folder path 전달)
                openSRTWindow(srtContent, cues, srtFilePath);
            })
            .catch((error) => {
                console.error('파일 읽기 실패:', error);
                alert('파일 읽기에 실패했습니다: ' + error.message);
            });
    } else {
        console.error('window.api.readFile를 사용할 수 없습니다');
        alert('Electron API를 사용할 수 없습니다');
    }
}

/**
 * 새창에서 SRT Cue 선택
 */
function openSRTWindow(srtContent, cues, filePath) {
    const windowWidth = 600;
    const windowHeight = 500;
    const left = (window.screen.width / 2) - (windowWidth / 2);
    const top = (window.screen.height / 2) - (windowHeight / 2);

    console.log('Opening popup window...');
    console.log('Current window location:', window.location.href);
    console.log('SRT File Path to pass to popup:', filePath);

    const srtWindow = window.open(
        '',
        'SRT Cue Selection',
        `width=${windowWidth},height=${windowHeight},left=${left},top=${top},resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no,directories=no,addressbar=no,titlebar=no,chrome=no`
    );

    if (!srtWindow) {
        console.error('ERROR: Failed to open popup window');
        alert('새창을 열 수 없습니다. 팝업 차단을 확인해주세요.');
        return;
    }

    console.log('Popup window opened successfully');

    // Pass file path to popup via localStorage or window variable
    srtWindow.srtFilePath = filePath;
    console.log('File path set in popup window');

    // Test message communication immediately after opening
    setTimeout(() => {
        try {
            srtWindow.postMessage({
                type: 'testMessage',
                message: 'Hello from main window!',
                filePath: filePath
            }, '*');
            console.log('Test message sent to popup');
        } catch (error) {
            console.error('Failed to send test message:', error);
        }
    }, 1000);

    // 새창에 HTML 작성
    srtWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SRT Cue 선택</title>
            <style>
                :root {
                    --accent-color: #e0c49e;
                    --input-accent-color: #d4a574;
                    --input-bg-color: #2a2a2a;
                    --secondary-bg-color: #1e1e1e;
                    --main-text-color: #f0feff;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: var(--secondary-bg-color);
                    color: var(--main-text-color);
                    padding: 20px;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                h2 {
                    text-align: center;
                    margin-bottom: 20px;
                    font-size: 24px;
                    font-weight: bold;
                }
                .info {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    text-align: center;
                    border: 1px solid rgba(224, 196, 158, 0.3);
                }
                .cue-list {
                    flex: 1;
                    overflow-y: auto;
                    background: var(--input-bg-color);
                    border-radius: 8px;
                    padding: 15px;
                    border: 1px solid var(--input-accent-color);
                }
                .cue-item {
                    background: rgba(255, 255, 255, 0.03);
                    border: 2px solid transparent;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .cue-item:hover {
                    background: rgba(224, 196, 158, 0.1);
                    border-color: var(--input-accent-color);
                }
                .cue-item.selected {
                    background: rgba(76, 175, 80, 0.2);
                    border-color: #4CAF50;
                }
                .cue-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .cue-number {
                    font-weight: bold;
                    font-size: 14px;
                    background: var(--accent-color);
                    color: #000;
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                .cue-time {
                    font-size: 12px;
                    opacity: 0.8;
                }
                .cue-text {
                    font-size: 14px;
                    line-height: 1.4;
                }
                .controls {
                    margin-top: 15px;
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                button {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--accent-color);
                    color: #000;
                }
                button:hover {
                    filter: brightness(0.9);
                }
                .btn-select-all {
                    background: var(--input-accent-color);
                    color: white;
                }
                .btn-cancel {
                    background: #f44336;
                    color: white;
                }
                .btn-confirm {
                    background: var(--accent-color);
                    color: #000;
                }
                input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                }

                /* Progress Bar Styles */
                .progress-container {
                    display: none;
                    margin-top: 15px;
                    background: var(--input-bg-color);
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid var(--input-accent-color);
                }
                .progress-container.show {
                    display: block;
                }
                .progress-text {
                    margin-bottom: 10px;
                    font-size: 14px;
                    color: var(--main-text-color);
                    text-align: center;
                }
                progress {
                    width: 100%;
                    height: 20px;
                    -webkit-appearance: none;
                    appearance: none;
                }
                progress::-webkit-progress-bar {
                    background-color: var(--secondary-bg-color);
                    border-radius: 10px;
                }
                progress::-webkit-progress-value {
                    background: linear-gradient(90deg, var(--accent-color), var(--input-accent-color));
                    border-radius: 10px;
                }
                progress::-moz-progress-bar {
                    background: linear-gradient(90deg, var(--accent-color), var(--input-accent-color));
                    border-radius: 10px;
                }
            </style>
        </head>
        <body>
            <h2>🎬 SRT Cue 선택</h2>
            <div class="info">
                <strong>${cues.length}</strong>개의 Cue가 발견되었습니다. 변환할 Cue를 선택해주세요.
            </div>
            <div class="cue-list" id="cueList">
                ${cues.map((cue, index) => `
                    <div class="cue-item" data-index="${index}">
                        <div class="cue-header">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="cue_${index}" data-index="${index}" onchange="toggleCue(${index})" />
                                <span class="cue-number">#${index + 1}</span>
                            </div>
                            <span class="cue-time">${formatTime(cue.startTime)} - ${formatTime(cue.endTime)}</span>
                        </div>
                        <div class="cue-text">${escapeHtml(cue.text)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="controls">
                <button class="btn-select-all" onclick="selectAll()">전체 선택</button>
                <button class="btn-select-all" onclick="deselectAll()">전체 해제</button>
                <button class="btn-confirm" onclick="confirmSelection()">확인 (${cues.length}개)</button>
                <button class="btn-cancel" onclick="window.close()">취소</button>
            </div>
            <div class="controls" style="margin-top: 10px;">
                <button class="btn-confirm" onclick="convertSelected()" style="background: #FF9800;">
                    📝 선택한 Cue → WAV
                </button>
                <button class="btn-confirm" onclick="convertAll()" style="background: #9C27B0;">
                    🎬 전체 SRT → WAV
                </button>
                <button onclick="clearDebugLog()" style="background: #666; color: white;">디버그 지우기</button>
            </div>

            <!-- Debug Log Area -->
            <div style="margin-top: 10px; background: #000; padding: 10px; border-radius: 8px; max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 11px; border: 2px solid #FF9800; user-select: text;">
                <div style="color: #FF9800; font-weight: bold; margin-bottom: 5px;">🔧 Debug Log - Click Here, Ctrl+A to Select All, Ctrl+C to Copy</div>
                <div id="debugLog" style="color: #0f0; white-space: pre-wrap; cursor: text;" onclick="document.getElementById('debugLog').select();"></div>
            </div>

            <!-- Simple Test Button -->
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="alert('Test button works! JavaScript is running!'); debugLog('Test button clicked');" style="background: #00FF00; color: #000; padding: 10px; border: none; border-radius: 5px; font-weight: bold;">
                    🧪 TEST BUTTON (Click Me)
                </button>
            </div>

            <!-- Progress Bar -->
            <div class="progress-container" id="progressContainer">
                <div class="progress-text" id="progressText">진행 중...</div>
                <progress id="progressBar" value="0" max="100"></progress>
            </div>

            <script>
                // 전역 에러 및 경고 핸들러 추가
                window.addEventListener('error', function(event) {
                    console.error('🚨 GLOBAL ERROR:', event.error);
                    console.error('Error message:', event.message);
                    console.error('Error filename:', event.filename);
                    console.error('Error lineno:', event.lineno);
                    console.error('Error colno:', event.colno);
                    console.error('Event:', event);
                });

                window.addEventListener('unhandledrejection', function(event) {
                    console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
                    console.error('Promise:', event.promise);
                    event.preventDefault();
                });

                // alert()를 감지하는 디버깅 함수
                const originalAlert = window.alert;
                window.alert = function(message) {
                    console.log('🚨 ALERT CALLED:', message);
                    console.trace('Alert stack trace:');
                    return originalAlert.apply(window, arguments);
                };

                console.log('✅ Global error handlers installed');

                // Debug logging function
                function debugLog(message) {
                    const log = document.getElementById('debugLog');
                    const timestamp = new Date().toLocaleTimeString();
                    const logEntry = '[' + timestamp + '] ' + message + '\\n';
                    log.textContent += logEntry;
                    log.scrollTop = log.scrollHeight;
                    console.log(message);
                }

                function clearDebugLog() {
                    const log = document.getElementById('debugLog');
                    log.textContent = '';
                }

                function formatTime(ms) {
                    const hours = Math.floor(ms / 3600000);
                    const minutes = Math.floor((ms % 3600000) / 60000);
                    const seconds = Math.floor((ms % 60000) / 1000);
                    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
                }

                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }

                function toggleCue(index) {
                    const item = document.querySelector('.cue-item[data-index="' + index + '"]');
                    const checkbox = document.getElementById('cue_' + index);
                    item.classList.toggle('selected', checkbox.checked);
                    updateConfirmButton();
                }

                function selectAll() {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        cb.checked = true;
                        const index = cb.getAttribute('data-index');
                        document.querySelector('.cue-item[data-index="' + index + '"]').classList.add('selected');
                    });
                    updateConfirmButton();
                }

                function deselectAll() {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        cb.checked = false;
                        const index = cb.getAttribute('data-index');
                        document.querySelector('.cue-item[data-index="' + index + '"]').classList.remove('selected');
                    });
                    updateConfirmButton();
                }

                function updateConfirmButton() {
                    const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked');
                    const confirmBtn = document.querySelector('.btn-confirm');
                    confirmBtn.textContent = '확인 (' + checkedBoxes.length + '개)';
                }

                function confirmSelection() {
                    debugLog('=== confirmSelection() called ===');
                    const selectedCues = [];
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                    checkboxes.forEach(cb => {
                        const index = parseInt(cb.getAttribute('data-index'));
                        const cue = ${JSON.stringify(cues)}[index];
                        selectedCues.push({ ...cue, index: index });
                    });

                    debugLog('Confirming ' + selectedCues.length + ' selected cues');

                    if (selectedCues.length === 0) {
                        debugLog('ERROR: No cues selected');
                        return;
                    }

                    // 부모창에 선택된 cue 전달
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'srtSelected',
                            cues: selectedCues
                        }, '*');
                        debugLog('✓ Selection sent to parent window');
                    } else {
                        debugLog('ERROR: No parent window found!');
                    }

                    window.close();
                }

                // Progress bar functions for popup window
                function showProgress(text, value) {
                    const progressContainer = document.getElementById('progressContainer');
                    const progressText = document.getElementById('progressText');
                    const progressBar = document.getElementById('progressBar');

                    if (progressContainer && progressText && progressBar) {
                        progressText.textContent = text;
                        progressBar.value = value;
                        progressContainer.classList.add('show');
                    }
                }

                function updateProgress(value) {
                    const progressBar = document.getElementById('progressBar');
                    if (progressBar) {
                        progressBar.value = value;
                    }
                }

                function hideProgress() {
                    const progressContainer = document.getElementById('progressContainer');
                    if (progressContainer) {
                        progressContainer.classList.remove('show');
                    }
                }

                function convertSelected() {
                    debugLog('=== convertSelected() called ===');
                    const selectedCues = [];

                    try {
                        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                        debugLog('Found ' + checkboxes.length + ' checkboxes');

                        checkboxes.forEach(cb => {
                            const index = parseInt(cb.getAttribute('data-index'));
                            const cueData = ${JSON.stringify(cues)};
                            const cue = cueData[index];
                            selectedCues.push({ ...cue, index: index });
                        });

                        debugLog('Selected ' + selectedCues.length + ' cues');
                    } catch (error) {
                        debugLog('ERROR collecting cues: ' + error.message);
                        return;
                    }

                    if (selectedCues.length === 0) {
                        debugLog('ERROR: No cues selected');
                        return;
                    }

                    debugLog('Preparing to send message to parent window...');
                    debugLog('window.opener exists: ' + (window.opener ? 'YES' : 'NO'));
                    debugLog('window.opener is same window: ' + (window.opener === window ? 'YES' : 'NO'));
                    debugLog('Popup window has srtFilePath: ' + (window.srtFilePath || 'NO'));

                    try {
                        // 부모창에 선택된 cue 전달 및 변환 요청 (circular reference 방지)
                        if (window.opener) {
                            const messageData = {
                                type: 'srtSelected',
                                cues: selectedCues,
                                convert: true,
                                filePath: window.srtFilePath || null
                            };
                            debugLog('Message data: ' + JSON.stringify(messageData));
                            debugLog('Sending message via window.opener.postMessage...');
                            window.opener.postMessage(messageData, '*');
                            debugLog('✓ Message sent successfully');
                        } else {
                            debugLog('ERROR: No parent window found!');
                        }
                    } catch (msgError) {
                        debugLog('ERROR sending message: ' + msgError.message);
                    }

                    // 변환 중에는 창을 닫지 않음 (진행률 표시를 위해)
                }

                function convertAll() {
                    debugLog('=== convertAll() called ===');
                    const allCues = ${JSON.stringify(cues)}.map((cue, index) => ({ ...cue, index: index }));

                    debugLog('All ' + allCues.length + ' cues prepared');
                    debugLog('Popup window has srtFilePath: ' + (window.srtFilePath || 'NO'));

                    try {
                        // 부모창에 전체 SRT 변환 요청 (특별한 메시지 타입)
                        if (window.opener) {
                            const messageData = {
                                type: 'convertAllSRT',
                                filePath: window.srtFilePath || null
                            };
                            debugLog('Message data: ' + JSON.stringify(messageData));
                            window.opener.postMessage(messageData, '*');
                            debugLog('✓ Convert All SRT message sent successfully');
                        } else {
                            debugLog('ERROR: No parent window found!');
                        }
                    } catch (msgError) {
                        debugLog('ERROR sending message: ' + msgError.message);
                    }

                    // 변환 중에는 창을 닫지 않음 (진행률 표시를 위해)
                }

                // 초기화 시 전체 선택
                window.onload = function() {
                    debugLog('=== Popup window loaded ===');
                    debugLog('Total cues available: ' + ${JSON.stringify(cues)}.length);
                    selectAll();
                };

                // 부모창으로부터 진행률 업데이트 수신
                window.addEventListener('message', (event) => {
                    debugLog('← Received message from parent: ' + JSON.stringify(event.data));

                    // Test message from main window
                    if (event.data.type === 'testMessage') {
                        debugLog('✓ TEST MESSAGE RECEIVED: ' + event.data.message);
                    }

                    // Test echo message
                    if (event.data.type === 'testEcho') {
                        debugLog('✓ TEST ECHO RECEIVED: ' + event.data.message);
                    }

                    if (event.data.type === 'progressUpdate') {
                        if (event.data.show === false) {
                            hideProgress();
                        } else {
                            if (event.data.text !== undefined) {
                                showProgress(event.data.text, event.data.value);
                            } else if (event.data.value !== undefined) {
                                updateProgress(event.data.value);
                            }
                        }
                    } else if (event.data.type === 'conversionComplete') {
                        if (event.data.error) {
                            alert('오류: ' + event.data.message);
                        } else {
                            alert(event.data.message);
                        }
                        // 완료 후 창 닫기
                        setTimeout(() => {
                            window.close();
                        }, 1000);
                    }
                });
            </script>
        </body>
        </html>
    `);

    srtWindow.document.close();
}

/**
 * SRT 미리보기 표시
 * @param {Array} cues - 파싱된 cue 배열
 */
function displaySRTPreview(cues) {
    const previewDiv = document.getElementById('srt_preview');
    const cuesList = document.getElementById('srt_cues_list');

    if (!previewDiv || !cuesList) {
        console.error('SRT 미리보기 요소들을 찾을 수 없습니다');
        return;
    }

    cuesList.innerHTML = '';

    // 각 cue에 index가 없으면 추가
    const cuesWithIndex = cues.map((cue, idx) => {
        if (cue.index === undefined) {
            return { ...cue, index: idx };
        }
        return cue;
    });

    cuesWithIndex.forEach((cue, idx) => {
        const cueDiv = document.createElement('div');
        cueDiv.className = 'cue_item';
        cueDiv.style.cssText = `
            padding: 10px;
            margin: 6px 0;
            border: 1px solid var(--input-accent-color);
            border-radius: 6px;
            background-color: var(--secondary-bg-color);
            font-size: 13px;
            transition: all 0.2s ease;
        `;

        const startTime = ttsEngine.msToTime(cue.startTime);
        const endTime = ttsEngine.msToTime(cue.endTime);

        cueDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="cue_${idx}" data-index="${cue.index}" style="margin: 0; width: 18px; height: 18px;" checked />
                <label for="cue_${idx}" style="cursor: pointer; display: block; flex: 1; margin: 0;">
                    <strong style="color: var(--accent-color);">[${idx + 1}]</strong>
                    <span style="color: #666; font-size: 0.9em; margin-left: 8px;">[${startTime} - ${endTime}]</span>
                    <br/>
                    <span style="color: var(--main-text-color);">${escapeHtml(cue.text)}</span>
                </label>
            </div>
        `;

        // 호버 효과 추가
        cueDiv.addEventListener('mouseenter', () => {
            cueDiv.style.backgroundColor = 'var(--input-bg-color)';
            cueDiv.style.transform = 'translateX(2px)';
        });
        cueDiv.addEventListener('mouseleave', () => {
            cueDiv.style.backgroundColor = 'var(--secondary-bg-color)';
            cueDiv.style.transform = 'translateX(0)';
        });

        cuesList.appendChild(cueDiv);
    });

    previewDiv.style.display = 'block';

    // 전체 선택/해제 기능 추가
    addSelectAllFunctionality();
}

/**
 * 전체 선택/해제 기능 추가
 */
function addSelectAllFunctionality() {
    const cuesList = document.getElementById('srt_cues_list');
    if (!cuesList) return;

    const selectAllDiv = document.createElement('div');
    selectAllDiv.style.cssText = `
        padding: 8px;
        margin-bottom: 8px;
        background: #e9e9e9;
        border-radius: 4px;
        text-align: right;
    `;

    selectAllDiv.innerHTML = `
        <label style="cursor: pointer;">
            <input type="checkbox" id="select_all_cues" style="margin-right: 5px;" />
            전체 선택
        </label>
    `;

    cuesList.parentNode.insertBefore(selectAllDiv, cuesList);

    const selectAllCheckbox = document.getElementById('select_all_cues');
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = cuesList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
        });
    });
}

/**
 * HTML 이스케이프
 * @param {string} text - 입력 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 미리듣기
 */
async function previewTTS() {
    const textInput = document.getElementById('tts_input');
    if (!textInput) {
        console.error('텍스트 입력 요소를 찾을 수 없습니다');
        return;
    }

    const text = textInput.value.trim();
    if (!text) {
        alert('텍스트를 입력하세요');
        return;
    }

    if (!ttsEngine) {
        console.error('TTS Engine이 초기화되지 않았습니다');
        alert('TTS Engine이 초기화되지 않았습니다');
        return;
    }

    const voiceProfile = getSelectedVoiceProfile();

    console.log('미리듣기 시작:', text);
    console.log('ttsEngine:', ttsEngine);
    console.log('voiceProfile:', voiceProfile);

    ttsEngine.preview(text, voiceProfile).then(() => {
        console.log('미리듣기 완료');
    }).catch(error => {
        console.error('미리듣기 오류:', error);
        alert('미리듣기 중 오류가 발생했습니다: ' + error.message);
    });
}

/**
 * Cue 리스트 → WAV 변환
 */
async function convertCueListToWav(cues) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[${timestamp}] === CONVERT CUE LIST TO WAV ===`);
    console.log('Function called with', cues.length, 'cues');
    console.log('TTS Engine:', ttsEngine);
    console.log('SRT File Path (global):', srtFilePath);
    console.log('SRT Content (global):', srtContent ? 'Loaded' : 'Not loaded');
    console.log('======================================\n');

    if (!ttsEngine) {
        console.error('TTS Engine이 초기화되지 않았습니다');
        alert('TTS Engine이 초기화되지 않았습니다');
        return;
    }

    const voiceProfile = getSelectedVoiceProfile();
    const quality = getSelectedQuality();

    console.log('Cue 리스트 → WAV 변환 시작:', cues.length, '개');
    console.log('Voice profile:', voiceProfile);
    console.log('Quality:', quality);
    showProgress(`${cues.length}개 Cue 변환 중...`, 0);

    try {
        console.log(`\n=== STARTING CONVERSION OF ${cues.length} CUES ===`);
        // 각 cue를 순차적으로 변환
        const wavBlobs = [];
        for (let i = 0; i < cues.length; i++) {
            const cue = cues[i];
            console.log(`변환 중: ${i + 1}/${cues.length}`, cue.text);

            const wavBlob = await ttsEngine.convertTextToWav(cue.text, voiceProfile, quality);
            wavBlobs.push({ blob: wavBlob, index: i + 1, text: cue.text });

            // 진행률 업데이트
            const progress = Math.round(((i + 1) / cues.length) * 100);
            showProgress(`${i + 1}/${cues.length} 변환 완료 (${progress}%)`, progress);
        }

        // 변환된 파일들을 SRT 폴더에 저장
        console.log('SRT 폴더에 WAV 파일들을 저장합니다...');
        for (let i = 0; i < wavBlobs.length; i++) {
            const { blob, index, text } = wavBlobs[i];
            const safeText = text.substring(0, 20).replace(/[^a-zA-Z0-9가-힣]/g, '_');
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const filename = `animalese_cue_${index}_${year}${month}${day}_${hours}${minutes}${seconds}_${safeText}.wav`;
            console.log(`파일 저장 중: ${filename}`);
            await saveWavToFolder(blob, filename);
        }

        hideProgress();
        console.log(`\n✓ ALL ${wavBlobs.length} CUES CONVERTED AND SAVED SUCCESSFULLY ===\n`);

        // 새창에도 완료 메시지 전송
        if (srtPopupWindow && !srtPopupWindow.closed) {
            try {
                srtPopupWindow.postMessage({
                    type: 'conversionComplete',
                    message: `${wavBlobs.length}개 Cue가 성공적으로 변환되었습니다!`
                }, '*');
            } catch (error) {
                console.warn('새창 완료 메시지 전송 실패:', error);
            }
        }

        alert(`${wavBlobs.length}개 Cue가 성공적으로 변환되었습니다!`);

        // 새창 자동 닫기 (약간의 지연을 두고)
        setTimeout(() => {
            if (srtPopupWindow && !srtPopupWindow.closed) {
                srtPopupWindow.close();
            }
        }, 1500);
    } catch (error) {
        console.error('Cue 변환 실패:', error);
        hideProgress();

        // 새창에도 오류 메시지 전송
        if (srtPopupWindow && !srtPopupWindow.closed) {
            try {
                srtPopupWindow.postMessage({
                    type: 'conversionComplete',
                    message: '변환에 실패했습니다: ' + error.message,
                    error: true
                }, '*');
            } catch (msgError) {
                console.warn('새창 오류 메시지 전송 실패:', msgError);
            }
        }

        alert('변환에 실패했습니다: ' + error.message);
    }
}

/**
 * 텍스트 → WAV 변환
 */
function convertTextToWav() {
    if (!ttsEngine) {
        console.error('TTS Engine이 초기화되지 않았습니다');
        alert('TTS Engine이 초기화되지 않았습니다');
        return;
    }

    const textInput = document.getElementById('tts_input');
    if (!textInput) {
        console.error('텍스트 입력 요소를 찾을 수 없습니다');
        return;
    }

    const text = textInput.value.trim();
    if (!text) {
        alert('텍스트를 입력하세요');
        return;
    }

    const voiceProfile = getSelectedVoiceProfile();
    const quality = getSelectedQuality();

    console.log('텍스트 → WAV 변환 시작:', text);
    console.log('ttsEngine:', ttsEngine);
    console.log('voiceProfile:', voiceProfile);
    showProgress('변환 중...', 0);

    ttsEngine.convertTextToWav(text, voiceProfile, quality)
        .then(async (wavBlob) => {
            console.log('=== WAV CONVERSION DEBUG START ===');
            console.log('텍스트 전용 변환: Output 폴더에 저장합니다.');
            console.log('WAV Blob size:', wavBlob.size);
            console.log('WAV Blob type:', wavBlob.type);

            // ★ 텍스트 전용: Output 폴더에 자동 저장 (IPC 방식)
            const filename = 'animalese_text.wav';
            console.log('Filename:', filename);

            try {
                await saveWavToOutputFolder(wavBlob, filename);
                console.log('✓ saveWavToOutputFolder completed successfully');
            } catch (saveError) {
                console.error('🚨 saveWavToOutputFolder failed:', saveError);
                console.error('Save error name:', saveError.name);
                console.error('Save error message:', saveError.message);
                console.error('Save error stack:', saveError.stack);
                throw saveError;
            }

            hideProgress();
            console.log('✓ 텍스트 → WAV 변환 완료');
            console.log('=== WAV CONVERSION DEBUG END ===');
        })
        .catch(error => {
            console.error('변환 실패:', error);
            hideProgress();
            alert('변환에 실패했습니다: ' + error.message);
        });
}

/**
 * output 폴더에 WAV 파일 저장
 * @param {Blob} wavBlob - WAV 파일 Blob
 * @param {string} filename - 저장할 파일명
 * @returns {Promise<Object>} 저장 결과
 */
async function saveWavToOutputFolder(wavBlob, filename) {
    try {
        console.log('Output 폴더에 저장 시작:', filename);
        console.log('window.electron exists:', !!window.electron);
        console.log('window.api exists:', !!window.api);

        // Blob을 Uint8Array로 변환 (Buffer 자동 변환을 위해)
        const arrayBuffer = await wavBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);

        // window.electron IPC 사용
        if (window.electron && window.electron.invoke) {
            console.log('Calling window.electron.invoke("save-to-output-folder")...');
            const result = await window.electron.invoke('save-to-output-folder', filename, uint8Array);
            console.log('IPC result:', result);

            if (result && result.success) {
                console.log('✓ Output 폴더 저장 성공:', result.filePath);

                // 저장 완료 팝업 표시 안함 (자동 폴더 열기만)
                // showSaveCompletePopup(result.filename, result.outputFolder, result.filePath);

                return result;
            } else {
                throw new Error(result?.error || '저장 실패');
            }
        } else {
            throw new Error('window.electron을 사용할 수 없습니다. Electron 앱에서 실행해주세요.');
        }
    } catch (error) {
        console.error('Output 폴더 저장 실패:', error);
        alert('파일 저장에 실패했습니다: ' + error.message);
        throw error;
    }
}

/**
 * 저장 완료 팝업 표시
 * @param {string} filename - 저장된 파일명
 * @param {string} folderPath - 폴더 경로
 * @param {string} filePath - 전체 파일 경로
 */
function showSaveCompletePopup(filename, folderPath, filePath) {
    const popup = window.open(
        '',
        'saveComplete',
        'width=500,height=300,scrollbars=yes,resizable=yes'
    );

    if (popup) {
        popup.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>저장 완료</title>
                <meta charset="utf-8">
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-align: center;
                    }
                    .container {
                        background: rgba(255,255,255,0.1);
                        padding: 30px;
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
                    }
                    h1 {
                        font-size: 24px;
                        margin-bottom: 20px;
                    }
                    .file-info {
                        background: rgba(255,255,255,0.2);
                        padding: 15px;
                        border-radius: 10px;
                        margin: 20px 0;
                        word-break: break-all;
                    }
                    .button {
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 12px 30px;
                        font-size: 16px;
                        border-radius: 25px;
                        cursor: pointer;
                        margin: 5px;
                        font-weight: bold;
                        transition: all 0.3s;
                    }
                    .button:hover {
                        transform: scale(1.05);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✓ 파일 저장 완료!</h1>
                    <div class="file-info">
                        <strong>파일명:</strong> ${filename}<br>
                        <strong>저장 위치:</strong> ${folderPath}
                    </div>
                    <p>파일이 성공적으로 저장되었습니다.</p>
                    <button class="button" onclick="window.close()">닫기</button>
                    <button class="button" onclick="window.open('${folderPath.replace(/\\/g, '/')}')">폴더 열기</button>
                </div>
            </body>
            </html>
        `);
        popup.document.close();
    } else {
        alert(`파일 저장 완료!\n\n파일명: ${filename}\n저장 위치: ${folderPath}`);
    }
}

/**
 * 선택된 Cue → WAV 변환
 */
function convertSelectedCue() {
    if (!ttsEngine) {
        console.error('TTS Engine이 초기화되지 않았습니다');
        alert('TTS Engine이 초기화되지 않았습니다');
        return;
    }

    if (!currentSRTData) {
        alert('SRT 파일을 먼저 로드하세요');
        return;
    }

    const selectedCues = getSelectedCues();
    if (selectedCues.length === 0) {
        alert('변환할 cue를 선택하세요');
        return;
    }

    const voiceProfile = getSelectedVoiceProfile();
    const quality = getSelectedQuality();

    console.log(`선택된 ${selectedCues.length}개 cue 변환 시작`);
    showProgress('선택한 cue 변환 중...', 0);

    // 각 cue를 순차적으로 변환
    const promises = selectedCues.map((cue, index) => {
        return ttsEngine.convertCueToWav(cue.text, voiceProfile, quality)
            .then(wavBlob => {
                updateProgress(((index + 1) / selectedCues.length) * 100);
                return { wavBlob, index: cue.index, text: cue.text };
            });
    });

    Promise.all(promises)
        .then(async (results) => {
            // ★ 선택한 cue: Output 폴더에 자동 저장 (IPC 방식)
            console.log('Output 폴더에 WAV 파일들을 저장합니다...');
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                const filename = `animalese_cue_${result.index + 1}_${year}${month}${day}_${hours}${minutes}${seconds}.wav`;
                await saveWavToOutputFolder(result.wavBlob, filename);
            }
            hideProgress();
            console.log('선택된 cue 변환 완료');
        })
        .catch(error => {
            console.error('cue 변환 실패:', error);
            hideProgress();
            alert('cue 변환에 실패했습니다: ' + error.message);
        });
}

/**
 * 전체 SRT → WAV 변환
 */
function convertAllSRT() {
    if (!ttsEngine) {
        console.error('TTS Engine이 초기화되지 않았습니다');
        alert('TTS Engine이 초기화되지 않았습니다');
        return;
    }

    if (!srtContent) {
        alert('SRT 파일을 먼저 로드하세요');
        return;
    }

    const voiceProfile = getSelectedVoiceProfile();
    const quality = getSelectedQuality();

    console.log('\n=== CONVERT ALL SRT TO WAV ===');
    console.log('SRT Content available:', srtContent ? 'Yes' : 'No');
    console.log('SRT File Path:', srtFilePath);
    console.log('TTS Engine:', ttsEngine);
    console.log('=================================\n');

    showProgress('SRT 전체 변환 중...', 0);

    // SRT 전체를 하나의 WAV 파일로 변환 (타임스탬프 동기화)
    ttsEngine.convertSRTToWav(srtContent, { voiceProfile, quality })
        .then(async (wavBlob) => {
            // ★ SRT 전체: Output 폴더에 자동 저장 (IPC 방식)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const filename = `animalese_srt_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.wav`;
            console.log('SRT 전체 변환: Output 폴더에 저장합니다.');

            await saveWavToOutputFolder(wavBlob, filename);

            hideProgress();
            console.log('SRT 전체 변환 완료 (타임스탬프 동기화 적용)');
        })
        .catch(error => {
            console.error('SRT 변환 실패:', error);
            hideProgress();
            alert('SRT 변환에 실패했습니다: ' + error.message);
        });
}

/**
 * 선택된 cue 목록 가져오기
 * @returns {Array} 선택된 cue 배열
 */
function getSelectedCues() {
    if (!currentSRTData || !currentSRTData.cues) return [];

    const selectedCues = [];
    const checkboxes = document.querySelectorAll('#srt_cues_list input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
            const originalIndex = parseInt(checkbox.getAttribute('data-index'));
            const cue = currentSRTData.cues.find(c => c.index === originalIndex);
            if (cue) {
                selectedCues.push(cue);
            }
        }
    });

    return selectedCues;
}

/**
 * 선택된 음성 프로필 가져오기 (기존 UI와 연동)
 * @returns {Object} 음성 프로필
 */
function getSelectedVoiceProfile() {
    // 기존 UI에서 음성 설정 값 읽기
    const pitchInput = document.getElementById('voice_pitch');
    const variationInput = document.getElementById('voice_variation');
    const intonationInput = document.getElementById('voice_intonation');
    const voiceTypeSelect = document.getElementById('voice_type');

    const pitch = pitchInput ? parseFloat(pitchInput.value) || 0 : 0;
    const variation = variationInput ? parseFloat(variationInput.value) || 0 : 0;
    const intonation = intonationInput ? parseFloat(intonationInput.value) || 0 : 0;
    const voiceType = voiceTypeSelect ? voiceTypeSelect.value || 'f1' : 'f1';

    console.log('TTS 음성 프로필:', {
        voiceType,
        pitch,
        variation,
        intonation
    });

    return {
        volume: 0.65,  // 기본 볼륨
        pitchShift: pitch,
        variation: variation,
        intonation: intonation,
        rate: 1.0,
        type: voiceType  // 음성 타입 추가
    };
}

/**
 * 품질 설정 가져오기 (저용량 고정)
 * @returns {string} 품질 설정
 */
function getSelectedQuality() {
    return 'low';  // 저용량 고정
}

/**
 * WAV 파일을 SRT 폴더에 저장 (IPC를 통한 파일 저장)
 * @param {Blob} wavBlob - WAV Blob
 * @param {string} filename - 파일명
 */
window.saveWavToFolder = function(wavBlob, filename) {
    return new Promise((resolve, reject) => {
        console.log('=== saveWavToFolder called ===');
        console.log('srtFilePath:', srtFilePath);
        console.log('filename:', filename);
        console.log('================================');

        // SRT 파일 경로가 없으면 브라우저 다운로드 사용
        if (!srtFilePath) {
            console.log('⚠️ SRT 파일 경로가 없습니다. 브라우저 다운로드를 사용합니다.');
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('파일 다운로드:', filename);
            resolve();
            return;
        }

        // SRT 파일이 있는 폴더 경로 추출 (크로스 플랫폼 지원)
        // 슬래시와 백슬래시 모두 처리
        const srtFolderPath = srtFilePath.replace(/\\/g, '/').replace(/\/[^\/]*$/, '');
        const filePath = srtFolderPath + '/' + filename;

        console.log('SRT 폴더에 파일 저장:', filePath);

        // FileReader로 blob을 ArrayBuffer로 변환
        const reader = new FileReader();
        reader.onload = function() {
            const arrayBuffer = reader.result;

            // IPC를 통해 메인 프로세스에 파일 저장 요청
            if (window.api && window.api.saveFile) {
                window.api.saveFile(filePath, new Uint8Array(arrayBuffer))
                    .then(() => {
                        console.log('✓ 파일 저장 완료:', filePath);
                        resolve();
                    })
                    .catch(error => {
                        console.error('파일 저장 실패:', error);
                        // 실패시 브라우저 다운로드로 폴백
                        console.log('브라우저 다운로드로 폴백합니다.');
                        const url = URL.createObjectURL(wavBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        resolve();
                    });
            } else {
                console.warn('window.api.saveFile를 사용할 수 없습니다. 브라우저 다운로드를 사용합니다.');
                // IPC가 없으면 브라우저 다운로드로 폴백
                const url = URL.createObjectURL(wavBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve();
            }
        };

        reader.onerror = function(error) {
            console.error('파일 읽기 실패:', error);
            reject(error);
        };

        reader.readAsArrayBuffer(wavBlob);
    });
}

/**
 * 진행률 표시
 * @param {string} text - 진행률 텍스트
 * @param {number} value - 진행률 값 (0-100)
 */
function showProgress(text, value) {
    // 메인창에 진행률 표시 요소가 없으므로 새창에만 표시
    if (srtPopupWindow && !srtPopupWindow.closed) {
        try {
            srtPopupWindow.postMessage({
                type: 'progressUpdate',
                text: text,
                value: value,
                show: true
            }, '*');
        } catch (error) {
            console.warn('새창 진행률 업데이트 실패:', error);
        }
    }
}

/**
 * 진행률 업데이트
 * @param {number} value - 진행률 값 (0-100)
 */
function updateProgress(value) {
    const progressBar = document.getElementById('tts_progress_bar');
    if (progressBar) {
        progressBar.value = value;
    }

    // 새창에도 진행률 업데이트
    if (srtPopupWindow && !srtPopupWindow.closed) {
        try {
            srtPopupWindow.postMessage({
                type: 'progressUpdate',
                value: value,
                show: true
            }, '*');
        } catch (error) {
            console.warn('새창 진행률 업데이트 실패:', error);
        }
    }
}

/**
 * 진행률 숨김
 */
function hideProgress() {
    // 새창에도 진행률 숨김
    if (srtPopupWindow && !srtPopupWindow.closed) {
        try {
            srtPopupWindow.postMessage({
                type: 'progressUpdate',
                show: false
            }, '*');
        } catch (error) {
            console.warn('새창 진행률 숨김 실패:', error);
        }
    }
}

/**
 * 시간 형식 변환 (SRT용)
 * @param {number} ms - 밀리초
 * @returns {string} 시간 문자열 (HH:MM:SS.mmm)
 */
function formatTime(ms) {
    return ttsEngine.msToTime(ms);
}

/**
 * TTS 입력 초기화
 */
function clearTTSInput() {
    const textInput = document.getElementById('tts_input');
    if (textInput) {
        textInput.value = '';
        textInput.disabled = false;  // Ensure it's not disabled
        textInput.readOnly = false;  // Ensure it's not read-only
        textInput.focus();  // Focus back on the input
    }

    // SRT 데이터 초기화
    currentSRTData = null;
    srtContent = null;
    srtFilePath = null;
    const previewDiv = document.getElementById('srt_preview');
    if (previewDiv) {
        previewDiv.style.display = 'none';
    }
}

/**
 * 음성 프로필 목록 로드
 */
function loadVoiceProfiles() {
    const voiceProfileSelect = document.getElementById('tts_voice_profile');
    if (!voiceProfileSelect) return;

    const profiles = [
        { value: 'default', label: '기본 음성' },
        { value: 'high', label: '고음' },
        { value: 'low', label: '저음' }
    ];

    voiceProfileSelect.innerHTML = '';
    profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.value;
        option.textContent = profile.label;
        voiceProfileSelect.appendChild(option);
    });

    // 기본값 선택
    voiceProfileSelect.value = 'default';
}

// 전역 스코프에 함수 노출 (HTML에서 호출 가능하도록)
// 즉시 window에 할당하여 전역 스코프에서 사용 가능하도록 함
if (typeof window !== 'undefined') {
    // 즉시 실행 함수로 window에 직접 할당
    (function() {
        // TTS 모듈 초기화
        window.initTTS = function(audioManager) {
            console.log('TTS 초기화 시작...');
            console.log('window.TTSEngine:', typeof window.TTSEngine);

            if (typeof window !== 'undefined') {
                if (!window.TTSEngine) {
                    console.error('TTSEngine이 로드되지 않았습니다');
                    return;
                }

                try {
                    window.ttsEngine = new window.TTSEngine(audioManager);
                    ttsEngine = window.ttsEngine;
                    console.log('TTS Engine 초기화 완료');

                    // 새창 메시지 리스너 등록
                    window.addEventListener('message', async (event) => {
                        const timestamp = new Date().toLocaleTimeString();
                        console.log(`\n[${timestamp}] === POPUP MESSAGE RECEIVED ===`);
                        console.log('Event source:', event.source ? 'Popup window' : 'Unknown');
                        console.log('Event data:', JSON.stringify(event.data, null, 2));
                        console.log('Event origin:', event.origin);
                        console.log('================================\n');

                        if (event.data && event.data.type === 'srtSelected') {
                            const selectedCues = event.data.cues;
                            const shouldConvert = event.data.convert || false;
                            console.log('새창에서 선택된 Cue:', selectedCues.length, '개', shouldConvert ? '(자동 변환 요청)' : '');

                            // 새창 레퍼런스는 window.opener로 접근 가능하므로 저장 불필요
                            // (진행률 업데이트는 postMessage로 가능)

                            // 선택된 cue로 currentSRTData 업데이트
                            currentSRTData = {
                                cues: selectedCues,
                                selectedIndices: selectedCues.map(cue => cue.index).filter(idx => idx !== undefined)
                            };

                            if (shouldConvert) {
                                console.log('Starting conversion...');
                                // 자동 변환 요청 시 바로 변환 시작
                                await convertCueListToWav(selectedCues);
                            } else {
                                // 미리보기 표시
                                displaySRTPreview(selectedCues);
                            }
                        }
                    });
                } catch (error) {
                    console.error('TTS Engine 초기화 실패:', error);
                }
            }
        };

        // SRT 파일 로드
        // loadSRTFile is already defined above (using Electron dialog)

        // 미리듣기
        window.previewTTS = function() {
            const textInput = document.getElementById('tts_input');
            if (!textInput) {
                console.error('텍스트 입력 요소를 찾을 수 없습니다');
                return;
            }

            const text = textInput.value.trim();
            if (!text) {
                alert('텍스트를 입력하세요');
                return;
            }

            if (!ttsEngine) {
                console.error('TTS Engine이 초기화되지 않았습니다');
                alert('TTS Engine이 초기화되지 않았습니다');
                return;
            }

            const voiceProfile = getSelectedVoiceProfile();

            // 기존 재생 중이면 정지
            // if (window.audio && window.audio.isPlaying) {
            //     window.audio.release(999);  // 알림음 방지를 위해 주석 처리
            // }

            console.log('미리듣기 시작:', text);
            console.log('ttsEngine:', ttsEngine);
            console.log('voiceProfile:', voiceProfile);

            // ★ 미리보기도 브라우저 기반 WAV 생성 + 재생 (IPC 의존성 제거)
            ttsEngine.convertTextToWav(text, voiceProfile, 'low')
                .then(async (wavBlob) => {
                    console.log('=== AUDIO DEBUG START ===');
                    console.log('WAV Blob size:', wavBlob.size);
                    console.log('WAV Blob type:', wavBlob.type);

                    // WAV Blob을 Blob URL로 변환
                    const audioUrl = URL.createObjectURL(wavBlob);
                    console.log('Audio URL created:', audioUrl);

                    // HTML5 Audio로 재생
                    const audio = new Audio(audioUrl);
                    audio.volume = voiceProfile.volume || 0.65;
                    audio.previewUrl = audioUrl;  // blob URL 저장
                    window.previewAudio = audio;
                    console.log('Audio object created');
                    console.log('Audio src:', audio.src);
                    console.log('Audio volume:', audio.volume);
                    console.log('Audio readyState:', audio.readyState);
                    console.log('Audio paused:', audio.paused);
                    console.log('Audio currentTime:', audio.currentTime);

                    // Event listeners 추가
                    audio.onloadstart = () => {
                        console.log('✓ Audio: loadstart event');
                        console.log('  currentTime:', audio.currentTime);
                    };
                    audio.onloadedmetadata = () => {
                        console.log('✓ Audio: loadedmetadata event');
                        console.log('  duration:', audio.duration);
                        console.log('  readyState:', audio.readyState);
                    };
                    audio.onloadeddata = () => {
                        console.log('✓ Audio: loadeddata event');
                        console.log('  readyState:', audio.readyState);
                    };
                    audio.oncanplay = () => {
                        console.log('✓ Audio: canplay event');
                        console.log('  readyState:', audio.readyState);
                    };
                    audio.oncanplaythrough = () => {
                        console.log('✓ Audio: canplaythrough event');
                        console.log('  readyState:', audio.readyState);
                    };
                    audio.onstalled = () => {
                        console.warn('⚠️ Audio: stalled event');
                        console.warn('  networkState:', audio.networkState);
                    };
                    audio.onabort = () => {
                        console.warn('⚠️ Audio: abort event');
                        console.warn('  networkState:', audio.networkState);
                    };
                    audio.onpause = () => {
                        console.log('📍 Audio: pause event');
                        console.log('  currentTime:', audio.currentTime);
                        console.log('  paused:', audio.paused);

                        // 일시정지 시 버튼을 재생 버튼으로 변경
                        if (typeof updatePreviewButtonState === 'function') {
                            updatePreviewButtonState(false);
                        }
                    };
                    audio.onplaying = () => {
                        console.log('▶️ Audio: playing event');
                        console.log('  currentTime:', audio.currentTime);
                        console.log('  paused:', audio.paused);
                    };
                    audio.onended = () => {
                        console.log('✓ Audio: ended event');
                        console.log('  currentTime:', audio.currentTime);
                        console.log('  duration:', audio.duration);
                        console.log('미리듣기 완료');
                        console.log('=== AUDIO DEBUG END ===');

                        // 재생结束时 audio 객체 정리
                        if (audio.previewUrl && audio.previewUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(audio.previewUrl);
                        }
                        if (window.previewAudio === audio) {
                            window.previewAudio = null;
                        }

                        // 재생结束时 버튼을 재생 버튼으로 변경
                        if (typeof updatePreviewButtonState === 'function') {
                            updatePreviewButtonState(false);
                        }
                    };
                    audio.onerror = (error) => {
                        console.error('🚨 Audio: error event:', error);
                        console.error('Audio error code:', audio.error?.code);
                        console.error('Audio error message:', audio.error?.message);
                        console.error('Audio networkState:', audio.networkState);
                        console.error('Audio readyState:', audio.readyState);
                        console.error('Audio paused:', audio.paused);
                        console.error('Audio currentTime:', audio.currentTime);
                        console.error('Full audio object:', audio);
                        alert('미리듣기 재생 중 오류가 발생했습니다 (상세 로그 확인)');

                        // 오류 시 버튼을 재생 버튼으로 변경
                        if (typeof updatePreviewButtonState === 'function') {
                            updatePreviewButtonState(false);
                        }
                    };

                    console.log('미리듣기 WAV 재생 시작');
                    console.log('Before audio.play()...');
                    console.log('Audio paused state before play:', audio.paused);
                    console.log('Audio currentTime before play:', audio.currentTime);

                    // 버튼을 정지 버튼으로 변경
                    if (typeof updatePreviewButtonState === 'function') {
                        updatePreviewButtonState(true);
                    }

                    try {
                        const playPromise = audio.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                console.log('✅ Audio.play() promise resolved successfully');
                                console.log('Audio paused after promise resolve:', audio.paused);
                                console.log('Audio currentTime after promise resolve:', audio.currentTime);
                            }).catch(playError => {
                                console.error('🚨 Audio.play() promise rejected:', playError);
                                console.error('PlayError name:', playError.name);
                                console.error('PlayError message:', playError.message);
                                console.error('PlayError code:', playError.code);
                                console.error('PlayError toString:', playError.toString());
                                // 재생 실패 시 버튼을 다시 재생 버튼으로 변경
                                if (typeof updatePreviewButtonState === 'function') {
                                    updatePreviewButtonState(false);
                                }
                            });
                        }
                        await playPromise;
                        console.log('✓ Audio.play() completed successfully');
                    } catch (playError) {
                        console.error('🚨 Audio.play() threw error:', playError);
                        console.error('PlayError name:', playError.name);
                        console.error('PlayError message:', playError.message);
                        console.error('PlayError code:', playError.code);
                        console.error('PlayError stack:', playError.stack);
                        // 재생 실패 시 버튼을 다시 재생 버튼으로 변경
                        if (typeof updatePreviewButtonState === 'function') {
                            updatePreviewButtonState(false);
                        }
                        throw playError;
                    }
                })
                .catch(error => {
                    console.error('🚨 미리듣기 실패:', error);
                    console.error('Error name:', error.name);
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    alert('미리듣기 중 오류가 발생했습니다: ' + error.message);
                });
        };

        // 텍스트 → WAV 변환 (SRT 경로와 무관, 브라우저 다운로드만 사용)
        window.convertTextToWav = function() {
            if (!ttsEngine) {
                console.error('TTS Engine이 초기화되지 않았습니다');
                alert('TTS Engine이 초기화되지 않았습니다');
                return;
            }

            const textInput = document.getElementById('tts_input');
            if (!textInput) {
                console.error('텍스트 입력 요소를 찾을 수 없습니다');
                return;
            }

            const text = textInput.value.trim();
            if (!text) {
                alert('텍스트를 입력하세요');
                return;
            }

            const voiceProfile = getSelectedVoiceProfile();
            const quality = getSelectedQuality();

            console.log('텍스트 → WAV 변환 시작:', text);
            console.log('ttsEngine:', ttsEngine);
            console.log('voiceProfile:', voiceProfile);
            showProgress('변환 중...', 0);

            ttsEngine.convertTextToWav(text, voiceProfile, quality)
                .then(async (wavBlob) => {
                    // ★ 텍스트 전용: Output 폴더에 자동 저장 (IPC 방식)
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const seconds = String(now.getSeconds()).padStart(2, '0');
                    const filename = `animalese_text_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.wav`;
                    console.log('텍스트 전용 변환: Output 폴더에 저장합니다.');

                    await saveWavToOutputFolder(wavBlob, filename);

                    hideProgress();
                    console.log('텍스트 → WAV 변환 완료');
                })
                .catch(error => {
                    console.error('변환 실패:', error);
                    hideProgress();
                    alert('변환에 실패했습니다: ' + error.message);
                });
        };

        // 입력 초기화
        window.clearTTSInput = function() {
            const textInput = document.getElementById('tts_input');
            if (textInput) {
                // 텍스트 초기화
                textInput.value = '';
                textInput.disabled = false;
                textInput.readOnly = false;
                // 플레이스홀더 텍스트가 표시되도록 함
                textInput.placeholder = '여기에 텍스트를 입력하세요...';
                textInput.focus();
            }

            // SRT 데이터 초기화
            currentSRTData = null;
            const previewDiv = document.getElementById('srt_preview');
            if (previewDiv) {
                previewDiv.style.display = 'none';
            }
        };

        // 음성 프로필 로드
        window.loadVoiceProfiles = function() {
            const voiceProfileSelect = document.getElementById('tts_voice_profile');
            if (!voiceProfileSelect) return;

            const profiles = [
                { value: 'default', label: '기본 음성' },
                { value: 'high', label: '고음' },
                { value: 'low', label: '저음' }
            ];

            voiceProfileSelect.innerHTML = '';
            profiles.forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.value;
                option.textContent = profile.label;
                voiceProfileSelect.appendChild(option);
            });

            voiceProfileSelect.value = 'default';
        };

        // 텍스트 입력 필드 초기화 (페이지 로드 시)
        const textInput = document.getElementById('tts_input');
        if (textInput) {
            // 텍스트 초기화
            textInput.value = '';
            textInput.placeholder = '여기에 텍스트를 입력하세요...';
            textInput.disabled = false;
            textInput.readOnly = false;

            // 입력 이벤트 리스너 추가
            textInput.addEventListener('input', (e) => {
                // 텍스트가 입력되면 플레이스홀더가 숨겨짐
                if (e.target.value.length > 0) {
                    e.target.placeholder = '';
                } else {
                    e.target.placeholder = '여기에 텍스트를 입력하세요...';
                }
            });

            // 포커스 이벤트 리스너 추가
            textInput.addEventListener('focus', (e) => {
                // 포커스 시 플레이스홀더가 여전히 표시되도록
                if (e.target.value.length === 0) {
                    e.target.placeholder = '여기에 텍스트를 입력하세요...';
                }
            });

            console.log('✓ TTS input field initialized and event listeners added');
        }

        console.log('✓ TTS functions exposed to window object');
    })();
}
