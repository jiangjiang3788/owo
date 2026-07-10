// --- platform/storage/backupAdapter.js ---
// v0.9.1 备份/恢复编排：先校验、再构建候选、最后通过 Dexie 原子事务提交。
(function registerBackupAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/backupAdapter.js 之前加载');
    }

    const THEATER_DB_KEYS = Object.freeze([
        'theaterScenarios', 'theaterPromptPresets',
        'theaterHtmlScenarios', 'theaterHtmlPromptPresets',
        'theaterMode', 'theaterApiSettings', 'theaterFontSize', 'theaterFontPreset'
    ]);

    function integrity() {
        const value = app.platform.storage.backupIntegrity;
        if (!value || typeof value.attachPackageIntegrity !== 'function') {
            throw new Error('[backupAdapter] backupIntegrity 尚未加载');
        }
        return value;
    }

    function restoreTransaction() {
        const value = app.platform.storage.restoreTransaction;
        if (!value || typeof value.commitState !== 'function') {
            throw new Error('[backupAdapter] restoreTransaction 尚未加载');
        }
        return value;
    }

    function clone(value) { return integrity().clone(value); }

    function createBackupFilename(prefix, ext) {
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        return `${prefix}_${date}_${time}.${ext || 'ee'}`;
    }

    function recordStorageOperation(label, status, data, error) {
        const ops = app.platform && app.platform.observability
            ? app.platform.observability.operationTraceService : null;
        if (!ops || typeof ops.recordOperation !== 'function') return;
        ops.recordOperation({
            source: 'platform/storage/backupAdapter',
            sourceModule: 'platform/storage',
            action: label,
            label,
            operationName: label,
            status: status || 'success',
            data: data || {},
            errorMessage: error && error.message ? error.message : '',
            errorStack: error && error.stack ? String(error.stack) : ''
        });
    }

    function getRequiredContext(context) {
        if (!context || typeof context.getDb !== 'function' || typeof context.getDexieDB !== 'function') {
            throw new Error('[backupAdapter] 缺少 getDb/getDexieDB 上下文');
        }
        return context;
    }

    function createMetadata(version) {
        return {
            _exportVersion: version,
            _exportTimestamp: Date.now(),
            _schema: { id: 'owo-backup', version: 1 }
        };
    }

    async function createFullBackupData(context) {
        const ctx = getRequiredContext(context);
        const backupData = Object.assign(clone(ctx.getDb()), createMetadata('3.1'));
        const keys = typeof ctx.getGlobalSettingKeys === 'function' ? ctx.getGlobalSettingKeys() : [];
        keys.forEach((key) => {
            const db = ctx.getDb();
            if (db[key] !== undefined && backupData[key] === undefined) backupData[key] = clone(db[key]);
        });
        const output = await integrity().attachPackageIntegrity(backupData);
        recordStorageOperation('创建完整备份数据', 'success', {
            keys: Object.keys(output).length,
            exportVersion: output._exportVersion,
            checksumAlgorithm: output._integrity && output._integrity.algorithm
        });
        return output;
    }

    async function createPartialBackupData(selectedKeys, context) {
        const ctx = getRequiredContext(context);
        const db = ctx.getDb();
        const keys = typeof ctx.getGlobalSettingKeys === 'function' ? ctx.getGlobalSettingKeys() : [];
        const result = Object.assign(createMetadata('3.1_partial'), {
            _exportTables: Array.isArray(selectedKeys) ? selectedKeys.slice() : []
        });
        for (const key of result._exportTables) {
            if (key === 'globalSettings') {
                result.globalSettings = {};
                keys.forEach(settingKey => { result.globalSettings[settingKey] = clone(db[settingKey]); });
            } else if (key === 'theaterData') {
                result.theaterData = {};
                THEATER_DB_KEYS.forEach(theaterKey => { result.theaterData[theaterKey] = clone(db[theaterKey]); });
            } else if (db[key] !== undefined) {
                result[key] = clone(db[key]);
            }
        }
        const output = await integrity().attachPackageIntegrity(result);
        recordStorageOperation('创建分类导出数据', 'success', {
            selectedKeys: output._exportTables,
            exportVersion: output._exportVersion
        });
        return output;
    }

    function reassembleLegacyHistory(chat, backupData) {
        if (!chat.history || !Array.isArray(chat.history) || chat.history.length === 0) return [];
        if (typeof chat.history[0] === 'object' && chat.history[0] !== null) return chat.history;
        if (!backupData.__chunks__ || typeof chat.history[0] !== 'string') return [];
        let fullHistory = [];
        chat.history.forEach((key) => {
            if (!backupData.__chunks__[key]) return;
            try { fullHistory = fullHistory.concat(JSON.parse(backupData.__chunks__[key])); }
            catch (error) { console.error(`Failed to parse history chunk ${key}`, error); }
        });
        return fullHistory;
    }

    function convertLegacyBackup(data) {
        const version = String(data && data._exportVersion || '');
        if (!data || version === '3.0' || version === '3.1' || version.includes('partial')) return clone(data);
        const newData = clone(data);
        if (Array.isArray(newData.characters)) {
            newData.characters = newData.characters.map(char => Object.assign({}, char, {
                history: reassembleLegacyHistory(char, data)
            }));
        }
        if (Array.isArray(newData.groups)) {
            newData.groups = newData.groups.map(group => Object.assign({}, group, {
                history: reassembleLegacyHistory(group, data)
            }));
        }
        return newData;
    }

    function createDefaultRuntimeState() {
        const factory = app.app && app.app.state && app.app.state.initialState
            ? app.app.state.initialState.createInitialDbState : null;
        return typeof factory === 'function' ? factory() : {
            characters: [], groups: [], worldBooks: [], myStickers: [], archives: []
        };
    }

    function repairImportedRuntimeDb(db, context) {
        (db.characters || []).forEach(char => {
            if (char.theme === undefined || char.theme === null || char.theme === '') char.theme = 'white_pink';
        });
        (db.groups || []).forEach(group => {
            if (group.theme === undefined || group.theme === null || group.theme === '') group.theme = 'white_pink';
        });
        if (!Array.isArray(db.characters)) db.characters = [];
        if (!Array.isArray(db.groups)) db.groups = [];
        if (!Array.isArray(db.worldBooks)) db.worldBooks = [];
        if (!Array.isArray(db.myStickers)) db.myStickers = [];
        if (!Array.isArray(db.archives)) db.archives = [];
        if (!Array.isArray(db.pomodoroTasks)) db.pomodoroTasks = [];
        if (!db.pomodoroSettings) db.pomodoroSettings = {
            boundCharId: null, userPersona: '', focusBackground: '', taskCardBackground: '',
            encouragementMinutes: 25, pokeLimit: 5, globalWorldBookIds: []
        };
        if (!db.insWidgetSettings) db.insWidgetSettings = {
            avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg', bubble1: 'love u.',
            avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg', bubble2: 'miss u.'
        };
        if (!db.homeWidgetSettings && typeof context.getDefaultWidgetSettings === 'function') {
            db.homeWidgetSettings = clone(context.getDefaultWidgetSettings());
        }
        if (!Array.isArray(db.themePresets)) db.themePresets = [];
        if (!db.themeSettings || typeof db.themeSettings !== 'object') {
            db.themeSettings = { global: {}, wallpapers: {}, bottomNav: {}, chatScreen: {} };
        }
        if (!Array.isArray(db.iconPresets)) db.iconPresets = [];
        if (!Array.isArray(db.homeWidgetPresets)) db.homeWidgetPresets = [];
        if (!Array.isArray(db.widgetWallpaperPresets)) db.widgetWallpaperPresets = [];
        return db;
    }

    async function validatePackage(data, mode) {
        const shape = integrity().validateBackupShape(data, { mode });
        if (!shape.ok) return { ok: false, stage: 'shape', errors: shape.errors, warnings: shape.warnings };
        const checksum = await integrity().verifyPackageIntegrity(data);
        if (!checksum.ok) return { ok: false, stage: 'checksum', errors: checksum.errors || [], warnings: checksum.warnings || [] };
        return { ok: true, stage: 'validated', shape, checksum, warnings: [...(shape.warnings || []), ...(checksum.warnings || [])] };
    }

    function buildFullCandidate(data, context) {
        const converted = convertLegacyBackup(data);
        const candidate = Object.assign(createDefaultRuntimeState(), integrity().stripMetadata(converted));
        return repairImportedRuntimeDb(candidate, context);
    }

    function buildPartialCandidate(data, context) {
        const candidate = clone(context.getDb());
        const tables = Array.isArray(data._exportTables) ? data._exportTables : [];
        tables.forEach((key) => {
            if (key === 'globalSettings' && data.globalSettings) {
                Object.keys(data.globalSettings).forEach(settingKey => {
                    candidate[settingKey] = clone(data.globalSettings[settingKey]);
                });
            } else if (key === 'theaterData' && data.theaterData) {
                Object.keys(data.theaterData).forEach(theaterKey => {
                    candidate[theaterKey] = clone(data.theaterData[theaterKey]);
                });
            } else if (data[key] !== undefined) {
                candidate[key] = clone(data[key]);
            }
        });
        return repairImportedRuntimeDb(candidate, context);
    }

    async function buildImportPlan(data, mode, context) {
        const validation = await validatePackage(data, mode);
        if (!validation.ok) return validation;
        const candidate = mode === 'partial'
            ? buildPartialCandidate(data, context)
            : buildFullCandidate(data, context);
        const stateValidation = integrity().validateRuntimeState(candidate);
        return {
            ok: stateValidation.ok,
            stage: stateValidation.ok ? 'dry-run' : 'candidate',
            validation,
            stateValidation,
            candidate: stateValidation.ok ? candidate : null,
            errors: stateValidation.errors,
            warnings: [...(validation.warnings || []), ...(stateValidation.warnings || [])]
        };
    }

    async function commitImportPlan(plan, context, label) {
        if (!plan || !plan.ok || !plan.candidate) throw new Error('无效的恢复计划，不能提交');
        if (typeof context.showToast === 'function') context.showToast('校验通过，正在原子写入...');
        const commit = await restoreTransaction().commitState(plan.candidate, context);
        return {
            success: true,
            message: label || '导入完成',
            warnings: plan.warnings || [],
            verification: commit.verification,
            preImportSnapshotChecksum: commit.preImportSnapshotChecksum
        };
    }

    async function runImport(data, mode, context) {
        const ctx = getRequiredContext(context);
        const startTime = Date.now();
        const operationLabel = mode === 'partial' ? '分类导入数据' : '完整导入数据';
        try {
            if (typeof ctx.showToast === 'function') ctx.showToast('正在校验备份...');
            const plan = await buildImportPlan(data, mode, ctx);
            if (!plan.ok) {
                const message = (plan.errors || []).join('；') || '备份校验失败';
                recordStorageOperation(operationLabel + '失败', 'error', {
                    stage: plan.stage,
                    warnings: plan.warnings || [],
                    durationMs: Date.now() - startTime
                }, new Error(message));
                return { success: false, error: message, stage: plan.stage, warnings: plan.warnings || [] };
            }
            const result = await commitImportPlan(plan, ctx, `${mode === 'partial' ? '分类' : '完整'}导入完成`);
            result.duration = Date.now() - startTime;
            result.message += ` (耗时${result.duration}ms)`;
            recordStorageOperation(operationLabel, 'success', {
                durationMs: result.duration,
                warnings: result.warnings,
                verification: result.verification,
                snapshotChecksum: result.preImportSnapshotChecksum
            });
            return result;
        } catch (error) {
            console.error(operationLabel + '失败:', error);
            recordStorageOperation(operationLabel + '失败', 'error', {
                stage: 'commit-or-rollback',
                durationMs: Date.now() - startTime,
                rollbackError: error.rollbackError && error.rollbackError.message
            }, error);
            return {
                success: false,
                error: error.message,
                rollbackError: error.rollbackError && error.rollbackError.message,
                duration: Date.now() - startTime
            };
        }
    }

    function importPartialBackupData(data, context) { return runImport(data, 'partial', context); }
    function importBackupData(data, context) { return runImport(data, 'full', context); }

    function bindLegacyBackup(context) {
        if (app.platform.storage.backupAdapter.legacyBackupApi) {
            throw new Error('[backupAdapter] legacyBackupApi 只能绑定一次，避免两套导入导出上下文');
        }
        const api = Object.freeze({
            createFullBackupData: () => createFullBackupData(context),
            createPartialBackupData: selectedKeys => createPartialBackupData(selectedKeys, context),
            importPartialBackupData: data => importPartialBackupData(data, context),
            importBackupData: data => importBackupData(data, context),
            buildImportPlan: (data, mode) => buildImportPlan(data, mode || 'full', context)
        });
        app.platform.storage.backupAdapter.legacyBackupApi = api;
        return api;
    }

    app.platform.storage.backupAdapter = Object.assign(app.platform.storage.backupAdapter || {}, {
        THEATER_DB_KEYS,
        createBackupFilename,
        createFullBackupData,
        createPartialBackupData,
        validatePackage,
        buildImportPlan,
        commitImportPlan,
        importPartialBackupData,
        importBackupData,
        bindLegacyBackup
    });
})(window);
