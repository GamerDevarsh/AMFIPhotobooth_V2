let isCapturing = false;
let selectedOverlayId = 0;
let macAddress = null;
const ovlayButton = document.getElementById('showOverlayButton');

const BASEURL = 'https://api.cactusxpo.com'; //https://192.168.1.158:5000';
const MACURL = 'https://192.168.1.158:5001/api/bny/mac-address';

async function startWebcam() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const overlay = document.getElementById("overlay");
    const ctx = canvas.getContext('2d');
    const threshold = 200;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1440 }, height: { ideal: 2560 }, facingMode: 'environment' }
        });
        video.srcObject = stream;

        canvas.width = 2560;
        canvas.height = 1440;

        video.addEventListener('loadedmetadata', () => {
            video.width = video.videoWidth;
            video.height = video.videoHeight;
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
                ctx.scale(1, 1);

                ctx.drawImage(video, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

                ctx.restore();
            }
            requestAnimationFrame(draw);
        }
        draw();
    } catch (err) {
        console.error('Error accessing webcam: ', err);
    }
}

async function startCapture() {
    const overlaySelection = document.getElementById('overlaySelection');

    if (overlaySelection.style.display === 'flex') {
        toggleOverlaySelection();
    }

    if (isCapturing) return;
    isCapturing = true;

    try {
        // Request the MAC address before proceeding
        macAddress = await getMacAddress();

        if (!macAddress) {
            throw new Error('MAC address not available');
        }

        const countdownElement = document.getElementById('countdown');
        const modal = document.getElementById('modal');
        const capturedImage = document.getElementById('capturedImage');
        const canvas = document.getElementById('canvas');
        const overlay = document.getElementById('overlay');
        const captureButton = document.getElementById('captureButton');

        let countdown = 15;
        //let countdown = 1;
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
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const video = document.getElementById('webcam');
    const overlay = document.getElementById('overlay');

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const canvasWidth = 1920;
    const canvasHeight = 1080;

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
    drawWidth = 1080;
    drawHeight = 1920;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(90 * Math.PI / -180);
    ctx.drawImage(overlay, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    const image = canvas.toDataURL('image/jpeg');
    document.getElementById('capturedImage').src = image;
    document.getElementById('modal').style.display = 'flex';

    const captureButton = document.getElementById('captureButton');
    captureButton.disabled = false;
    ovlayButton.disabled = false;
    isCapturing = false;
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
                    console.log(response);
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

        hiddenCanvas.width = image.height;
        hiddenCanvas.height = image.width;


        hiddenCtx.save();
        hiddenCtx.translate(hiddenCanvas.width / 2, hiddenCanvas.height / 2);
        hiddenCtx.rotate(90 * Math.PI / 180); // Rotate -90 degrees
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

document.getElementById('printButton').addEventListener('click', () => {
    const imageUrl = capturedImage.src;

    document.getElementById('thankYouPopup').style.display = 'flex';

    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
                        <html>
                            <head>
                                <title>Print Captured Image</title>
                                <style>
                                    @media print {
                                        body {
                                            margin: 0;
                                            padding: 0;
                                            display: flex;
                                            justify-content: center;
                                            align-items: center;
                                            height: 100vh;
                                        }
                                        img {
                                            width: auto;
                                            height: 55vh;
                                            page-break-before: avoid;
                                            display: block;
                                            transform: rotate(90deg);
                                        }
                                    }
                                    @page {
                                        size: auto;
                                        margin: 0mm;
                                    }
                                </style>
                            </head>
                            <body>
                                <img src="${imageUrl}" alt="Captured Image" />
                            </body>
                        </html>
                    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
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

document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('introOverlay').style.display = 'none';
    document.getElementById('container').style.display = 'block';
    startWebcam();
});

document.getElementById('closeThankYouButton').addEventListener('click', () => {
    document.getElementById('thankYouPopup').style.display = 'none';
});

document.getElementById('container').style.display = 'none';

document.getElementById('captureButton').addEventListener('click', startCapture);
document.getElementById('showOverlayButton').addEventListener('click', toggleOverlaySelection);

startWebcam();
handleOverlaySelection();