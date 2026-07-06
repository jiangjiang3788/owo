// --- Browser battery widget adapter owner (V11) ---
// 负责读取 Battery Status API 并更新旧电池 widget DOM。
(function registerBatteryAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.browser) {
        throw new Error('[batteryAdapter] OwoApp.platform.browser 尚未初始化');
    }

    async function updateBatteryStatus(options = {}) {
        const nav = options.navigator || global.navigator;
        const doc = options.document || global.document;
        if (!nav || !('getBattery' in nav)) {
            const batteryWidget = doc && doc.querySelector ? doc.querySelector('.widget-battery') : null;
            if (batteryWidget) batteryWidget.style.display = 'none';
            return;
        }

        try {
            const battery = await nav.getBattery();
            const batteryLevelText = doc.getElementById('battery-level');
            const batteryFillRect = doc.getElementById('battery-fill-rect');

            const updateDisplay = () => {
                if (!batteryLevelText || !batteryFillRect) return;
                const level = Math.floor(battery.level * 100);
                batteryLevelText.textContent = `${level}%`;
                batteryFillRect.setAttribute('width', 18 * battery.level);
                let fillColor = '#666';
                if (battery.charging) {
                    fillColor = '#4CAF50';
                } else if (level <= 20) {
                    fillColor = '#f44336';
                }
                batteryFillRect.setAttribute('fill', fillColor);
            };

            updateDisplay();
            battery.addEventListener('levelchange', updateDisplay);
            battery.addEventListener('chargingchange', updateDisplay);
        } catch (error) {
            console.error('无法获取电池信息:', error);
            const batteryWidget = doc.querySelector('.widget-battery');
            if (batteryWidget) batteryWidget.style.display = 'none';
        }
    }

    app.platform.browser.batteryAdapter = {
        updateBatteryStatus
    };
    app.platform.browser.updateBatteryStatus = updateBatteryStatus;
})(window);
