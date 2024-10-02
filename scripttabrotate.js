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

    // Function to set dimensions based on the viewport
    function setDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate new dimensions based on the aspect ratio
        let newWidth, newHeight;

        if (viewportWidth / viewportHeight > ASPECT_RATIO) {
            newHeight = viewportHeight;
            newWidth = newHeight * ASPECT_RATIO;
        } else {
            newWidth = viewportWidth;
            newHeight = newWidth / ASPECT_RATIO;
        }

        // Set dimensions of video and canvas
        video.width = newWidth;
        video.height = newHeight;
        canvas.width = newWidth;
        canvas.height = newHeight;
        overlay.style.width = `${newWidth}px`;
        overlay.style.height = `${newHeight}px`;
    }

    // Set dimensions initially
    setDimensions();

    // Listen for window resize
    window.addEventListener('resize', setDimensions);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                height: { min: 720, ideal: 3840, max: 4096 },
                width: { min: 1280, ideal: 2160, max: 2160 },
                facingMode: 'environment'
            }
        });

        video.srcObject = stream;

        video.addEventListener('loadedmetadata', () => {
            video.play();
            setDimensions(); // Adjust dimensions on load
        });

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

// Start capturing function
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

        let countdown = isTesting ? 0 : 0; // Set countdown based on testing status

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

// Capture image function
function captureImage() {
    document.getElementById('loader').style.display = 'block';
    document.body.classList.add('loading');

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const video = document.getElementById('webcam');
    const overlay = document.getElementById('overlay');

    // Set canvas size to capture image
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw video feed
    ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

    // Draw overlay
    ctx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight);

    const image = canvas.toDataURL('image/jpeg');

    if (isTesting) {
        document.getElementById('capturedImage').src = image;
        document.getElementById('modal').style.display = 'flex';
        document.getElementById('loader').style.display = 'none';
        document.body.classList.remove('loading');
        captureButton.disabled = false;
        ovlayButton.disabled = false;
        isCapturing = false;
    } else {
        postImageData(image);
    }
}

// Get MAC Address function
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

// Post image data function
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

// Event listeners
document.getElementById('closeButton').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
});

document.getElementById('shareButton').addEventListener('click', () => {
    const imageSrc = document.getElementById('capturedImage').src;
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = 'captured_image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Start dimensions adjustment and webcam on page load
window.addEventListener('load', startWebcam);
