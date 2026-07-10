// js/platform/browser/audioAdapter.js
// V31 browser audio adapter: only wraps Audio playback primitives. No TTS provider logic.
(function registerAudioAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.browser) {
        throw new Error('[audioAdapter] OwoApp.platform.browser namespace is required');
    }

    const SILENT_MP3_DATA_URL = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAAA8UxhdmM1OC4xMzQAAAAAAAAAAAAAAAAkAAAAAAAAAAOEaGMGmgAAAAAAAAAAAAAAAAAAAAD/+xDEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';

    function createAudioElement(src, options = {}) {
        const audio = new Audio();
        if (options.preload) audio.preload = options.preload;
        if (typeof options.loop === 'boolean') audio.loop = options.loop;
        if (typeof options.volume === 'number') audio.volume = options.volume;
        if (src) audio.src = src;
        return audio;
    }

    function stopAudio(audio, options = {}) {
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
            if (options.clearSrc) {
                audio.src = '';
                if (typeof audio.load === 'function') audio.load();
            }
        } catch (e) {}
    }

    function playAudio(audio) {
        if (!audio || typeof audio.play !== 'function') {
            return Promise.reject(new Error('无可播放音频'));
        }
        return audio.play();
    }

    async function activateSilentAudio() {
        const silentAudio = createAudioElement(SILENT_MP3_DATA_URL, { volume: 0.01 });
        await playAudio(silentAudio);
        stopAudio(silentAudio, { clearSrc: true });
        return true;
    }

    function createLoopingAudio(src, options = {}) {
        const audio = createAudioElement(src, {
            preload: options.preload || 'auto',
            loop: true,
            volume: typeof options.volume === 'number' ? options.volume : 1
        });

        audio.addEventListener('canplaythrough', () => {
            if (typeof options.shouldPlay === 'function' && !options.shouldPlay(audio)) return;
            playAudio(audio).catch(() => {});
        }, { once: true });

        audio.addEventListener('ended', () => {
            if (typeof options.shouldPlay === 'function' && !options.shouldPlay(audio)) return;
            try {
                audio.currentTime = 0;
                playAudio(audio).catch(() => {});
            } catch (e) {}
        });

        audio.addEventListener('error', () => {
            if (typeof options.onError === 'function') options.onError(audio);
        });

        if (typeof audio.load === 'function') audio.load();
        return audio;
    }

    function playUrl(audioUrl, handlers = {}) {
        return new Promise((resolve, reject) => {
            try {
                const audio = createAudioElement(audioUrl);
                audio.onended = () => {
                    if (typeof handlers.onended === 'function') handlers.onended(audio);
                    resolve(audio);
                };
                audio.onerror = () => {
                    if (typeof handlers.onerror === 'function') handlers.onerror(audio);
                    reject(new Error('音频播放失败'));
                };
                if (typeof handlers.onready === 'function') handlers.onready(audio);
                playAudio(audio).catch(reject);
            } catch (err) {
                reject(err);
            }
        });
    }

    app.platform.browser.audioAdapter = {
        createAudioElement,
        stopAudio,
        playAudio,
        activateSilentAudio,
        createLoopingAudio,
        playUrl
    };
})(window);
