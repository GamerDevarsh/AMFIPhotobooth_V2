// Base URLs
const BASEURL = 'https://api.bharatniveshyatra.com';
const MACURL = 'https://192.168.1.158:5001/api/bny/mac-address';
const PROCESSIMGURL = 'https://api.photobooth.bharatniveshyatra.com/process-image';

// Face recognition logic 
let model;
let stopDetection = false;
let lastRequestTime = 0;
let isProcessing = false;
const requestDelay = 20000;
let isTesting = false;

// Photobooth logic
let isCapturing = false;
let selectedOverlayId = 0;
let macAddress = null;

const ovlayButton = document.getElementById('showOverlayButton');
const captureButton = document.getElementById('captureButton');
document.getElementById('introOverlay').style.display = 'flex';

const ASPECT_RATIO = 16 / 9; // Set your desired aspect ratio here

async function startWebcam() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const overlay = document.getElementById("overlay");
    const ctx = canvas.getContext('2d');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                height: { min: 720, ideal: 2160, max: 2160 },
                width: { min: 1280, ideal: 3840, max: 4096 },
                facingMode: 'environment'
            }
        });

        video.srcObject = stream;

        video.addEventListener('loadedmetadata', () => {
            video.play(); // Start playing the video
            resizeCanvasAndVideo(); // Resize canvas and video on load
        });

        window.addEventListener('resize', resizeCanvasAndVideo); // Adjust on window resize

        function draw() {
            if (video.readyState >= 2) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();

                const videoAspect = video.videoWidth / video.videoHeight;
                const canvasAspect = canvas.width / canvas.height;
                let drawWidth, drawHeight;

                if (videoAspect > canvasAspect) {
                    drawWidth = canvas.height * videoAspect;
                    drawHeight = canvas.height;
                } else {
                    drawWidth = canvas.width;
                    drawHeight = canvas.width / videoAspect;
                }
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.drawImage(video, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();
            }
            requestAnimationFrame(draw);
        }
        draw();
        startIdleTimer();
    } catch (err) {
        console.error('Error accessing webcam: ', err);
    }
}

function resizeCanvasAndVideo() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const overlay = document.getElementById('overlay');

    // Get the available width and height of the window
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Calculate the new dimensions based on the aspect ratio
    let newWidth, newHeight;

    if (screenWidth / screenHeight > ASPECT_RATIO) {
        newHeight = screenHeight;
        newWidth = newHeight * ASPECT_RATIO;
    } else {
        newWidth = screenWidth;
        newHeight = newWidth / ASPECT_RATIO;
    }

    // Set the dimensions of the canvas, video, and overlay
    canvas.width = newWidth;
    canvas.height = newHeight;
    video.width = newWidth;
    video.height = newHeight;
    overlay.width = newWidth; // Ensure overlay is the same size
    overlay.height = newHeight; // Ensure overlay is the same size
}

async function startCapture() {
    const overlaySelection = document.getElementById('overlaySelection');

    if (overlaySelection.style.display === 'flex') {
        toggleOverlaySelection();
    }

    if (isCapturing) return;
    isCapturing = true;

    try {
        if (isTesting) {
            macAddress = '0c:7a:15:e9:f2:dc';
        } else {
            macAddress = '0c:7a:15:e9:f2:dc'; //await getMacAddress();
        }

        if (!macAddress) {
            throw new Error('MAC address not available');
        }

        const countdownElement = document.getElementById('countdown');
        const captureButton = document.getElementById('captureButton');

        let countdown;
        if (isTesting) {
            countdown = 0;
        } else {
            countdown = 0;
        }

        captureButton.disabled = true;
        ovlayButton.disabled = true;

        const countdownInterval = setInterval(() => {
            countdownElement.style.display = 'block';
            countdownElement.textContent = countdown;
            countdown--;
            if (countdown < 0) {
                clearInterval(countdownInterval);
                captureImage();
                countdownElement.style.display = 'none';
            }
        }, 1000);
    } catch (error) {
        console.error('Error during MAC address request:', error);
        isCapturing = false;
        alert('Failed to retrieve MAC address. Please try again.');
    }
}

function captureImage() {
    document.getElementById('loader').style.display = 'block';
    document.body.classList.add('loading');

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const video = document.getElementById('webcam');
    const overlay = document.getElementById('overlay');

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const canvasWidth = 720;
    const canvasHeight = 1016;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;
    let drawWidth, drawHeight;

    if (videoAspect > canvasAspect) {
        drawWidth = canvasHeight * videoAspect;
        drawHeight = canvasHeight;
    } else {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / videoAspect;
    }

    // Video feed
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(0);
    ctx.scale(1, 1);
    ctx.drawImage(video, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Overlay image
    drawWidth = 720;
    drawHeight = 1016;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.drawImage(overlay, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    const image = canvas.toDataURL('image/jpeg');

    if (isTesting) {
        document.getElementById('capturedImage').src = image;
        document.getElementById('modal').style.display = 'flex';
        document.getElementById('modal').style.flexDirection = 'column';
        document.getElementById('loader').style.display = 'none';
        document.body.classList.remove('loading');
        captureButton.disabled = false;
        ovlayButton.disabled = false;
        isCapturing = false;
    } else {
        postImageData(image);
    }
}

async function getMacAddress() {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', MACURL, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onload = () => {
            if (xhr.status == 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.macAddress);
                } catch (error) {
                    reject('Error parsing MAC address response');
                }
            } else {
                reject('Error fetching MAC address');
            }
        };
        xhr.onerror = () => reject('Error fetching MAC address');
        xhr.send();
    });
}

