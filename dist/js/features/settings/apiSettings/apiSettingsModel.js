// --- API settings model helpers (V18) ---
// 只放 API 设置页的纯模型/归一化/请求参数计算；不直接 fetch、不操作 DOM、不保存数据。
(function registerApiSettingsModel(global) {
    const OwoApp = global.OwoApp;
    const apiSettings = OwoApp.features.settings.apiSettings;

    const PROVIDER_URLS = Object.freeze({
        newapi: '',
        deepseek: 'https://api.deepseek.com',
        claude: 'https://api.anthropic.com',
        gemini: 'https://generativelanguage.googleapis.com'
    });

    const SUB_API_CONFIGS = Object.freeze([
        { prefix: 'summary', dbKey: 'summaryApiSettings', presetsKey: 'summaryApiPresets', displayName: '总结' },
        { prefix: 'background', dbKey: 'backgroundApiSettings', presetsKey: 'backgroundApiPresets', displayName: '后台活动' },
        { prefix: 'vector', dbKey: 'vectorApiSettings', presetsKey: 'vectorApiPresets', displayName: '向量记忆' },
        { prefix: 'supplementPersona', dbKey: 'supplementPersonaApiSettings', presetsKey: 'supplementPersonaApiPresets', displayName: '补齐人设' },
        { prefix: 'peek', dbKey: 'peekApiSettings', presetsKey: 'peekApiPresets', displayName: '偷看手机' },
        { prefix: 'imageRecognition', dbKey: 'imageRecognitionApiSettings', presetsKey: 'imageRecognitionApiPresets', displayName: '自动识图' },
        { prefix: 'stickerRecognition', dbKey: 'stickerRecognitionApiSettings', presetsKey: 'stickerRecognitionApiPresets', displayName: '表情包识图' }
    ]);

    function trimTrailingSlash(url) {
        const value = String(url || '').trim();
        return value.endsWith('/') ? value.slice(0, -1) : value;
    }

    function getProviderUrl(provider) {
        return PROVIDER_URLS[provider] || '';
    }

    function normalizeApiFormData(data) {
        return {
            provider: data && data.provider ? String(data.provider) : 'newapi',
            url: data && data.url ? String(data.url).trim() : '',
            key: data && data.key ? String(data.key).trim() : '',
            model: data && data.model ? String(data.model).trim() : ''
        };
    }

    function isBlockedBaseUrl(url, blockedDomains) {
        const value = String(url || '');
        return (blockedDomains || []).some(domain => value.includes(domain));
    }

    function buildModelListRequest(data, helpers = {}) {
        const form = normalizeApiFormData(data);
        const apiUrl = trimTrailingSlash(form.url);
        const sharedUtils = OwoApp.shared && OwoApp.shared.utils ? OwoApp.shared.utils : {};
        const getRandomValue = helpers.getRandomValue || sharedUtils.getRandomValue || (value => value);
        return {
            endpoint: form.provider === 'gemini'
                ? `${apiUrl}/v1beta/models?key=${getRandomValue(form.key)}`
                : `${apiUrl}/v1/models`,
            fetchOptions: {
                method: 'GET',
                headers: form.provider === 'gemini' ? {} : { Authorization: `Bearer ${form.key}` }
            }
        };
    }

    function parseModelList(provider, data) {
        if (provider !== 'gemini' && data && Array.isArray(data.data)) {
            return data.data.map(item => item.id).filter(Boolean);
        }
        if (provider === 'gemini' && data && Array.isArray(data.models)) {
            return data.models.map(item => String(item.name || '').replace('models/', '')).filter(Boolean);
        }
        return [];
    }

    function getSubApiConfig(prefix) {
        return SUB_API_CONFIGS.find(item => item.prefix === prefix) || null;
    }

    apiSettings.model = {
        PROVIDER_URLS,
        SUB_API_CONFIGS,
        getProviderUrl,
        getSubApiConfig,
        trimTrailingSlash,
        normalizeApiFormData,
        isBlockedBaseUrl,
        buildModelListRequest,
        parseModelList
    };
})(window);
