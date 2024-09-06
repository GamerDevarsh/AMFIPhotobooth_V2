async function startWebcam() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = stream;

        // Set canvas size to 960px x 1680px
        canvas.width = 960;
        canvas.height = 1680;

        // Ensure video is properly resized
        video.addEventListener('loadedmetadata', () => {
            video.width = video.videoWidth;
            video.height = video.videoHeight;
        });

        // Continuously draw video frame to canvas
        function draw() {
            if (video.readyState >= 2) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();

                // Calculate aspect ratio
                const videoAspect = video.videoWidth / video.videoHeight;
                const canvasAspect = canvas.width / canvas.height;
                let drawWidth, drawHeight;


                drawHeight = canvas.height;
                drawWidth = drawHeight * videoAspect;


                // Center the video on the canvas
                const offsetX = (canvas.width - drawWidth) / 2;
                const offsetY = (canvas.height - drawHeight) / 2;

                // Apply rotation and draw the video
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(90 * Math.PI / 180); // Rotate 90 degrees
                ctx.scale(1, -1);
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

startWebcam();