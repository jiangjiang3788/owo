// --- platform/browser/fileAdapter.js ---
// V8 浏览器文件适配层：只封装 Blob/File/下载/压缩流等浏览器能力。
(function registerBrowserFileAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.browser) {
        throw new Error('js/app/namespace.js 必须在 platform/browser/fileAdapter.js 之前加载');
    }

    function assertCompressionStream(kind) {
        const ctorName = kind === 'decompress' ? 'DecompressionStream' : 'CompressionStream';
        if (typeof global[ctorName] !== 'function') {
            throw new Error(ctorName + ' 不可用，当前浏览器不支持 .ee gzip 备份格式');
        }
        return global[ctorName];
    }

    async function createGzipJsonBlob(data) {
        const CompressionCtor = assertCompressionStream('compress');
        const jsonString = JSON.stringify(data);
        const dataBlob = new Blob([jsonString]);
        const compressedStream = dataBlob.stream().pipeThrough(new CompressionCtor('gzip'));
        return new Response(compressedStream, {
            headers: { 'Content-Type': 'application/octet-stream' }
        }).blob();
    }

    async function parseGzipJsonBlob(blob) {
        const DecompressionCtor = assertCompressionStream('decompress');
        const decompressedStream = blob.stream().pipeThrough(new DecompressionCtor('gzip'));
        const jsonString = await new Response(decompressedStream).text();
        return JSON.parse(jsonString);
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function downloadCompressedJson(data, filename) {
        const compressedBlob = await createGzipJsonBlob(data);
        downloadBlob(compressedBlob, filename);
        return compressedBlob;
    }

    async function readCompressedJsonFile(file) {
        if (!file) throw new Error('未选择文件');
        return parseGzipJsonBlob(file);
    }

    async function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = String(reader.result || '');
                const base64 = (result.split(',')[1] || '').replace(/\s/g, '');
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function base64ToBlob(base64Content, type) {
        const clean = String(base64Content || '').replace(/\s/g, '');
        const binStr = atob(clean);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        return new Blob([bytes], { type: type || 'application/octet-stream' });
    }

    function readTextFile(file, encoding) {
        if (!file) return Promise.reject(new Error('未选择文件'));
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve((event.target && event.target.result) || '');
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file, encoding || 'UTF-8');
        });
    }

    function downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, filename);
        return blob;
    }

    app.platform.browser.fileAdapter = {
        createGzipJsonBlob,
        parseGzipJsonBlob,
        downloadBlob,
        downloadCompressedJson,
        readCompressedJsonFile,
        blobToBase64,
        base64ToBlob,
        readTextFile,
        downloadJson
    };
})(window);
