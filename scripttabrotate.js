﻿<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMFI Photobooth</title>
    <link rel="stylesheet" href="stylestabrotate.css">
</head>

<body>
    <div id="loader" class="loader" style="display: none;"></div>
    
    <div id="introOverlay" class="modal">
        <div id="introContent" >
            <h1>Capture the moment with your favourite cricketer.</h1>
            <p>Scan the QR code to keep the memory.</p>
            <button id="startButton" class="button">Start Experience</button>
        </div>
    </div>
    <div id="thankYouPopup" class="modal">
        <div id="thankYouContent" >
            <h2>Thank You!</h2>
            <p>We hope you enjoyed the experience. Have a great day!</p>
            <button id="closeThankYouButton" class="button">Close</button>
        </div>
    </div>
    <div id="container">
        <video id="webcam" autoplay playsinline></video>
        <canvas id="canvas"></canvas>
        <img id="overlay" src="../Photos/Sachintab.png" alt="Overlay Image" /><!--Sachin.png-->
        <div id="countdown" ></div>
        <div>
            <div id="overlaySelection"  style="display: flex;">
                <img class="overlayOption selected" src="../Photos/Sachintab.png" data-overlay="../Photos/Sachintab.png" data-id="0"
                     alt="Overlay 1"><!--Sachin.png-->
                <img id="1" class="overlayOption" src="../Photos/Rohittab.png" data-overlay="../Photos/Rohittab.png" data-id="1"
                     alt="Overlay 2"><!--RohitovlayImg-->
                <img id="2" class="overlayOption" src="../Photos/Dhonitab.png" data-overlay="../Photos/Dhonitab.png" data-id="2"
                     alt="Overlay 3"><!--DhoniovlayImg-->
            </div>

            <div id="buttonContainer" >
                <button id="showOverlayButton" class="button">Hide Selections</button>
                <button id="captureButton" class="button">Start Capture</button>
            </div>
        </div>

    </div>

    <div id="modal">
        <img id="capturedImage" src="" alt="Captured Image" />
        <div class="modal-btn-container ">

            <button id="closeButton">Recapture</button>
            <button id="shareButton">Share</button>
        </div>
    </div>

    <div id="qrModal" class="modal" style="display: none;">
        <div id="qrModalContent" >
            <h2>Scan to download image!</h2>
            <img id="qrCodeImage" src="" alt="QR Code" />
            <button id="closeQrButton">Close</button>
        </div>
    </div>
    <script src="scripttabrotate.js"></script>
</body>

</html>
