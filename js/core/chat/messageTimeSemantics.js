// --- Chat message time semantics owner (v0.4.5) ---
// 只负责把聊天消息时间格式化为 prompt 里的轻量时间上下文；不读取 DOM、不写状态。
(function registerChatMessageTimeSemantics(app) {
    app.core = app.core || {};
    app.core.chat = app.core.chat || {};

    function pad2(value) { return String(value).padStart(2, '0'); }
    function toTimestamp(value, fallback) {
        const time = Number(value);
        if (Number.isFinite(time) && time > 0) return time;
        return Number(fallback) || Date.now();
    }
    function formatMessageTime(timestamp) {
        const date = new Date(toTimestamp(timestamp));
        return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    }
    function formatGap(milliseconds) {
        const totalMinutes = Math.max(1, Math.floor(Number(milliseconds || 0) / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        if (days > 0) return `${days}天${hours ? hours + '小时' : ''}`;
        if (hours > 0) return `${hours}小时${minutes ? minutes + '分钟' : ''}`;
        return `${minutes}分钟`;
    }
    function buildPromptTimePrefix(message, previousTimestamp, options = {}) {
        const timestamp = toTimestamp(message && message.timestamp, previousTimestamp || Date.now());
        const previous = Number(previousTimestamp) || 0;
        const gap = previous ? Math.max(0, timestamp - previous) : 0;
        const lines = [];
        if (options.alwaysPerMessage !== false) {
            lines.push(`[system: ${formatMessageTime(timestamp)}]`);
        }
        if (previous && options.includeGapNotice && gap > (Number(options.gapThresholdMs) || 30 * 60 * 1000)) {
            lines.push(`[system: 距离上次互动已过去 ${formatGap(gap)}。话题可能已中断，请自然地理解时间流逝。]`);
        }
        return { prefix: lines.length ? lines.join('\n') + '\n' : '', timestamp, gapMs: gap };
    }

    app.core.chat.messageTimeSemantics = {
        formatMessageTime,
        formatGap,
        buildPromptTimePrefix
    };
})(OwoApp);
