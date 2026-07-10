// --- Peek phone app model owner (V30 canonical owner) ---
// 负责偷看手机应用列表、设置默认值、刷新范围、生成结果验证和 viewed snapshot 模型。
(function registerPeekPhoneAppModel(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.peek = OwoApp.features.peek || {};
    const conversationSemantics = OwoApp.core.peek.conversationSemantics;

    const DEFAULT_REFRESH_COUNTS = Object.freeze({
        messages: { min: 3, max: 5 },
        timeThoughts: { min: 3, max: 5 },
        memos: { min: 3, max: 4 }
    });

    const APP_GENERATION_NAMES = Object.freeze({
        messages: '短信聊天记录',
        memos: '备忘录',
        cart: '购物车',
        transfer: '中转站',
        browser: '浏览器历史记录',
        drafts: '草稿箱',
        album: '相册',
        steps: '步数',
        wallet: '钱包',
        timeThoughts: '时光想说',
        unlock: 'unlock！微博小号'
    });

    function cloneJson(value) {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (error) { return value; }
    }

    function createDefaultPeekScreenSettings(seed) {
        const source = seed && typeof seed === 'object' ? seed : {};
        return {
            wallpaper: source.wallpaper || '',
            customIcons: Object.assign({}, source.customIcons || {}),
            unlockAvatar: source.unlockAvatar || '',
            unlockCommentsEnabled: !!source.unlockCommentsEnabled,
            charAwarePeek: !!source.charAwarePeek,
            impersonateEnabled: !!source.impersonateEnabled,
            refreshCounts: Object.assign({}, source.refreshCounts || {}),
            browserDetailEnabled: !!source.browserDetailEnabled,
            browserDetailWords: Object.assign({ min: 200, max: 500 }, source.browserDetailWords || {}),
            walletTheme: source.walletTheme || undefined
        };
    }

    function ensurePeekScreenSettings(character) {
        if (!character || typeof character !== 'object') return createDefaultPeekScreenSettings();
        character.peekScreenSettings = createDefaultPeekScreenSettings(character.peekScreenSettings || {});
        return character.peekScreenSettings;
    }

    function getPeekScreenSettings(character) {
        return createDefaultPeekScreenSettings(character && character.peekScreenSettings);
    }

    function getPeekAppIds(appMap) {
        return Object.keys(appMap || {});
    }

    function getPeekAppMeta(appMap, appId) {
        const meta = appMap && appMap[appId] ? appMap[appId] : {};
        return {
            id: appId,
            name: meta.name || appId,
            url: meta.url || ''
        };
    }

    function getPeekAppName(appMap, appId) {
        return getPeekAppMeta(appMap, appId).name;
    }

    function getPeekAppIconUrl(appMap, settings, appId) {
        const customIcons = settings && settings.customIcons ? settings.customIcons : {};
        return customIcons[appId] || getPeekAppMeta(appMap, appId).url;
    }

    function getRefreshRange(character, appType) {
        const defaults = DEFAULT_REFRESH_COUNTS[appType] || { min: 1, max: 1 };
        const settings = getPeekScreenSettings(character);
        const custom = settings.refreshCounts && settings.refreshCounts[appType] ? settings.refreshCounts[appType] : {};
        const min = Number(custom.min) || defaults.min;
        const max = Number(custom.max) || defaults.max;
        return { min, max };
    }

    function recordPeekViewedByUser(character, appType, appMap) {
        if (!character || !character.peekData || !character.peekData[appType]) return null;
        if (!Array.isArray(character.peekViewedByUser)) character.peekViewedByUser = [];
        const entry = {
            appId: appType,
            appName: getPeekAppName(appMap, appType),
            content: cloneJson(character.peekData[appType])
        };
        const index = character.peekViewedByUser.findIndex(item => item && item.appId === appType);
        if (index >= 0) character.peekViewedByUser[index] = entry;
        else character.peekViewedByUser.push(entry);
        character.lastPeekViewedAt = Date.now();
        return entry;
    }

    function isGeneratedAppDataValid(appType, data) {
        switch (appType) {
            case 'messages': return !!(data && Array.isArray(data.conversations));
            case 'memos': return !!(data && Array.isArray(data.memos));
            case 'album': return !!(data && Array.isArray(data.photos));
            case 'cart': return !!(data && Array.isArray(data.items));
            case 'transfer': return !!(data && Array.isArray(data.entries));
            case 'browser': return !!(data && Array.isArray(data.history));
            case 'drafts': return !!(data && data.draft);
            case 'steps': return !!(data && data.currentSteps !== undefined);
            case 'timeThoughts': return !!(data && Array.isArray(data.thoughts));
            case 'unlock': return !!(data && data.nickname && Array.isArray(data.posts));
            case 'wallet': return !!(data && Array.isArray(data.income) && Array.isArray(data.expense) && data.summary);
            default: return false;
        }
    }

    function normalizeGeneratedAppData(appType, data) {
        if (appType === 'messages' && data && Array.isArray(data.conversations)) {
            conversationSemantics.normalizePeekConversations(data.conversations);
        }
        return data;
    }

    function getGenerationAppName(appType) {
        return APP_GENERATION_NAMES[appType] || appType;
    }

    feature.phoneAppModel = {
        DEFAULT_REFRESH_COUNTS,
        APP_GENERATION_NAMES,
        createDefaultPeekScreenSettings,
        ensurePeekScreenSettings,
        getPeekScreenSettings,
        getPeekAppIds,
        getPeekAppMeta,
        getPeekAppName,
        getPeekAppIconUrl,
        getRefreshRange,
        recordPeekViewedByUser,
        isGeneratedAppDataValid,
        normalizeGeneratedAppData,
        getGenerationAppName
    };
})(window);
