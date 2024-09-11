document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const asciiCanvas = document.getElementById('asciiCanvas');
    const ctx = asciiCanvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const saveSnapshotButton = document.getElementById('saveSnapshotButton');
    const resetButton = document.getElementById('resetButton');
    const errorMessage = document.createElement('div');
    errorMessage.style.color = 'red';
    errorMessage.style.marginTop = '10px';
    document.querySelector('.video-container').appendChild(errorMessage);

    let isRunning = false;
    let animationFrameId;

    // ... (previous code for customization options)

    function startASCIICam() {
        console.log('Starting ASCII cam...');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            displayError('Your browser does not support webcam access. Please try using a modern browser like Chrome, Firefox, or Edge.');
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                console.log('Webcam access granted');
                video.srcObject = stream;
                video.play();
                isRunning = true;
                startButton.textContent = 'Stop ASCII cam';
                errorMessage.textContent = '';
                animateASCII();
            })
            .catch(err => {
                console.error('Error accessing webcam:', err);
                let errorMsg = 'Error accessing webcam: ';
                switch (err.name) {
                    case 'NotAllowedError':
                        errorMsg += 'Permission denied. Please grant camera permissions and try again.';
                        break;
                    case 'NotFoundError':
                        errorMsg += 'No camera found. Please make sure your device has a working camera.';
                        break;
                    case 'NotReadableError':
                        errorMsg += 'Camera is already in use by another application. Please close other apps using the camera and try again.';
                        break;
                    default:
                        errorMsg += err.message;
                }
                displayError(errorMsg);
                startButton.textContent = 'Start ASCII cam';
            });
    }

    function stopASCIICam() {
        console.log('Stopping ASCII cam...');
        if (video.srcObject) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
        isRunning = false;
        startButton.textContent = 'Start ASCII cam';
        cancelAnimationFrame(animationFrameId);
        errorMessage.textContent = '';
    }

    function displayError(message) {
        errorMessage.textContent = message;
        console.error(message);
    }

    startButton.addEventListener('click', () => {
        if (isRunning) {
            stopASCIICam();
        } else {
            startASCIICam();
        }
    });

    // ... (rest of the code remains unchanged)

    function animateASCII() {
        if (!isRunning) return;

        ctx.drawImage(video, 0, 0, asciiCanvas.width, asciiCanvas.height);
        const imageData = ctx.getImageData(0, 0, asciiCanvas.width, asciiCanvas.height);
        applyImageAdjustments(imageData);
        const asciiOutput = convertToASCII(imageData);
        renderASCII(asciiOutput);

        animationFrameId = requestAnimationFrame(animateASCII);
    }

    // ... (rest of the code remains unchanged)
});
