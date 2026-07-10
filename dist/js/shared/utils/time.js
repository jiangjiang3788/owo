// --- shared/utils/time.js ---
// 只放跨模块通用的时间格式化工具，不放业务语义。
(function registerSharedTimeUtils(global) {
    const app = global.OwoApp;
    if (!app || !app.shared || !app.shared.utils) {
        throw new Error('js/app/namespace.js 必须在 shared/utils/time.js 之前加载');
    }

    function getLocalTimeInTimezone(timezone) {
        if (!timezone) return null;

        const legacyTimezoneMap = {
            '北京/UTC+8': 'Asia/Shanghai',
            '东京/UTC+9': 'Asia/Tokyo',
            '首尔/UTC+9': 'Asia/Seoul',
            '伦敦/UTC+0': 'Europe/London',
            '纽约/UTC-5': 'America/New_York',
            '悉尼/UTC+10': 'Australia/Sydney',
            '巴黎/UTC+1': 'Europe/Paris'
        };

        if (legacyTimezoneMap[timezone]) {
            timezone = legacyTimezoneMap[timezone];
        }

        try {
            const options = {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            const formatter = new Intl.DateTimeFormat('zh-CN', options);
            return formatter.format(new Date());
        } catch (e) {
            console.error('Invalid timezone:', timezone, e);
            return null;
        }
    }

    function formatTimeDivider(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const isSameYear = date.getFullYear() === now.getFullYear();
        const pad = app.shared.utils.pad;
        const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

        if (isToday) {
            return timeStr;
        } else if (isYesterday) {
            return `昨天 ${timeStr}`;
        } else if (isSameYear) {
            return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
        } else {
            return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
        }
    }

    function getFormattedTimestamp(date) {
        const Y = date.getFullYear();
        const M = String(date.getMonth() + 1).padStart(2, '0');
        const D = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${Y}-${M}-${D} ${h}:${m}:${s}`;
    }

    function formatTimeGap(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}天${hours % 24}小时`;
        if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
        if (minutes > 0) return `${minutes}分钟`;
        return `${seconds}秒`;
    }

    app.shared.utils.getLocalTimeInTimezone = getLocalTimeInTimezone;
    app.shared.utils.formatTimeDivider = formatTimeDivider;
    app.shared.utils.getFormattedTimestamp = getFormattedTimestamp;
    app.shared.utils.formatTimeGap = formatTimeGap;
})(window);