async function postImageData(base64Image) {
    const byteString = atob(base64Image.split(',')[1]);
    const byteArray = new Uint8Array(byteString.length);

    for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([byteArray], { type: 'image/png' });
    const file = new File([blob], 'filename.png', { type: 'image/png' });

    let formData = new FormData();
    formData.append('person_image', file);

    await fetch(PROCESSIMGURL, {
        method: 'POST',
        body: formData,
    })
        .then(rawResponse => rawResponse.json())
        .then(jsonResponse => {
            console.log('jsonResponse', jsonResponse);

            const base64Image = jsonResponse.output_image;

            const base64Data = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');

            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const imageBlob = new Blob([byteArray], { type: 'image/png' });

            const imageUrl = URL.createObjectURL(imageBlob);

            document.getElementById('capturedImage').src = imageUrl;
            document.getElementById('modal').style.display = 'flex';
            document.getElementById('modal').style.flexDirection = 'column';
            document.getElementById('loader').style.display = 'none';
            document.body.classList.remove('loading');
            captureButton.disabled = false;
            ovlayButton.disabled = false;
            isCapturing = false;
        })
        .catch(error => {
            console.error('Error posting image:', error);
            captureButton.disabled = false;
            ovlayButton.disabled = false;
            isCapturing = false;
            document.getElementById('loader').style.display = 'none';
            document.body.classList.remove('loading');
        });
}

document.getElementById('closeButton').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
});

document.getElementById('shareButton').addEventListener('click', () => {
    const shareButton = document.getElementById('shareButton');
    const imageDataUrl = document.getElementById('capturedImage').src;

    shareButton.disabled = true;
    shareButton.textContent = 'Sharing...';

    document.getElementById('loader').style.display = 'block';
    document.body.classList.add('loading');

    const hiddenCanvas = document.createElement('canvas');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    const image = new Image();

    image.onload = () => {
        hiddenCanvas.width = image.width;
        hiddenCanvas.height = image.height;

        hiddenCtx.save();
        hiddenCtx.translate(hiddenCanvas.width / 2, hiddenCanvas.height / 2);
        hiddenCtx.drawImage(image, -image.width / 2, -image.height / 2);
        hiddenCtx.restore();

        hiddenCanvas.toBlob(blob => {
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');
            formData.append('mascot', selectedOverlayId);
            formData.append('macAddress', macAddress);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', BASEURL + '/api/generate-qr', true);
            xhr.setRequestHeader('Accept', 'application/json');

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);
                    const qrCodeUrl = response.qrImageUrl;

                    document.getElementById('qrCodeImage').src = qrCodeUrl;
                    document.getElementById('qrModal').style.display = 'flex';
                } else {
                    console.error('Error uploading image:', xhr.statusText);
                    alert('Error during upload. Please try again.');
                }
                shareButton.disabled = false;
                shareButton.textContent = 'Share';
                document.getElementById('loader').style.display = 'none';
                document.body.classList.remove('loading');
            };

            xhr.onerror = () => {
                console.error('Error uploading image:', xhr.statusText);
                alert('Error during upload. Please try again.');
                shareButton.disabled = false;
                shareButton.textContent = 'Share';
                document.getElementById('loader').style.display = 'none';
                document.body.classList.remove('loading');
            };

            xhr.send(formData);
        }, 'image/jpeg');
    };

    image.src = imageDataUrl;
});

function dataURLtoBlob(dataURL) {
    const [header, data] = dataURL.split(',');
    const mime = header.split(':')[1].split(';')[0];
    const byteString = atob(data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }

    return new Blob([arrayBuffer], { type: mime });
}

document.getElementById('closeQrButton').addEventListener('click', () => {
    document.getElementById('qrModal').style.display = 'none';
    document.getElementById('thankYouPopup').style.display = 'flex';
});

function handleOverlaySelection() {
    const overlays = document.querySelectorAll('.overlayOption');
    const overlayElement = document.getElementById('overlay');

    overlays.forEach(overlay => {
        overlay.addEventListener('click', () => {
            if (isCapturing) return;

            overlays.forEach(o => o.classList.remove('selected'));
            overlay.classList.add('selected');
            const selectedOverlaySrc = overlay.getAttribute('data-overlay');
            overlayElement.src = selectedOverlaySrc;

            selectedOverlayId = overlay.getAttribute('data-id');
        });
    });
}

function toggleOverlaySelection() {
    if (isCapturing) return;

    const overlaySelection = document.getElementById('overlaySelection');
    const showOverlayButton = document.getElementById('showOverlayButton');

    if (overlaySelection.style.display === 'flex') {
        overlaySelection.style.display = 'none';
        showOverlayButton.textContent = 'Show Selections';
    } else {
        overlaySelection.style.display = 'flex';
        showOverlayButton.textContent = 'Hide Selections';
    }
}

// Interaction timeout logic
let idleTimeout;
const idleDuration = 180000; // Idle time in milliseconds (e.g., 3 minutes)

function resetIdleTimer() {
    // Clear the previous timeout
    clearTimeout(idleTimeout);

    idleTimeout = setTimeout(() => {
        location.reload();
    }, idleDuration);
}

function startIdleTimer() {
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('mousedown', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);

    resetIdleTimer();
}

function redirectOnFinish() {
    location.reload();
}

document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('introOverlay').style.display = 'none';
    document.getElementById('container').style.display = 'block';
});

document.getElementById('closeThankYouButton').addEventListener('click', () => {
    document.getElementById('thankYouPopup').style.display = 'none';
    redirectOnFinish();
});

document.getElementById('container').style.display = 'none';

document.getElementById('captureButton').addEventListener('click', startCapture);
document.getElementById('showOverlayButton').addEventListener('click', toggleOverlaySelection);

startWebcam();
handleOverlaySelection();
