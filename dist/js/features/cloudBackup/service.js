// --- Cloud backup service (v0.2.17) ---
// 负责 GitHub 云备份用例编排和本地配置；UI 入口、数据管理和悬浮球均应走 public facade。
(function registerCloudBackupService(global) {
    const OwoApp = global.OwoApp;
    const cloudBackup = OwoApp.features.cloudBackup;
    const adapter = OwoApp.platform.storage.githubBackupAdapter;
    const repository = OwoApp.platform.storage.repository;

    const CONFIG_KEY = 'gh_config';
    const DEFAULT_CONFIG = Object.freeze({ token: '', repo: '', auto: false, interval: 48, lastTime: 0, fileName: '' });

    function clone(value) { return JSON.parse(JSON.stringify(value)); }

    function notify(message, duration) {
        const toast = OwoApp.shared && OwoApp.shared.ui ? OwoApp.shared.ui.showToast : null;
        if (typeof toast === 'function') toast(message, duration);
    }

    function getOperationTraceService() {
        return OwoApp.platform && OwoApp.platform.observability
            ? OwoApp.platform.observability.operationTraceService
            : null;
    }

    function sanitizeConfigForTrace(config) {
        const normalized = adapter.normalizeConfig(config || {});
        return {
            repo: normalized.repo || '',
            fileName: normalized.fileName || '',
            auto: !!normalized.auto,
            interval: normalized.interval || 48,
            hasToken: !!normalized.token,
            lastTime: normalized.lastTime || 0
        };
    }

    function recordCloudOperation(label, status, event, error, durationMs) {
        const ops = getOperationTraceService();
        if (!ops || typeof ops.recordOperation !== 'function') return null;
        return ops.recordOperation({
            source: 'features/cloudBackup',
            sourceModule: 'features/cloudBackup/service',
            action: label,
            label,
            status: status || 'operation',
            durationMs: Number.isFinite(durationMs) ? durationMs : 0,
            data: event || {},
            errorMessage: error && error.message ? error.message : '',
            errorStack: error && error.stack ? String(error.stack) : ''
        });
    }

    function requireGlobalObject(name, message) {
        if (global[name] === undefined || global[name] === null) throw new Error(message || `${name} 未加载`);
        return global[name];
    }

    function getBackupContext() {
        return {
            getDb: () => requireGlobalObject('db', '数据库尚未加载，无法执行云备份'),
            getDexieDB: () => requireGlobalObject('dexieDB', 'IndexedDB 尚未加载，无法恢复备份'),
            getGlobalSettingKeys: () => global.globalSettingKeysForBackup || global.globalSettingKeys || [],
            getDefaultWidgetSettings: () => global.defaultWidgetSettings || {},
            saveData: () => repository.saveData(),
            showToast: message => notify(message)
        };
    }

    function loadConfig() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
            return Object.assign(clone(DEFAULT_CONFIG), adapter.normalizeConfig(parsed));
        } catch (error) {
            return clone(DEFAULT_CONFIG);
        }
    }

    function saveConfig(config) {
        const normalized = Object.assign(loadConfig(), adapter.normalizeConfig(config || {}));
        localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function getConfig() { return loadConfig(); }

    function readConfigFromForm() {
        const byId = id => document.getElementById(id);
        const config = {
            token: byId('gh-token-input')?.value || '',
            repo: byId('gh-repo-input')?.value || '',
            fileName: byId('gh-filename-input')?.value || '',
            auto: !!byId('gh-auto-switch')?.checked,
            interval: parseInt(byId('gh-interval-select')?.value, 10) || 48,
            lastTime: loadConfig().lastTime || 0
        };
        return adapter.normalizeConfig(config);
    }

    function syncConfigToForm(config) {
        const byId = id => document.getElementById(id);
        const normalized = Object.assign(loadConfig(), adapter.normalizeConfig(config || {}));
        if (byId('gh-token-input')) byId('gh-token-input').value = normalized.token || '';
        if (byId('gh-repo-input')) byId('gh-repo-input').value = normalized.repo || '';
        if (byId('gh-filename-input')) byId('gh-filename-input').value = normalized.fileName || '';
        if (byId('gh-auto-switch')) byId('gh-auto-switch').checked = !!normalized.auto;
        if (byId('gh-interval-select')) byId('gh-interval-select').value = normalized.interval || 48;
        if (byId('gh-interval-setting')) byId('gh-interval-setting').style.display = normalized.auto ? 'flex' : 'none';
        updateStatusText(normalized);
        return normalized;
    }

    function updateStatusText(config) {
        const el = document.getElementById('gh-status-msg');
        if (!el) return;
        const normalized = config || loadConfig();
        if (!normalized.lastTime) {
            el.innerText = '从未备份过';
            return;
        }
        const date = new Date(normalized.lastTime);
        const nextTime = new Date(normalized.lastTime + (normalized.interval || 48) * 3600000);
        el.innerText = `上次: ${date.toLocaleString()} (下次约: ${nextTime.toLocaleString()})`;
    }

    async function saveConfigFromForm() {
        const startedAt = Date.now();
        const config = saveConfig(readConfigFromForm());
        syncConfigToForm(config);
        recordCloudOperation('保存 GitHub 备份配置', 'success', { config: sanitizeConfigForTrace(config) }, null, Date.now() - startedAt);
        if (config.auto) await checkAndBackup({ silentWhenNotDue: true, sourceTrigger: 'saveConfigFromForm' });
        return config;
    }

    async function backupNow(options = {}) {
        const startedAt = Date.now();
        const config = options.config ? saveConfig(options.config) : loadConfig();
        const sourceTrigger = options.sourceTrigger || 'cloudBackup';
        const onProgress = options.onProgress || (message => notify(message));
        try {
            const result = await adapter.uploadBackup(config, getBackupContext(), { onProgress });
            const nextConfig = saveConfig(Object.assign({}, config, { lastTime: result.timestamp || Date.now() }));
            updateStatusText(nextConfig);
            const output = Object.assign({ success: true }, result);
            recordCloudOperation('GitHub 备份', 'success', { sourceTrigger, config: sanitizeConfigForTrace(nextConfig), result: output }, null, Date.now() - startedAt);
            return output;
        } catch (error) {
            recordCloudOperation('GitHub 备份失败', 'error', { sourceTrigger, config: sanitizeConfigForTrace(config) }, error, Date.now() - startedAt);
            throw error;
        }
    }

    async function checkAndBackup(options = {}) {
        const config = loadConfig();
        if (!config.token || !config.repo || !config.auto) {
            if (!options.silentWhenNotDue) recordCloudOperation('自动备份检查', 'operation', { sourceTrigger: options.sourceTrigger || 'auto', config: sanitizeConfigForTrace(config), skipped: true, reason: 'disabled' });
            return { skipped: true, reason: 'disabled' };
        }
        const hours = (Date.now() - (config.lastTime || 0)) / 3600000;
        if (hours < (config.interval || 48)) {
            if (!options.silentWhenNotDue) recordCloudOperation('自动备份检查', 'operation', { sourceTrigger: options.sourceTrigger || 'auto', config: sanitizeConfigForTrace(config), skipped: true, reason: 'not_due', hours });
            return { skipped: true, reason: 'not_due', hours };
        }
        const onProgress = options.onProgress || (message => notify('自动备份: ' + message));
        return backupNow({ config, onProgress, sourceTrigger: options.sourceTrigger || 'auto' });
    }

    async function checkStatus(config) {
        const startedAt = Date.now();
        const normalized = config || loadConfig();
        try {
            const result = await adapter.checkStatus(normalized);
            recordCloudOperation('检查 GitHub 备份状态', 'success', { config: sanitizeConfigForTrace(normalized), result }, null, Date.now() - startedAt);
            return result;
        } catch (error) {
            recordCloudOperation('检查 GitHub 备份状态失败', 'error', { config: sanitizeConfigForTrace(normalized) }, error, Date.now() - startedAt);
            throw error;
        }
    }

    async function restoreLatest(options = {}) {
        const startedAt = Date.now();
        const config = options.config ? saveConfig(options.config) : loadConfig();
        const sourceTrigger = options.sourceTrigger || 'cloudBackup';
        const onProgress = options.onProgress || (message => notify(message));
        try {
            const data = await adapter.downloadLatestBackupData(config, { onProgress });
            onProgress('解压完成，开始导入...');
            const result = await OwoApp.platform.storage.backupAdapter.importBackupData(data, getBackupContext());
            if (!result.success) throw new Error(result.error || '恢复失败');
            const output = Object.assign({ success: true }, result);
            recordCloudOperation('GitHub 恢复', 'success', { sourceTrigger, config: sanitizeConfigForTrace(config), result: output }, null, Date.now() - startedAt);
            return output;
        } catch (error) {
            recordCloudOperation('GitHub 恢复失败', 'error', { sourceTrigger, config: sanitizeConfigForTrace(config) }, error, Date.now() - startedAt);
            throw error;
        }
    }

    cloudBackup.service = {
        CONFIG_KEY,
        DEFAULT_CONFIG,
        getConfig,
        loadConfig,
        saveConfig,
        readConfigFromForm,
        syncConfigToForm,
        updateStatusText,
        saveConfigFromForm,
        backupNow,
        checkAndBackup,
        checkStatus,
        restoreLatest,
        recordOperation: recordCloudOperation
    };
})(window);
