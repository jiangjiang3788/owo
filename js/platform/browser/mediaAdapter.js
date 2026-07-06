// js/platform/browser/mediaAdapter.js
// V31 browser media adapter: camera stream, frame capture, and vibration primitives.
(function registerMediaAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.browser) {
        throw new Error('[mediaAdapter] OwoApp.platform.browser namespace is required');
    }

    async function startUserCamera(options = {}) {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            throw new Error('当前浏览器不支持摄像头访问');
        }
        const facingMode = options.facingMode || 'user';
        const width = options.width || 480;
        const height = options.height || 640;
        return navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: width }, height: { ideal: height } },
            audio: false
        });
    }

    function stopStream(stream) {
        if (!stream || typeof stream.getTracks !== 'function') return;
        stream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) {}
        });
    }

    function attachStreamToVideo(video, stream) {
        if (!video) return;
        video.srcObject = stream || null;
    }

    function captureVideoFrame(video, canvas, options = {}) {
        if (!video || !canvas || video.readyState < 2) return null;
        const maxWidth = options.maxWidth || 480;
        const scale = Math.min(maxWidth / video.videoWidth, 1);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL(options.mimeType || 'image/jpeg', options.quality == null ? 0.6 : options.quality);
    }

    function nextFacingMode(current) {
        return current === 'user' ? 'environment' : 'user';
    }

    function applyFacingClass(element, facingMode) {
        if (!element || !element.classList) return;
        if (facingMode === 'environment') element.classList.add('rear-camera');
        else element.classList.remove('rear-camera');
    }

    function vibrate(pattern) {
        if (typeof navigator.vibrate !== 'function') return false;
        try {
            navigator.vibrate(pattern);
            return true;
        } catch (e) {
            return false;
        }
    }

    app.platform.browser.mediaAdapter = {
        startUserCamera,
        stopStream,
        attachStreamToVideo,
        captureVideoFrame,
        nextFacingMode,
        applyFacingClass,
        vibrate
    };
})(window);
