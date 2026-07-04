// --- platform/browser/imageAdapter.js ---
// 只连接浏览器图片能力：FileReader、Image、Canvas。不放业务语义。
(function registerBrowserImageAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.browser) {
        throw new Error('js/app/namespace.js 必须在 platform/browser/imageAdapter.js 之前加载');
    }

    async function compressImage(file, options = {}) {
        const { quality = 0.8, maxWidth = 800, maxHeight = 800 } = options;

        if (file.type === 'image/gif') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onerror = reject;
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onerror = reject;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round(height * (maxWidth / width));
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round(width * (maxHeight / height));
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (file.type === 'image/png') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                };
            };
        });
    }

    app.platform.browser.compressImage = compressImage;
})(window);
