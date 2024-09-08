const video = document.getElementById('video');
const canvas = document.getElementById('asciiCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const inputInfo = document.getElementById('input');
const asciiDensitySlider = document.getElementById('asciiDensity');
const characterSetSelect = document.getElementById('characterSet');

const CHARACTER_SETS = {
    standard: ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'],
    simple: ['#', '.'],
    complex: ['$', '@', 'B', '%', '8', '&', 'W', 'M', '#', '*', 'o', 'a', 'h', 'k', 'b', 'd', 'p', 'q', 'w', 'm', 'Z', 'O', '0', 'Q', 'L', 'C', 'J', 'U', 'Y', 'X', 'z', 'c', 'v', 'u', 'n', 'x', 'r', 'j', 'f', 't', '/', '\\', '|', '(', ')', '1', '{', '}', '[', ']', '?', '-', '_', '+', '~', '<', '>', 'i', '!', 'l', 'I', ';', ':', ',', '"', '^', '`', '\'', '.']
};

let ASCII_CHARS = CHARACTER_SETS.standard;
let ASCII_WIDTH = 80;
let ASCII_HEIGHT = 60;

let isRunning = false;
let stream = null;

canvas.width = ASCII_WIDTH * 10;
canvas.height = ASCII_HEIGHT * 10;
ctx.font = '10px monospace';
ctx.fillStyle = '#00ff00';

startButton.addEventListener('click', toggleASCIICam);
asciiDensitySlider.addEventListener('input', updateASCIIDensity);
characterSetSelect.addEventListener('change', updateCharacterSet);

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
    if (isRunning) {
        processFrame();
    }
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
        updateInputInfo();
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
    inputInfo.textContent = 'No input';
}

function processFrame() {
    if (!isRunning) return;

    ctx.drawImage(video, 0, 0, ASCII_WIDTH, ASCII_HEIGHT);
    const imageData = ctx.getImageData(0, 0, ASCII_WIDTH, ASCII_HEIGHT);
    const asciiFrame = convertToASCII(imageData);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ASCII_HEIGHT; y++) {
        for (let x = 0; x < ASCII_WIDTH; x++) {
            ctx.fillText(asciiFrame[y][x], x * 10, y * 10);
        }
    }

    requestAnimationFrame(processFrame);
}

function convertToASCII(imageData) {
    const asciiFrame = [];
    for (let y = 0; y < ASCII_HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < ASCII_WIDTH; x++) {
            const index = (y * ASCII_WIDTH + x) * 4;
            const avg = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
            const charIndex = Math.floor(avg / 255 * (ASCII_CHARS.length - 1));
            row.push(ASCII_CHARS[charIndex]);
        }
        asciiFrame.push(row);
    }
    return asciiFrame;
}

function updateInputInfo() {
    if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        inputInfo.textContent = `${settings.width}x${settings.height} @ ${settings.frameRate}fps`;
    } else {
        inputInfo.textContent = 'No input';
    }
}
