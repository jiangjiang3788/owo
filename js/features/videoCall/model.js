// js/features/videoCall/model.js
// V31 video call state model. No DOM, no fetch, no storage writes.
(function registerVideoCallModel(global) {
    const app = global.OwoApp;
    if (!app || !app.features) {
        throw new Error('[videoCall/model] OwoApp.features namespace is required');
    }
    app.features.videoCall = app.features.videoCall || {};

    function createInitialState() {
        return {
            isCallActive: false,
            callType: 'video',
            timerInterval: null,
            seconds: 0,
            currentChat: null,
            currentCallContext: [],
            startTime: 0,
            isAiSpeaking: false,
            isGenerating: false,
            initialAiResponse: null,
            incomingChat: null,
            isMinimized: false,
            hasEnteredCallScene: false,
            ringAudio: null,
            cameraStream: null,
            facingMode: 'user',
            realCameraActive: false
        };
    }

    function normalizeCallType(type) {
        return type === 'voice' ? 'voice' : 'video';
    }

    function setCameraStream(state, stream) {
        state.cameraStream = stream || null;
        state.realCameraActive = !!stream;
        return state;
    }

    function resetCameraState(state) {
        state.cameraStream = null;
        state.realCameraActive = false;
        state.facingMode = 'user';
        return state;
    }

    function toggleFacingMode(state) {
        state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
        return state.facingMode;
    }

    function formatDuration(seconds) {
        const safeSeconds = Math.max(0, Number(seconds) || 0);
        const m = Math.floor(safeSeconds / 60);
        const s = safeSeconds % 60;
        if (m === 0) return `${s}秒`;
        return `${m}分${s}秒`;
    }

    function getRoutingReport() {
        return {
            owner: 'OwoApp.features.videoCall.model',
            stateOwner: 'features/videoCall/model.js',
            mediaOwner: 'OwoApp.platform.browser.mediaAdapter',
            audioOwner: 'OwoApp.platform.browser.audioAdapter',
            legacyShell: 'js/modules/video_call.js'
        };
    }

    app.features.videoCall.model = {
        createInitialState,
        normalizeCallType,
        setCameraStream,
        resetCameraState,
        toggleFacingMode,
        formatDuration,
        getRoutingReport
    };
})(window);
