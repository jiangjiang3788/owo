// --- OwoApp namespace bootstrap ---
// V1/V2/V3/V4/V5/V6/V7/V8/V9/V10/V11/V12/V13/V14/V15/V16/V17/V19/V20/V21/V22/V23/V24/V25/V26/V27/V28/V29/V30/V31/V33/V34/V35/V36/V37/V38 架构过渡期使用的唯一新命名空间。
// 当前项目仍是 script 顺序加载，不在 V38 强行引入 ESM/import；V38 只标记旧全局 deprecated，不删除兼容入口。
(function bootstrapOwoNamespace(global) {
    const app = global.OwoApp || {};

    app.app = app.app || {};
    app.app.state = app.app.state || {};
    app.app.state.staticConfig = app.app.state.staticConfig || {};
    app.app.state.runtimeGlobals = app.app.state.runtimeGlobals || {};
    app.app.authGate = app.app.authGate || {};
    app.app.screenManifest = app.app.screenManifest || {};
    app.app.screenRegistry = app.app.screenRegistry || {};
    app.app.screenTemplates = app.app.screenTemplates || {};
    app.app.featureIntegration = app.app.featureIntegration || {};
    app.app.legacyDeprecation = app.app.legacyDeprecation || {};
    app.core = app.core || {};
    app.core.chat = app.core.chat || {};
    app.core.chat.messageSemantics = app.core.chat.messageSemantics || {};
    app.core.chat.promptContext = app.core.chat.promptContext || {};
    app.core.chat.promptPieces = app.core.chat.promptPieces || {};
    app.core.chat.promptSemantics = app.core.chat.promptSemantics || {};
    app.core.forum = app.core.forum || {};
    app.core.forum.forumSemantics = app.core.forum.forumSemantics || {};
    app.core.theater = app.core.theater || {};
    app.core.theater.sceneSemantics = app.core.theater.sceneSemantics || {};
    app.core.theater.promptSemantics = app.core.theater.promptSemantics || {};
    app.core.peek = app.core.peek || {};
    app.core.peek.xmlSemantics = app.core.peek.xmlSemantics || {};
    app.core.peek.conversationSemantics = app.core.peek.conversationSemantics || {};
    app.core.wallet = app.core.wallet || {};
    app.core.wallet.paymentSemantics = app.core.wallet.paymentSemantics || {};
    app.core.memory = app.core.memory || {};
    app.core.memory.tableSemantics = app.core.memory.tableSemantics || {};
    app.core.memory.journalSemantics = app.core.memory.journalSemantics || {};
    app.core.memory.worldBookSemantics = app.core.memory.worldBookSemantics || {};
    app.core.memory.legacyMemoryOwnerSemantics = app.core.memory.legacyMemoryOwnerSemantics || {};
    app.core.memoryBrain = app.core.memoryBrain || {};
    app.core.memoryBrain.types = app.core.memoryBrain.types || {};
    app.core.memoryBrain.eventSemantics = app.core.memoryBrain.eventSemantics || {};
    app.core.memoryBrain.factSemantics = app.core.memoryBrain.factSemantics || {};
    app.core.memoryBrain.familySemantics = app.core.memoryBrain.familySemantics || {};
    app.core.memoryBrain.graphSemantics = app.core.memoryBrain.graphSemantics || {};
    app.core.memoryBrain.modelSemantics = app.core.memoryBrain.modelSemantics || {};
    app.core.memoryBrain.injectionSemantics = app.core.memoryBrain.injectionSemantics || {};
    app.core.memoryBrain.weightSemantics = app.core.memoryBrain.weightSemantics || {};
    app.core.memoryBrain.productSemantics = app.core.memoryBrain.productSemantics || {};
    app.core.memoryBrain.cutoverComparisonSemantics = app.core.memoryBrain.cutoverComparisonSemantics || {};
    app.core.memoryBrain.ownerSwitchSemantics = app.core.memoryBrain.ownerSwitchSemantics || {};
    app.core.memoryBrain.uiGroupSemantics = app.core.memoryBrain.uiGroupSemantics || {};
    app.core.memoryBrain.archiveSourceSemantics = app.core.memoryBrain.archiveSourceSemantics || {};
    app.core.memoryBrain.archiveChunkSemantics = app.core.memoryBrain.archiveChunkSemantics || {};
    app.core.memoryBrain.publicApi = app.core.memoryBrain.publicApi || {};
    app.features = app.features || {};
    app.features.chat = app.features.chat || {};
    app.features.chat.messageViewModel = app.features.chat.messageViewModel || {};
    app.features.chat.renderMessageBubble = app.features.chat.renderMessageBubble || {};
    app.features.forum = app.features.forum || {};
    app.features.forum.profileService = app.features.forum.profileService || {};
    app.features.forum.postService = app.features.forum.postService || {};
    app.features.forum.dmService = app.features.forum.dmService || {};
    app.features.forum.publicApi = app.features.forum.publicApi || {};
    app.features.theater = app.features.theater || {};
    app.features.theater.model = app.features.theater.model || {};
    app.features.theater.promptService = app.features.theater.promptService || {};
    app.features.theater.publicApi = app.features.theater.publicApi || {};
    app.features.peek = app.features.peek || {};
    app.features.peek.phoneAppModel = app.features.peek.phoneAppModel || {};
    app.features.peek.publicApi = app.features.peek.publicApi || {};
    app.features.videoCall = app.features.videoCall || {};
    app.features.videoCall.model = app.features.videoCall.model || {};
    app.features.videoCall.publicApi = app.features.videoCall.publicApi || {};
    app.features.wallet = app.features.wallet || {};
    app.features.wallet.paymentCardViewModel = app.features.wallet.paymentCardViewModel || {};
    app.features.wallet.publicApi = app.features.wallet.publicApi || {};
    app.features.settings = app.features.settings || {};
    app.features.memoryTable = app.features.memoryTable || {};
    app.features.memoryTable.model = app.features.memoryTable.model || {};
    app.features.memoryTable.service = app.features.memoryTable.service || {};
    app.features.memoryTable.view = app.features.memoryTable.view || {};
    app.features.memoryTable.publicApi = app.features.memoryTable.publicApi || {};
    app.features.vectorMemory = app.features.vectorMemory || {};
    app.features.vectorMemory.model = app.features.vectorMemory.model || {};
    app.features.vectorMemory.contextService = app.features.vectorMemory.contextService || {};
    app.features.vectorMemory.publicApi = app.features.vectorMemory.publicApi || {};
    app.features.journal = app.features.journal || {};
    app.features.journal.service = app.features.journal.service || {};
    app.features.journal.publicApi = app.features.journal.publicApi || {};
    app.features.worldBook = app.features.worldBook || {};
    app.features.worldBook.contextService = app.features.worldBook.contextService || {};
    app.features.worldBook.publicApi = app.features.worldBook.publicApi || {};
    app.features.settings.presetEngine = app.features.settings.presetEngine || {};
    app.features.settings.presetEngine.model = app.features.settings.presetEngine.model || {};
    app.features.settings.presetEngine.presetEngineService = app.features.settings.presetEngine.presetEngineService || {};
    app.features.settings.presetEngine.publicApi = app.features.settings.presetEngine.publicApi || {};
    app.features.settings.apiSettings = app.features.settings.apiSettings || {};
    app.features.settings.apiSettings.model = app.features.settings.apiSettings.model || {};
    app.features.settings.apiSettings.apiPresetService = app.features.settings.apiSettings.apiPresetService || {};
    app.features.settings.apiSettings.apiModelListService = app.features.settings.apiSettings.apiModelListService || {};
    app.features.settings.apiSettings.apiModelSwitchService = app.features.settings.apiSettings.apiModelSwitchService || {};
    app.features.settings.apiSettings.mainApiSettingsView = app.features.settings.apiSettings.mainApiSettingsView || {};
    app.features.settings.apiSettings.subApiSettingsView = app.features.settings.apiSettings.subApiSettingsView || {};
    app.features.settings.apiSettings.weatherApiSettingsView = app.features.settings.apiSettings.weatherApiSettingsView || {};
    app.features.settings.apiSettings.publicApi = app.features.settings.apiSettings.publicApi || {};
    app.features.settings.appearance = app.features.settings.appearance || {};
    app.features.settings.appearance.model = app.features.settings.appearance.model || {};
    app.features.settings.appearance.runtime = app.features.settings.appearance.runtime || {};
    app.features.settings.appearance.wallpaperSettingsView = app.features.settings.appearance.wallpaperSettingsView || {};
    app.features.settings.appearance.fontPresetView = app.features.settings.appearance.fontPresetView || {};
    app.features.settings.appearance.widgetWallpaperPresetView = app.features.settings.appearance.widgetWallpaperPresetView || {};
    app.features.settings.appearance.themeStatusView = app.features.settings.appearance.themeStatusView || {};
    app.features.settings.appearance.appearanceService = app.features.settings.appearance.appearanceService || {};
    app.features.settings.appearance.publicApi = app.features.settings.appearance.publicApi || {};
    app.features.settings.voiceCot = app.features.settings.voiceCot || {};
    app.features.settings.voiceCot.runtime = app.features.settings.voiceCot.runtime || {};
    app.features.settings.voiceCot.ttsPresetView = app.features.settings.voiceCot.ttsPresetView || {};
    app.features.settings.voiceCot.voicePresetView = app.features.settings.voiceCot.voicePresetView || {};
    app.features.settings.voiceCot.cotCharacterSettingsView = app.features.settings.voiceCot.cotCharacterSettingsView || {};
    app.features.settings.voiceCot.cotSettingsEntry = app.features.settings.voiceCot.cotSettingsEntry || {};
    app.features.settings.voiceCot.publicApi = app.features.settings.voiceCot.publicApi || {};
    app.features.settings.settingsShell = app.features.settings.settingsShell || {};
    app.features.settings.settingsService = app.features.settings.settingsService || {};
    app.features.settings.publicApi = app.features.settings.publicApi || {};
    app.features.debugConsole = app.features.debugConsole || {};
    app.features.debugConsole.service = app.features.debugConsole.service || {};
    app.features.debugConsole.view = app.features.debugConsole.view || {};
    app.features.debugConsole.publicApi = app.features.debugConsole.publicApi || {};
    app.features.cloudBackup = app.features.cloudBackup || {};
    app.features.cloudBackup.service = app.features.cloudBackup.service || {};
    app.features.cloudBackup.publicApi = app.features.cloudBackup.publicApi || {};
    app.features.quickDock = app.features.quickDock || {};
    app.features.quickDock.model = app.features.quickDock.model || {};
    app.features.quickDock.service = app.features.quickDock.service || {};
    app.features.quickDock.view = app.features.quickDock.view || {};
    app.features.quickDock.publicApi = app.features.quickDock.publicApi || {};
    app.features.dataManagement = app.features.dataManagement || {};
    app.features.dataManagement.service = app.features.dataManagement.service || {};
    app.features.dataManagement.storagePanel = app.features.dataManagement.storagePanel || {};
    app.features.dataManagement.view = app.features.dataManagement.view || {};
    app.features.dataManagement.publicApi = app.features.dataManagement.publicApi || {};
    app.features.promptCenter = app.features.promptCenter || {};
    app.features.promptCenter.publicApi = app.features.promptCenter.publicApi || {};
    app.features.memoryBrain = app.features.memoryBrain || {};
    app.features.memoryBrain.model = app.features.memoryBrain.model || {};
    app.features.memoryBrain.service = app.features.memoryBrain.service || {};
    app.features.memoryBrain.eventTimelineService = app.features.memoryBrain.eventTimelineService || {};
    app.features.memoryBrain.factExtractionService = app.features.memoryBrain.factExtractionService || {};
    app.features.memoryBrain.familyService = app.features.memoryBrain.familyService || {};
    app.features.memoryBrain.graphService = app.features.memoryBrain.graphService || {};
    app.features.memoryBrain.longTermModelService = app.features.memoryBrain.longTermModelService || {};
    app.features.memoryBrain.injectionPreviewService = app.features.memoryBrain.injectionPreviewService || {};
    app.features.memoryBrain.memorySchedulerService = app.features.memoryBrain.memorySchedulerService || {};
    app.features.memoryBrain.productizationService = app.features.memoryBrain.productizationService || {};
    app.features.memoryBrain.historyArchiveService = app.features.memoryBrain.historyArchiveService || {};
    app.features.memoryBrain.historyChunkService = app.features.memoryBrain.historyChunkService || {};
    app.features.memoryBrain.historyBackfillService = app.features.memoryBrain.historyBackfillService || {};
    app.features.memoryBrain.historyEventBackfillService = app.features.memoryBrain.historyEventBackfillService || {};
    app.features.memoryBrain.historyFactBackfillService = app.features.memoryBrain.historyFactBackfillService || {};
    app.features.memoryBrain.factLifecycleService = app.features.memoryBrain.factLifecycleService || {};
    app.features.memoryBrain.familyGraphRebuildService = app.features.memoryBrain.familyGraphRebuildService || {};
    app.features.memoryBrain.historyModelRebuildService = app.features.memoryBrain.historyModelRebuildService || {};
    app.features.memoryBrain.cutoverRehearsalService = app.features.memoryBrain.cutoverRehearsalService || {};
    app.features.memoryBrain.ownerGateService = app.features.memoryBrain.ownerGateService || {};
    app.features.memoryBrain.timelineView = app.features.memoryBrain.timelineView || {};
    app.features.memoryBrain.factView = app.features.memoryBrain.factView || {};
    app.features.memoryBrain.familyView = app.features.memoryBrain.familyView || {};
    app.features.memoryBrain.graphView = app.features.memoryBrain.graphView || {};
    app.features.memoryBrain.modelView = app.features.memoryBrain.modelView || {};
    app.features.memoryBrain.injectionView = app.features.memoryBrain.injectionView || {};
    app.features.memoryBrain.schedulerView = app.features.memoryBrain.schedulerView || {};
    app.features.memoryBrain.memoryPalaceView = app.features.memoryBrain.memoryPalaceView || {};
    app.features.memoryBrain.historyArchiveView = app.features.memoryBrain.historyArchiveView || {};
    app.features.memoryBrain.historyChunkView = app.features.memoryBrain.historyChunkView || {};
    app.features.memoryBrain.historyBackfillView = app.features.memoryBrain.historyBackfillView || {};
    app.features.memoryBrain.historyEventBackfillView = app.features.memoryBrain.historyEventBackfillView || {};
    app.features.memoryBrain.historyFactBackfillView = app.features.memoryBrain.historyFactBackfillView || {};
    app.features.memoryBrain.factLifecycleView = app.features.memoryBrain.factLifecycleView || {};
    app.features.memoryBrain.familyGraphRebuildView = app.features.memoryBrain.familyGraphRebuildView || {};
    app.features.memoryBrain.historyModelRebuildView = app.features.memoryBrain.historyModelRebuildView || {};
    app.features.memoryBrain.cutoverRehearsalView = app.features.memoryBrain.cutoverRehearsalView || {};
    app.features.memoryBrain.ownerGateView = app.features.memoryBrain.ownerGateView || {};
    app.features.memoryBrain.groupedUiView = app.features.memoryBrain.groupedUiView || {};
    app.features.memoryBrain.view = app.features.memoryBrain.view || {};
    app.features.memoryBrain.publicApi = app.features.memoryBrain.publicApi || {};
    app.platform = app.platform || {};
    app.platform.ai = app.platform.ai || {};
    app.platform.observability = app.platform.observability || {};
    app.platform.observability.traceStore = app.platform.observability.traceStore || {};
    app.platform.observability.operationTraceService = app.platform.observability.operationTraceService || {};
    app.platform.memoryBrain = app.platform.memoryBrain || {};
    app.platform.memoryBrain.memoryBrainStore = app.platform.memoryBrain.memoryBrainStore || {};
    app.platform.memoryBrain.memoryFactStore = app.platform.memoryBrain.memoryFactStore || {};
    app.platform.memoryBrain.memoryEmbeddingService = app.platform.memoryBrain.memoryEmbeddingService || {};
    app.platform.memoryBrain.memoryFamilyStore = app.platform.memoryBrain.memoryFamilyStore || {};
    app.platform.memoryBrain.memoryGraphStore = app.platform.memoryBrain.memoryGraphStore || {};
    app.platform.memoryBrain.memoryModelStore = app.platform.memoryBrain.memoryModelStore || {};
    app.platform.memoryBrain.memoryInjectionStore = app.platform.memoryBrain.memoryInjectionStore || {};
    app.platform.memoryBrain.memoryScheduleStore = app.platform.memoryBrain.memoryScheduleStore || {};
    app.platform.memoryBrain.memoryExportAdapter = app.platform.memoryBrain.memoryExportAdapter || {};
    app.platform.memoryBrain.historyArchiveScanner = app.platform.memoryBrain.historyArchiveScanner || {};
    app.platform.memoryBrain.historyChunkStore = app.platform.memoryBrain.historyChunkStore || {};
    app.platform.memoryBrain.backfillQueueStore = app.platform.memoryBrain.backfillQueueStore || {};
    app.platform.memoryBrain.historyEventBackfillStore = app.platform.memoryBrain.historyEventBackfillStore || {};
    app.platform.memoryBrain.historyFactBackfillStore = app.platform.memoryBrain.historyFactBackfillStore || {};
    app.platform.memoryBrain.factLifecycleStore = app.platform.memoryBrain.factLifecycleStore || {};
    app.platform.memoryBrain.familyGraphRebuildStore = app.platform.memoryBrain.familyGraphRebuildStore || {};
    app.platform.memoryBrain.historyModelRebuildStore = app.platform.memoryBrain.historyModelRebuildStore || {};
    app.platform.memoryBrain.memoryCutoverReportStore = app.platform.memoryBrain.memoryCutoverReportStore || {};
    app.platform.memoryBrain.memoryOwnerGateStore = app.platform.memoryBrain.memoryOwnerGateStore || {};
    app.platform.memoryBrain.publicApi = app.platform.memoryBrain.publicApi || {};
    app.platform.ai.providerConfig = app.platform.ai.providerConfig || {};
    app.platform.ai.aiConfigStore = app.platform.ai.aiConfigStore || {};
    app.platform.ai.modelRegistry = app.platform.ai.modelRegistry || {};
    app.platform.ai.messageSanitizer = app.platform.ai.messageSanitizer || {};
    app.platform.ai.responseNormalizer = app.platform.ai.responseNormalizer || {};
    app.platform.ai.aiRouter = app.platform.ai.aiRouter || {};
    app.platform.ai.providerRequestAdapter = app.platform.ai.providerRequestAdapter || {};
    app.platform.ai.embeddingAdapter = app.platform.ai.embeddingAdapter || {};
    app.platform.ai.requestTraceStore = app.platform.ai.requestTraceStore || {};
    app.shared = app.shared || {};
    app.compat = app.compat || {};

    app.platform.browser = app.platform.browser || {};
    app.platform.browser.fileAdapter = app.platform.browser.fileAdapter || {};
    app.platform.browser.audioAdapter = app.platform.browser.audioAdapter || {};
    app.platform.browser.mediaAdapter = app.platform.browser.mediaAdapter || {};
    app.platform.browser.hapticAdapter = app.platform.browser.hapticAdapter || {};
    app.platform.browser.batteryAdapter = app.platform.browser.batteryAdapter || {};
    app.platform.storage = app.platform.storage || {};
    app.platform.storage.migrations = app.platform.storage.migrations || {};
    app.platform.storage.dexieMigrations = app.platform.storage.dexieMigrations || {};
    app.platform.storage.dexieAdapter = app.platform.storage.dexieAdapter || {};
    app.platform.storage.dexieWriter = app.platform.storage.dexieWriter || {};
    app.platform.storage.dexieReader = app.platform.storage.dexieReader || {};
    app.platform.storage.loadRepair = app.platform.storage.loadRepair || {};
    app.platform.storage.storageAnalysis = app.platform.storage.storageAnalysis || {};
    app.platform.storage.backupAdapter = app.platform.storage.backupAdapter || {};
    app.platform.storage.githubBackupAdapter = app.platform.storage.githubBackupAdapter || {};

    app.shared.utils = app.shared.utils || {};
    app.shared.ui = app.shared.ui || {};
    app.shared.ui.toast = app.shared.ui.toast || {};
    app.shared.ui.errorModal = app.shared.ui.errorModal || {};

    app.compat.registry = app.compat.registry || {};

    /**
     * 登记旧全局 API 的 canonical owner。
     * 注意：这里不实现业务，只记录所有权，帮助避免两套路径。
     */
    app.compat.register = function registerCompatSymbol(name, meta) {
        if (!name || !meta || !meta.owner) {
            throw new Error('[OwoApp.compat] register 需要 name 和 meta.owner');
        }
        app.compat.registry[name] = {
            state: meta.state || 'legacy-owner',
            owner: meta.owner,
            legacy: meta.legacy || ('window.' + name),
            note: meta.note || '',
            deprecated: meta.deprecated === undefined ? true : Boolean(meta.deprecated),
            since: meta.since || 'V38'
        };
        if (app.app && app.app.legacyDeprecation && typeof app.app.legacyDeprecation.markDeprecated === 'function') {
            app.app.legacyDeprecation.markDeprecated(name, app.compat.registry[name]);
        }
    };

    /**
     * 暴露旧 window API。
     * 规则：只能暴露 canonical 实现，不允许在这里写业务逻辑。
     */
    app.compat.expose = function exposeLegacySymbol(name, fn, meta) {
        if (typeof fn !== 'function') {
            throw new Error('[OwoApp.compat] ' + name + ' 的 canonical 实现必须是函数');
        }
        app.compat.register(name, Object.assign({
            legacy: 'window.' + name,
            deprecated: true,
            since: 'V38'
        }, meta || {}));
        global[name] = fn;
        return fn;
    };

    global.OwoApp = app;
})(window);
