// --- App state constants (V4 canonical owner) ---
// 只放跨旧脚本共享的默认常量，不写 Dexie、DOM、保存逻辑。

const defaultWidgetSettings = {
    centralCircleImage: 'https://i.postimg.cc/mD83gR29/avatar-1.jpg',
    topLeft: { emoji: '🎧', text: '𝑀𝑒𝑚𝑜𝑟𝑖𝑒𝑠✞' },
    topRight: { emoji: '🐈‍⬛', text: '𐙚 ♰.𝐾𝑖𝑡𝑡𝑒𝑛.♰' },
    bottomLeft: { emoji: '💿', text: '᪗₊𝔹𝕒𝕓𝕖𝕚𝕤₊' },
    bottomRight: { emoji: '🥛', text: '.☘︎ ˖+×+.' }
};

const DEFAULT_COT_PRESETS = [
    {
        id: 'default',
        name: '默认思维链',
        items: [
            {
                id: 'cot_item_1',
                name: '引子',
                content: '[System Directive]:\n你必须严格遵守 [incipere] 协议。在回复前，请先进入 <thinking> 标签进行深度推演。\n请按以下步骤查阅 System Prompt 中的模块并思考：',
                enabled: true
            },
            {
                id: 'cot_item_2',
                name: '准备动脑了吗？',
                content: '---\n## 【前置规则】\n### **必须**读取所有<logic_rules>和<output_formats>：了解**所有**需要遵守的规则，然后进行以下步骤精简准确的思考',
                enabled: true
            },
            {
                id: 'cot_item_3',
                name: '给我读设定！',
                content: '---\n## 【行为校准】\n基于<char_settings>和<角色活人运转>构建角色人格\n### Phase1: person\n1. **自我意识校验 (Ref: <char_settings>和<角色活人运转>)**\n   - 是否塑造鲜活真实人格？\n   - 你（角色）是否具有自己的聊天习惯/风格？\n   - 你想如何回应我？',
                enabled: true
            },
            {
                id: 'cot_item_4',
                name: '当个人吧。',
                content: '### Phase2: Verisimilitude\n2.**真实聊天**\n   - 是否根据以下两点要求采用了真人聊天思路？\n    - 正常人的注意力是有限的，不会每句话都非得逐句回复。\n    - 不对已有信息进行重复反问。\n    - 断点处理：若与上一条消息间隔较久，默认双方只是自然忙碌后重新拿起手机或默认期间以其他方式保持联系，自然接续话题。',
                enabled: true
            },
            {
                id: 'cot_item_5',
                name: '有特殊格式吗？',
                content: '### Phase3: chat role\n3. **逻辑检索 (Ref: <logic_rules>)**\n   - 当前是否为双语对话情境？若无，跳过此条\n   - 是否需要输出状态栏？若无相关要求，则跳过此条',
                enabled: true
            },
            {
                id: 'cot_item_6',
                name: '最后确认一下。',
                content: '## 【最后确认】\n\n4. 整合<Chatting Guidelines>，是否合理自然回复且不偏离人设？回顾<output_formats>，输出消息格式是否正确？',
                enabled: true
            },
            {
                id: 'cot_item_7',
                name: '尾声',
                content: '每轮输出前，必须先严格按照<thinking>…</thinking>内的步骤进行逐条思考，无需重复其中的条目，但思考内容需精简准确、清晰、可执行，不得跳步骤。\n<thinking>中的所有分析必须在输出中完全落实，不得偏离、删减或弱化。\n\n格式：\n<thinking>\n...思考过程...\n</thinking>',
                enabled: true
            }
        ]
    }
];

const globalSettingKeys = [
    'apiSettings', 'chatRuntimeMode', 'journalRuntimeMode', 'summaryApiSettings', 'backgroundApiSettings', 'supplementPersonaApiSettings', 'peekApiSettings', 'vectorApiSettings', 'imageRecognitionEnabled', 'imageRecognitionApiSettings', 'stickerRecognitionApiSettings', 'wallpaper', 'globalChatWallpaper', 'globalCallWallpaper', 'homeScreenMode', 'fontUrl', 'localFontName', 'customIcons', 'customAppNames', 'namePresets',
    'apiPresets', 'summaryApiPresets', 'backgroundApiPresets', 'supplementPersonaApiPresets', 'peekApiPresets', 'vectorApiPresets', 'imageRecognitionApiPresets', 'stickerRecognitionApiPresets', 'bubbleCssPresets', 'myPersonaPresets', 'globalCss',
    'globalCssPresets', 'fontPresets', 'homeSignature', 'forumPosts', 'forumBindings', 'forumUserProfile', 'forumSettings', 'forumApiSettings', 'forumMessages', 'forumStrangerProfiles', 'forumFriendRequests', 'forumPendingRequestFromUser', 'forumAltAccounts', 'forumActiveAccountId', 'pomodoroTasks', 'pomodoroSettings', 'insWidgetSettings', 'homeWidgetSettings',
    'chatFolders', 'hapticEnabled', 'fontSizeScale', 'activePersonaId', 'moreProfileCardBg', 'statusBarPresets', 'regexFilterPresets', 'themeSettings', 'themePresets', 'savedKeyboardHeight',
    'globalSendSound', 'globalReceiveSound', 'globalMessageSentSound', 'globalIncomingCallSound', 'multiMsgSoundEnabled', 'soundPresets', 'galleryPresets', 'iconPresets', 'homeWidgetPresets', 'widgetWallpaperPresets', 'voicePresets', 'fontBuffer',
    'cotSettings', 'cotPresets', 'hasSeenVideoCallDisclaimer', 'hasSeenVideoCallAvatarHint',
    'favorites', 'piggyBank',
    'theaterScenarios', 'theaterPromptPresets',
    'theaterHtmlScenarios', 'theaterHtmlPromptPresets', 'theaterMode',
    'theaterApiSettings', 'theaterFontSize', 'theaterFontPreset',
    'novelAiSettings', 'gptImageSettings', 'gptImagePresets', 'avatarRecognitionDetailLevel',
    'phoneControlRecycleBin', 'nodeTemplates', 'nodeSummaryText', 'memoryTableTemplates', 'vectorMemoryTemplates',
    'nightModeSettings', 'homeStatusBarSettings', 'stickerCategories', 'magicRoom', 'legacySnapshots',
    'keepAliveCodeEnabled', 'keepAliveAudioEnabled', 'keepAliveAudioSrc', 'keepAliveAudioName', 'keepAliveAudioLibrary'
];
if (typeof window !== 'undefined') window.globalSettingKeysForBackup = globalSettingKeys;

window.OwoApp.app.state.constants = Object.assign(window.OwoApp.app.state.constants || {}, {
    defaultWidgetSettings,
    DEFAULT_COT_PRESETS,
    globalSettingKeys
});
