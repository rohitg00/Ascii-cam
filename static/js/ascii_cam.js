try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM content loaded, initializing ASCII cam...');

        const elements = {
            video: document.getElementById('video'),
            canvas: document.getElementById('asciiCanvas'),
            ctx: document.getElementById('asciiCanvas').getContext('2d'),
            startButton: document.getElementById('startButton'),
            saveSnapshotButton: document.getElementById('saveSnapshotButton'),
            asciiDensitySlider: document.getElementById('asciiDensity'),
            characterSetSelect: document.getElementById('characterSet'),
            emojiSetSelect: document.getElementById('emojiSet'),
            colorModeRadios: document.getElementsByName('colorMode'),
            filterSelect: document.getElementById('filterSelect'),
            pixelSizeSlider: document.getElementById('pixelSize'),
            textSizeSlider: document.getElementById('textSize'),
            customCharactersInput: document.getElementById('customCharacters'),
            textStyleSelect: document.getElementById('textStyle'),
            textColorInput: document.getElementById('textColor'),
            backgroundColorInput: document.getElementById('backgroundColor')
        };

        // Log each element individually
        Object.entries(elements).forEach(([key, value]) => {
            console.log(`${key}:`, value);
        });

        const missingElements = Object.entries(elements)
            .filter(([key, value]) => !value || (key === 'colorModeRadios' && value.length === 0))
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('The following elements are missing from the DOM:', missingElements.join(', '));
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

        elements.canvas.width = ASCII_WIDTH * 10;
        elements.canvas.height = ASCII_HEIGHT * 10;
        elements.ctx.font = '10px monospace';

        // Event listeners
        elements.startButton.addEventListener('click', toggleASCIICam);
        elements.saveSnapshotButton.addEventListener('click', saveSnapshot);
        elements.asciiDensitySlider.addEventListener('input', updateASCIIDensity);
        elements.characterSetSelect.addEventListener('change', updateCharacterSet);
        elements.emojiSetSelect.addEventListener('change', updateEmojiSet);
        elements.colorModeRadios.forEach(radio => radio.addEventListener('change', updateColorMode));
        elements.filterSelect.addEventListener('change', updateFilter);
        elements.pixelSizeSlider.addEventListener('input', updatePixelSize);
        elements.textSizeSlider.addEventListener('input', updateTextSize);
        elements.customCharactersInput.addEventListener('input', updateCustomCharacters);
        elements.textStyleSelect.addEventListener('change', updateTextStyle);
        elements.textColorInput.addEventListener('input', updateTextColor);
        elements.backgroundColorInput.addEventListener('input', updateBackgroundColor);

        console.log('Event listeners set up for all controls');

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
            console.log('Updating ASCII Density:', elements.asciiDensitySlider.value);
            const density = parseInt(elements.asciiDensitySlider.value);
            ASCII_WIDTH = Math.floor(density * 1.33);
            ASCII_HEIGHT = density;
            elements.canvas.width = ASCII_WIDTH * 10;
            elements.canvas.height = ASCII_HEIGHT * 10;
            if (isRunning) {
                processFrame();
            }
        }

        function updateCharacterSet() {
            console.log('Updating Character Set:', elements.characterSetSelect.value);
            ASCII_CHARS = CHARACTER_SETS[elements.characterSetSelect.value];
            updateBrightnessToChar();
            updateTextStyle();
            if (isRunning) {
                processFrame();
            }
        }

        function updateEmojiSet() {
            console.log('Updating Emoji Set:', elements.emojiSetSelect.value);
            EMOJI_CHARS = EMOJI_SETS[elements.emojiSetSelect.value];
            updateTextStyle();
            if (isRunning) {
                processFrame();
            }
        }

        function updateColorMode() {
            console.log('Updating Color Mode:', getSelectedColorMode());
            if (isRunning) {
                processFrame();
            }
        }

        function updateFilter() {
            console.log('Updating Filter:', elements.filterSelect.value);
            if (isRunning) {
                processFrame();
            }
        }

        function updatePixelSize() {
            console.log('Updating Pixel Size:', elements.pixelSizeSlider.value);
            if (isRunning) {
                processFrame();
            }
        }

        function updateTextSize() {
            console.log('Updating Text Size:', elements.textSizeSlider.value);
            updateTextStyle();
            if (isRunning) {
                processFrame();
            }
        }

        function updateCustomCharacters() {
            console.log('Updating Custom Characters:', elements.customCharactersInput.value);
            ASCII_CHARS = elements.customCharactersInput.value.split('');
            updateBrightnessToChar();
            if (isRunning) {
                processFrame();
            }
        }

        function updateTextStyle() {
            const fontSize = elements.textSizeSlider.value;
            const fontStyle = elements.textStyleSelect.value;
            const isEmoji = elements.emojiSetSelect.value !== 'none' || elements.characterSetSelect.value === 'emoticons' || elements.characterSetSelect.value === 'developerIcons';
            elements.ctx.font = `${fontStyle} ${fontSize}px ${isEmoji ? 'sans-serif' : 'monospace'}`;
            console.log('Updating Text Style:', elements.ctx.font);
            if (isRunning) {
                processFrame();
            }
        }

        function updateTextColor() {
            console.log('Updating Text Color:', elements.textColorInput.value);
            if (isRunning) {
                processFrame();
            }
        }

        function updateBackgroundColor() {
            console.log('Updating Background Color:', elements.backgroundColorInput.value);
            elements.canvas.style.backgroundColor = elements.backgroundColorInput.value;
        }

        function getSelectedColorMode() {
            for (const radio of elements.colorModeRadios) {
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
                elements.video.srcObject = stream;
                elements.video.play();
                isRunning = true;
                elements.startButton.textContent = 'Stop ASCII cam';
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
            elements.startButton.textContent = 'Start ASCII cam';
            elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            elements.video.srcObject = null;
        }

        function processFrame(currentTime) {
            if (!isRunning) return;

            if (currentTime - lastFrameTime < frameInterval) {
                requestAnimationFrame(processFrame);
                return;
            }

            lastFrameTime = currentTime;

            elements.ctx.drawImage(elements.video, 0, 0, ASCII_WIDTH, ASCII_HEIGHT);
            const imageData = elements.ctx.getImageData(0, 0, ASCII_WIDTH, ASCII_HEIGHT);
            applyFilter(imageData);
            const asciiFrame = convertToASCII(imageData);
            
            elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            const colorMode = getSelectedColorMode();
            const pixelSize = parseInt(elements.pixelSizeSlider.value);
            const textSize = parseInt(elements.textSizeSlider.value);
            const isEmojiMode = elements.emojiSetSelect.value !== 'none' || elements.characterSetSelect.value === 'emoticons' || elements.characterSetSelect.value === 'developerIcons';
            
            elements.ctx.font = `${elements.textStyleSelect.value} ${textSize}px ${isEmojiMode ? 'sans-serif' : 'monospace'}`;
            elements.ctx.textBaseline = 'top';

            for (let y = 0; y < ASCII_HEIGHT; y++) {
                for (let x = 0; x < ASCII_WIDTH; x++) {
                    const { char, color } = asciiFrame[y][x];
                    if (isEmojiMode) {
                        elements.ctx.globalAlpha = 0.5; // Increased transparency for emojis and special characters
                        elements.ctx.fillStyle = getColor(color, colorMode);
                        elements.ctx.fillText(char, x * pixelSize, y * pixelSize);
                        elements.ctx.globalAlpha = 1.0; // Reset transparency for non-emoji characters
                    } else {
                        elements.ctx.fillStyle = getColor(color, colorMode);
                        elements.ctx.fillText(char, x * pixelSize, y * pixelSize);
                    }
                }
            }

            requestAnimationFrame(processFrame);
        }

        function getColor(color, colorMode) {
            switch (colorMode) {
                case 'green':
                    return elements.textColorInput.value;
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

        function applyFilter(imageData) {
            const filter = elements.filterSelect.value;
            const data = imageData.data;
            
            switch (filter) {
                case 'invert':
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = 255 - data[i];         // Red
                        data[i + 1] = 255 - data[i + 1]; // Green
                        data[i + 2] = 255 - data[i + 2]; // Blue
                    }
                    break;
                case 'sepia':
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                    }
                    break;
                case 'grayscale':
                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        data[i] = data[i + 1] = data[i + 2] = avg;
                    }
                    break;
                default:
                    // No filter applied
                    break;
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
            snapshotCanvas.width = elements.canvas.width;
            snapshotCanvas.height = elements.canvas.height;
            const snapshotCtx = snapshotCanvas.getContext('2d');
            snapshotCtx.drawImage(elements.canvas, 0, 0);

            const link = document.createElement('a');
            link.download = 'ascii_snapshot.png';
            link.href = snapshotCanvas.toDataURL('image/png');
            link.click();
        }

        // Add background animation
        function addBackgroundAnimation() {
            const backgroundContainer = document.querySelector('.background-animation');
            const cameraIcons = ['📷', '📸', '🎥', '📹', '📽️', '🎬'];
            const numIcons = 20;

            for (let i = 0; i < numIcons; i++) {
                const icon = document.createElement('div');
                icon.className = 'camera-icon';
                icon.textContent = cameraIcons[Math.floor(Math.random() * cameraIcons.length)];
                icon.style.left = `${Math.random() * 100}vw`;
                icon.style.top = `${Math.random() * 100}vh`;
                icon.style.animationDelay = `${Math.random() * 5}s`;
                backgroundContainer.appendChild(icon);
            }
        }

        // Call the function to add background animation
        addBackgroundAnimation();
    });
} catch (error) {
    console.error('An error occurred during initialization:', error);
}
