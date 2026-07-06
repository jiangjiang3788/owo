// --- App static config aggregator (V10 canonical owner) ---
const updateLog = updateLogRecent.concat(updateLogArchive);

window.OwoApp.app.state.staticConfig = Object.assign(window.OwoApp.app.state.staticConfig || {}, {
    BLOCKED_API_DOMAINS,
    colorThemes,
    defaultIcons,
    peekScreenApps,
    appVersion,
    updateLog
});
