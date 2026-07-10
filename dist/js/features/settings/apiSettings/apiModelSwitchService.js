// --- Main API model switch service (v0.2.17) ---
// 只负责主 API 模型候选收集和切换；不处理聊天请求、不操作悬浮球 UI。
(function registerApiModelSwitchService(global) {
    const OwoApp = global.OwoApp;
    const apiSettings = OwoApp.features.settings.apiSettings;
    const settingsModel = apiSettings.model;
    const storageRepository = OwoApp.platform.storage.repository;

    function normalizeModelName(value) { return String(value || '').trim(); }
    function normalizeProvider(value) { return String(value || 'newapi').trim() || 'newapi'; }

    function getMainApiSettings() {
        const db = global.db || {};
        if (!db.apiSettings || typeof db.apiSettings !== 'object') db.apiSettings = {};
        return db.apiSettings;
    }

    function getOperationTraceService() {
        return OwoApp.platform && OwoApp.platform.observability
            ? OwoApp.platform.observability.operationTraceService
            : null;
    }

    function recordApiOperation(label, status, event, error) {
        const ops = getOperationTraceService();
        if (!ops || typeof ops.recordOperation !== 'function') return null;
        return ops.recordOperation({
            source: 'features/settings/apiSettings',
            sourceModule: 'apiModelSwitchService',
            action: label,
            label,
            status: status || 'operation',
            data: event || {},
            errorMessage: error && error.message ? error.message : '',
            errorStack: error && error.stack ? String(error.stack) : ''
        });
    }

    function createCandidate(source, data, extra) {
        const normalized = settingsModel.normalizeApiFormData(data || {});
        const modelName = normalizeModelName(normalized.model);
        if (!modelName) return null;
        const provider = normalizeProvider(normalized.provider);
        const sourceName = extra && extra.name ? String(extra.name) : '';
        const suffix = sourceName ? ` · ${sourceName}` : '';
        return {
            id: `${source}:${provider}:${modelName}${suffix}`,
            source,
            name: sourceName,
            label: modelName,
            displayLabel: modelName,
            provider,
            url: normalized.url,
            key: normalized.key,
            model: modelName,
            isCurrent: false
        };
    }

    function uniqueCandidates(candidates) {
        const seen = new Set();
        return candidates.filter(item => {
            if (!item || !item.model) return false;
            const key = [item.source, item.provider, item.url, item.key, item.model, item.name].join('|');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function getDomModelCandidates() {
        const select = document.getElementById('api-model');
        if (!select || !select.options) return [];
        const base = getMainApiSettings();
        return Array.from(select.options)
            .map(option => normalizeModelName(option.value || option.textContent))
            .filter(Boolean)
            .map(model => createCandidate('form', Object.assign({}, base, { model }), { name: '当前表单' }));
    }

    function listMainModels(options = {}) {
        const db = global.db || {};
        const current = settingsModel.normalizeApiFormData(db.apiSettings || {});
        const candidates = [];
        candidates.push(createCandidate('current', current, { name: '已保存' }));
        (db.apiPresets || []).forEach(preset => {
            if (preset && preset.data) candidates.push(createCandidate('preset', preset.data, { name: preset.name }));
        });
        if (options.includeDom !== false) candidates.push(...getDomModelCandidates());
        const unique = uniqueCandidates(candidates);
        unique.forEach(item => {
            item.isCurrent = item.model === current.model
                && item.provider === normalizeProvider(current.provider)
                && (!item.url || !current.url || item.url === current.url);
        });
        return unique;
    }

    function findCandidate(candidateOrModel) {
        const raw = normalizeModelName(candidateOrModel);
        if (!raw) return null;
        return listMainModels({ includeDom: true }).find(item => item.id === raw || item.model === raw) || null;
    }

    function syncVisibleMainApiForm(settings) {
        const map = {
            'api-provider': settings.provider || 'newapi',
            'api-url': settings.url || '',
            'api-key': settings.key || '',
            'api-model': settings.model || ''
        };
        Object.keys(map).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (id === 'api-model' && el.tagName === 'SELECT' && map[id]) {
                const exists = Array.from(el.options || []).some(option => option.value === map[id]);
                if (!exists) {
                    const opt = document.createElement('option');
                    opt.value = map[id];
                    opt.textContent = map[id];
                    el.appendChild(opt);
                }
            }
            el.value = map[id];
        });
    }

    async function switchMainModel(candidateOrModel, options = {}) {
        const startedAt = Date.now();
        const modelName = normalizeModelName(candidateOrModel);
        const currentBefore = settingsModel.normalizeApiFormData(getMainApiSettings());
        try {
            if (!modelName) throw new Error('请选择要切换的模型');
            const candidate = findCandidate(modelName);
            const current = getMainApiSettings();
            const next = candidate
                ? Object.assign({}, current, {
                    provider: candidate.provider || current.provider || 'newapi',
                    url: candidate.url || current.url || '',
                    key: candidate.key || current.key || '',
                    model: candidate.model
                })
                : Object.assign({}, current, { model: modelName });
            if (settingsModel.isBlockedBaseUrl(next.url, global.BLOCKED_API_DOMAINS || [])) {
                throw new Error('该 API 站点已被屏蔽，无法切换');
            }
            global.db.apiSettings = next;
            if (options.syncForm !== false) syncVisibleMainApiForm(next);
            if (options.save !== false) await storageRepository.saveData();
            const result = {
                success: true,
                model: next.model,
                provider: next.provider || 'newapi',
                source: candidate ? candidate.source : 'manual'
            };
            recordApiOperation('切换主模型', 'success', {
                sourceTrigger: options.sourceTrigger || 'apiSettings',
                fromModel: currentBefore.model || '',
                toModel: next.model || '',
                provider: next.provider || 'newapi',
                candidateSource: result.source,
                hasKey: !!next.key,
                saved: options.save !== false,
                syncedForm: options.syncForm !== false,
                durationMs: Date.now() - startedAt
            });
            return result;
        } catch (error) {
            recordApiOperation('切换主模型失败', 'error', {
                sourceTrigger: options.sourceTrigger || 'apiSettings',
                requestedModel: modelName,
                previousModel: currentBefore.model || '',
                previousProvider: currentBefore.provider || '',
                durationMs: Date.now() - startedAt
            }, error);
            throw error;
        }
    }

    function getCurrentMainModel() {
        const settings = settingsModel.normalizeApiFormData(getMainApiSettings());
        return { model: settings.model, provider: settings.provider, url: settings.url, hasKey: !!settings.key };
    }

    apiSettings.apiModelSwitchService = {
        normalizeModelName,
        getCurrentMainModel,
        listMainModels,
        switchMainModel,
        syncVisibleMainApiForm
    };
})(window);
