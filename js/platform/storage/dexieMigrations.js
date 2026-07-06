// --- platform/storage/dexieMigrations.js ---
// V5 Dexie 迁移定义。
// 只负责旧 schema 到新 schema 的数据迁移映射；不提供公开保存入口，不直接读写运行时 db 状态。
(function registerDexieMigrations(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/dexieMigrations.js 之前加载');
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getStateConstants() {
        const constants = app.app && app.app.state && app.app.state.constants;
        if (!constants) {
            throw new Error('[OwoApp.storage] state constants 尚未加载，无法执行 Dexie migration');
        }
        return constants;
    }

    function buildVersion2SettingsSnapshot(data) {
        const constants = getStateConstants();
        return {
            apiSettings: data.apiSettings || {},
            summaryApiSettings: data.summaryApiSettings || {},
            backgroundApiSettings: data.backgroundApiSettings || {},
            vectorApiSettings: data.vectorApiSettings || {},
            wallpaper: data.wallpaper || 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg',
            globalChatWallpaper: data.globalChatWallpaper || '',
            homeScreenMode: data.homeScreenMode || 'night',
            fontUrl: data.fontUrl || '',
            localFontName: data.localFontName || '',
            fontBuffer: data.fontBuffer || null,
            customIcons: data.customIcons || {},
            apiPresets: data.apiPresets || [],
            summaryApiPresets: data.summaryApiPresets || [],
            backgroundApiPresets: data.backgroundApiPresets || [],
            vectorApiPresets: data.vectorApiPresets || [],
            bubbleCssPresets: data.bubbleCssPresets || [],
            myPersonaPresets: data.myPersonaPresets || [],
            globalCss: data.globalCss || '',
            globalCssPresets: data.globalCssPresets || [],
            homeSignature: data.homeSignature || '编辑个性签名...',
            forumPosts: data.forumPosts || [],
            forumBindings: data.forumBindings || { worldBookIds: [], charIds: [], userPersonaIds: [] },
            pomodoroTasks: data.pomodoroTasks || [],
            pomodoroSettings: data.pomodoroSettings || {
                boundCharId: null,
                userPersona: '',
                focusBackground: '',
                taskCardBackground: '',
                encouragementMinutes: 25,
                pokeLimit: 5,
                globalWorldBookIds: []
            },
            insWidgetSettings: data.insWidgetSettings || {
                avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
                bubble1: 'love u.',
                avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg',
                bubble2: 'miss u.'
            },
            homeWidgetSettings: data.homeWidgetSettings || constants.defaultWidgetSettings,
            memoryTableTemplates: data.memoryTableTemplates || [],
            vectorMemoryTemplates: data.vectorMemoryTemplates || [],
            moreProfileCardBg: data.moreProfileCardBg || 'https://i.postimg.cc/XvFDdTKY/Smart-Select-20251013-023208.jpg',
            cotSettings: data.cotSettings || { enabled: false, activePresetId: 'default' },
            cotPresets: data.cotPresets || clone(constants.DEFAULT_COT_PRESETS),
            stickerCategories: data.stickerCategories || [],
            gptImageSettings: data.gptImageSettings || {},
            gptImagePresets: data.gptImagePresets || [],
            magicRoom: Object.assign({
                customPromptEnabled: false,
                customPromptTemplate: '',
                sysNotifEnabled: false,
                sysNotifSenderName: '',
                sysNotifShowAvatar: true,
                sysNotifShowContent: true,
                sysNotifCustomServer: false,
                sysNotifServerUrl: '',
                sysNotifServerKey: ''
            }, data.magicRoom || {})
        };
    }

    async function migrateLegacyStorageRecordToVersion2(tx) {
        console.log('Upgrading database to version 2...');
        const oldData = await tx.table('storage').get('章鱼喷墨机');
        if (!oldData || !oldData.value) {
            console.log('No old data found to migrate.');
            return;
        }

        console.log('Old data found, starting migration.');
        const data = JSON.parse(oldData.value);
        if (data.characters) await tx.table('characters').bulkPut(data.characters);
        if (data.groups) await tx.table('groups').bulkPut(data.groups);
        if (data.worldBooks) await tx.table('worldBooks').bulkPut(data.worldBooks);
        if (data.myStickers) await tx.table('myStickers').bulkPut(data.myStickers);

        const settingsToMigrate = buildVersion2SettingsSnapshot(data);
        const settingsPromises = Object.entries(settingsToMigrate).map(([key, value]) =>
            tx.table('globalSettings').put({ key, value })
        );
        await Promise.all(settingsPromises);

        await tx.table('storage').delete('章鱼喷墨机');
        console.log('Migration complete. Old data removed.');
    }

    app.platform.storage.dexieMigrations = {
        buildVersion2SettingsSnapshot,
        migrateLegacyStorageRecordToVersion2
    };
})(window);
