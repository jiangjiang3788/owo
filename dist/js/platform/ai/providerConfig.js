// --- AI provider config/model owner (V12 canonical owner) ---
// 只负责读取、归一化、选择 provider 配置；不发起 fetch，不处理 stream。
(function registerAiProviderConfig(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const DEFAULT_PROVIDER = 'newapi';

    function asObject(value) {
        return value && typeof value === 'object' ? value : {};
    }

    function normalizeString(value) {
        if (value === undefined || value === null) return '';
        return String(value).trim();
    }

    function normalizeBaseUrl(url) {
        return normalizeString(url).replace(/\/+$/, '');
    }

    function normalizeProviderSettings(settings, options = {}) {
        const source = asObject(settings);
        return {
            ...source,
            provider: normalizeString(source.provider || options.defaultProvider || DEFAULT_PROVIDER),
            url: normalizeBaseUrl(source.url),
            key: normalizeString(source.key),
            model: normalizeString(source.model)
        };
    }

    function isProviderConfigured(settings) {
        const normalized = normalizeProviderSettings(settings);
        return Boolean(normalized.url && normalized.key && normalized.model);
    }

    function selectSpecializedOrMain(sourceDb, specializedKey, sourceName) {
        const rootDb = asObject(sourceDb);
        const main = rootDb.apiSettings || {};
        const specialized = rootDb[specializedKey] || {};
        const selected = isProviderConfigured(specialized) ? specialized : main;
        const normalized = normalizeProviderSettings(selected);
        normalized.source = selected === specialized ? sourceName : 'main';
        return normalized;
    }

    function selectMainProviderConfig(sourceDb) {
        const normalized = normalizeProviderSettings(asObject(sourceDb).apiSettings || {});
        normalized.source = 'main';
        return normalized;
    }

    function selectChatProviderConfig(sourceDb, context = {}) {
        const rootDb = asObject(sourceDb);
        let selected = rootDb.apiSettings || {};
        let source = 'main';

        if (context.isSummary && isProviderConfigured(rootDb.summaryApiSettings)) {
            selected = rootDb.summaryApiSettings;
            source = 'summary';
        } else if (context.isBackground && isProviderConfigured(rootDb.backgroundApiSettings)) {
            selected = rootDb.backgroundApiSettings;
            source = 'background';
        }

        const normalized = normalizeProviderSettings(selected);
        normalized.source = source;
        normalized.streamEnabled = asObject(rootDb.apiSettings).streamEnabled;
        return normalized;
    }

    function selectImageRecognitionProviderConfig(sourceDb) {
        return selectSpecializedOrMain(sourceDb, 'imageRecognitionApiSettings', 'imageRecognition');
    }

    function selectSummaryProviderConfig(sourceDb) {
        return selectSpecializedOrMain(sourceDb, 'summaryApiSettings', 'summary');
    }

    function getMainTemperature(sourceDb, fallback = 1.0) {
        const main = asObject(sourceDb).apiSettings || {};
        return main.temperature !== undefined ? main.temperature : fallback;
    }

    function isMainQuickReplyEnabled(sourceDb) {
        return Boolean(asObject(asObject(sourceDb).apiSettings).quickReplyEnabled);
    }

    function isMainTimePerceptionEnabled(sourceDb) {
        return Boolean(asObject(asObject(sourceDb).apiSettings).timePerceptionEnabled);
    }

    function isOnlineRoleEnabled(sourceDb) {
        const main = asObject(sourceDb).apiSettings;
        return !main || main.onlineRoleEnabled !== false;
    }

    function isBlockedBaseUrl(url, blockedDomains) {
        const baseUrl = normalizeBaseUrl(url);
        const domains = Array.isArray(blockedDomains) ? blockedDomains : [];
        return domains.some(domain => baseUrl.includes(domain));
    }

    ai.providerConfig = {
        normalizeProviderSettings,
        normalizeBaseUrl,
        isProviderConfigured,
        selectMainProviderConfig,
        selectChatProviderConfig,
        selectImageRecognitionProviderConfig,
        selectSummaryProviderConfig,
        getMainTemperature,
        isMainQuickReplyEnabled,
        isMainTimePerceptionEnabled,
        isOnlineRoleEnabled,
        isBlockedBaseUrl
    };
})(window);
