document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('asciiCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const saveSnapshotButton = document.getElementById('saveSnapshotButton');
    const asciiDensitySlider = document.getElementById('asciiDensity');
    const characterSetSelect = document.getElementById('characterSet');
    const emojiSetSelect = document.getElementById('emojiSet');
    const colorModeRadios = document.getElementsByName('colorMode');

    if (!video || !canvas || !startButton || !saveSnapshotButton || !asciiDensitySlider || !characterSetSelect || !emojiSetSelect || colorModeRadios.length === 0) {
        console.error('One or more required elements are missing from the DOM');
        return;
    }

    const CHARACTER_SETS = {
        standard: ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'],
        simple: ['#', '.'],
        complex: ['$', '@', 'B', '%', '8', '&', 'W', 'M', '#', '*', 'o', 'a', 'h', 'k', 'b', 'd', 'p', 'q', 'w', 'm', 'Z', 'O', '0', 'Q', 'L', 'C', 'J', 'U', 'Y', 'X', 'z', 'c', 'v', 'u', 'n', 'x', 'r', 'j', 'f', 't', '/', '\\', '|', '(', ')', '1', '{', '}', '[', ']', '?', '-', '_', '+', '~', '<', '>', 'i', '!', 'l', 'I', ';', ':', ',', '"', '^', '`', '\'', '.'],
        blocks: ['█', '▓', '▒', '░', ' '],
        emoticons: [':)', '.>)', ':(', ';)', ':|', ':D', ':P', ':O', ':/', ':3', '^_^', 'o_O', '>_<', '<3'],
        developerIcons: ['⚛', '🅰', '🐍', '☕', '🐘', '🦀', '🐹', '🔷', '🟨', '🐳', '☸', '🐙', '🦊', '🗄', '🌐', '📱', '🔒', '☁']
    };

    const EMOJI_SETS = {
        none: [],
        faces: ['😀', '😎', '🤔', '😍', '🙄', '😴', '🤯', '🤠', '👻', '👽', '🤖', '🎃', '👾', '🦄'],
        objects: ['❤️', '⭐', '✨', '🔥', '💧', '🌿', '🌙', '☀️', '⚡', '❄️', '🌈', '🍀', '🌺', '🌴']
    };

    let ASCII_CHARS = CHARACTER_SETS.standard;
    let EMOJI_CHARS = EMOJI_SETS.none;
    let ASCII_WIDTH = 80;
    let ASCII_HEIGHT = 60;

    let isRunning = false;
    let stream = null;
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    canvas.width = ASCII_WIDTH * 10;
    canvas.height = ASCII_HEIGHT * 10;
    ctx.font = '10px monospace';

    startButton.addEventListener('click', toggleASCIICam);
    saveSnapshotButton.addEventListener('click', saveSnapshot);
    asciiDensitySlider.addEventListener('input', updateASCIIDensity);
    characterSetSelect.addEventListener('change', updateCharacterSet);
    emojiSetSelect.addEventListener('change', updateEmojiSet);
    colorModeRadios.forEach(radio => radio.addEventListener('change', updateColorMode));

    // Pre-compute brightness to ASCII char mapping
    const brightnessToChar = new Array(256);
    function updateBrightnessToChar() {
        for (let i = 0; i < 256; i++) {
            const charIndex = Math.floor(i / 255 * (ASCII_CHARS.length - 1));
            brightnessToChar[i] = ASCII_CHARS[charIndex];
        }
    }
    updateBrightnessToChar();

    function updateASCIIDensity() {
        const density = parseInt(asciiDensitySlider.value);
        ASCII_WIDTH = Math.floor(density * 1.33);
        ASCII_HEIGHT = density;
        canvas.width = ASCII_WIDTH * 10;
        canvas.height = ASCII_HEIGHT * 10;
        if (isRunning) {
            processFrame();
        }
    }

    function updateCharacterSet() {
        ASCII_CHARS = CHARACTER_SETS[characterSetSelect.value];
        updateBrightnessToChar();
        if (characterSetSelect.value === 'emoticons' || characterSetSelect.value === 'developerIcons') {
            ctx.font = '14px sans-serif';
        } else {
            ctx.font = '10px monospace';
        }
        if (isRunning) {
            processFrame();
        }
    }

    function updateEmojiSet() {
        EMOJI_CHARS = EMOJI_SETS[emojiSetSelect.value];
        if (emojiSetSelect.value !== 'none') {
            ctx.font = '14px sans-serif';
        } else {
            ctx.font = '10px monospace';
        }
        if (isRunning) {
            processFrame();
        }
    }

    function updateColorMode() {
        if (isRunning) {
            processFrame();
        }
    }

    function getSelectedColorMode() {
        for (const radio of colorModeRadios) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return 'green'; // Default to green if no option is selected
    }

    async function toggleASCIICam() {
        if (isRunning) {
            stopASCIICam();
        } else {
            await startASCIICam();
        }
    }

    async function startASCIICam() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.play();
            isRunning = true;
            startButton.textContent = 'Stop ASCII cam';
            lastFrameTime = performance.now();
            requestAnimationFrame(processFrame);
        } catch (error) {
            console.error('Error accessing webcam:', error);
            alert('Unable to access webcam. Please make sure you have granted permission.');
        }
    }

    function stopASCIICam() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        isRunning = false;
        startButton.textContent = 'Start ASCII cam';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        video.srcObject = null;
    }

    function processFrame(currentTime) {
        if (!isRunning) return;

        if (currentTime - lastFrameTime < frameInterval) {
            requestAnimationFrame(processFrame);
            return;
        }

        lastFrameTime = currentTime;

        ctx.drawImage(video, 0, 0, ASCII_WIDTH, ASCII_HEIGHT);
        const imageData = ctx.getImageData(0, 0, ASCII_WIDTH, ASCII_HEIGHT);
        const asciiFrame = convertToASCII(imageData);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const colorMode = getSelectedColorMode();
        const isEmojiMode = emojiSetSelect.value !== 'none' || characterSetSelect.value === 'emoticons' || characterSetSelect.value === 'developerIcons';
        for (let y = 0; y < ASCII_HEIGHT; y++) {
            for (let x = 0; x < ASCII_WIDTH; x++) {
                const { char, color } = asciiFrame[y][x];
                if (isEmojiMode) {
                    ctx.globalAlpha = 0.5; // Increased transparency for emojis and special characters
                    ctx.fillStyle = getColor(color, colorMode);
                    ctx.fillText(char, x * 14, y * 14 + 10);
                    ctx.globalAlpha = 1.0; // Reset transparency for non-emoji characters
                } else {
                    ctx.fillStyle = getColor(color, colorMode);
                    ctx.fillText(char, x * 10, y * 10);
                }
            }
        }

        requestAnimationFrame(processFrame);
    }

    function getColor(color, colorMode) {
        switch (colorMode) {
            case 'green':
                return '#00ff00';
            case 'color':
                return color;
            case 'bw':
                const [r, g, b] = color.match(/\d+/g).map(Number);
                const grayscale = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                return `rgb(${grayscale},${grayscale},${grayscale})`;
            default:
                return color;
        }
    }

    function convertToASCII(imageData) {
        const asciiFrame = [];
        const data = imageData.data;
        for (let y = 0; y < ASCII_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < ASCII_WIDTH; x++) {
                const index = (y * ASCII_WIDTH + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const brightness = (r + g + b) / 3;
                let char;
                if (EMOJI_CHARS.length > 0) {
                    const emojiIndex = Math.floor(brightness / 255 * (EMOJI_CHARS.length - 1));
                    char = EMOJI_CHARS[emojiIndex];
                } else {
                    char = brightnessToChar[Math.round(brightness)];
                }
                row.push({
                    char: char,
                    color: `rgb(${r},${g},${b})`
                });
            }
            asciiFrame.push(row);
        }
        return asciiFrame;
    }

    function saveSnapshot() {
        if (!isRunning) {
            alert('Please start the ASCII cam before saving a snapshot.');
            return;
        }

        const snapshotCanvas = document.createElement('canvas');
        snapshotCanvas.width = canvas.width;
        snapshotCanvas.height = canvas.height;
        const snapshotCtx = snapshotCanvas.getContext('2d');
        snapshotCtx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.download = 'ascii_snapshot.png';
        link.href = snapshotCanvas.toDataURL('image/png');
        link.click();
    }
});
