// --- Initial app state factory (V4 canonical owner) ---
// 只创建内存中的初始 db 形状，不读写 IndexedDB/localStorage。
(function registerInitialStateFactory(global) {
    const OwoApp = global.OwoApp;
    const state = OwoApp.app.state;

    function createInitialDbState() {
        return {
            characters: [],
            groups: [],
            apiSettings: {},
            summaryApiSettings: {},
            backgroundApiSettings: {},
            supplementPersonaApiSettings: {},
            peekApiSettings: {},
            vectorApiSettings: {},
            wallpaper: 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg',
            globalChatWallpaper: '',
            globalCallWallpaper: '',
            myStickers: [],
            homeScreenMode: 'night',
            worldBooks: [],
            fontUrl: '',
            localFontName: '',
            customIcons: {},
            customAppNames: {},
            apiPresets: [],
            summaryApiPresets: [],
            backgroundApiPresets: [],
            supplementPersonaApiPresets: [],
            peekApiPresets: [],
            vectorApiPresets: [],
            bubbleCssPresets: [],
            myPersonaPresets: [],
            fontPresets: [],
            forumPosts: [],
            globalCss: '',
            globalCssPresets: [],
            homeSignature: '编辑个性签名...',
            forumBindings: {
                worldBookIds: [],
                charIds: [],
                userPersonaIds: []
            },
            pomodoroTasks: [],
            pomodoroSettings: {
                boundCharId: null,
                userPersona: '',
                focusBackground: '',
                taskCardBackground: '',
                encouragementMinutes: 25,
                pokeLimit: 5,
                globalWorldBookIds: []
            },
            insWidgetSettings: {
                avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
                bubble1: 'love u.',
                avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg',
                bubble2: 'miss u.'
            },
            chatFolders: [],
            fontSizeScale: 1.0,
            savedKeyboardHeight: null,
            activePersonaId: null,
            moreProfileCardBg: 'https://i.postimg.cc/XvFDdTKY/Smart-Select-20251013-023208.jpg',
            statusBarPresets: [],
            regexFilterPresets: [],
            themeSettings: {
                global: {
                    iconColor: '#000000',
                    textColor: '#2a3032',
                    titleColor: '#000000',
                    backgroundColor: '#ffffff'
                },
                wallpapers: {
                    contacts: '',
                    chats: '',
                    more: ''
                },
                bottomNav: {
                    iconColor: '#999999',
                    activeIconColor: '#2a3032',
                    items: [
                        { defaultIcon: '', activeIcon: '' },
                        { defaultIcon: '', activeIcon: '' },
                        { defaultIcon: '', activeIcon: '' },
                        { defaultIcon: '', activeIcon: '' }
                    ]
                },
                chatScreen: {
                    bottomBarColor: '#ffffff',
                    iconColor: '#000000',
                    folderPillColor: '#ffffff'
                }
            },
            themePresets: [],
            globalSendSound: '',
            globalReceiveSound: '',
            globalMessageSentSound: '',
            globalIncomingCallSound: '',
            multiMsgSoundEnabled: false,
            hapticEnabled: true,  // 触感反馈开关，默认开启
            soundPresets: [],
            galleryPresets: [],
            iconPresets: [],
            cotSettings: {
                enabled: false,
                activePresetId: 'default'
            },
            cotPresets: JSON.parse(JSON.stringify(DEFAULT_COT_PRESETS)),
            archives: [],
            favorites: [],  // 消息收藏：{ id, messageId, chatId, chatType, chatName, content, timestamp, favoriteTime, note, sender }
            phoneControlRecycleBin: [],  // 角色掌控模式：被角色“删除”的角色移入回收站，可恢复
            memoryTableTemplates: [],
            vectorMemoryTemplates: [],
            memoryBrain: null,
            aiConfig: {
                version: '0.3.9',
                mode: 'legacy-compatible-router',
                taskRoutes: []
            }
        };
    }

    state.initialState = Object.assign(state.initialState || {}, {
        createInitialDbState
    });
})(window);
