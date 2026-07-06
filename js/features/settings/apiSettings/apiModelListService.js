// --- API model list service (V18) ---
// 只服务设置页“拉取模型列表”；不处理聊天请求、不处理 stream。
(function registerApiModelListService(global) {
    const OwoApp = global.OwoApp;
    const apiSettings = OwoApp.features.settings.apiSettings;
    const model = apiSettings.model;

    async function fetchModelList(formData, helpers = {}) {
        const normalized = model.normalizeApiFormData(formData);
        if (!normalized.url || !normalized.key) {
            throw new Error('请先填写API地址和密钥！');
        }
        if (model.isBlockedBaseUrl(normalized.url, helpers.blockedDomains || [])) {
            const err = new Error('该 API 站点已被屏蔽，无法使用！');
            err.code = 'BLOCKED_API_DOMAIN';
            throw err;
        }
        const request = model.buildModelListRequest(normalized, {
            getRandomValue: helpers.getRandomValue || OwoApp.shared.utils.getRandomValue
        });
        const response = await fetch(request.endpoint, request.fetchOptions);
        if (!response.ok) {
            const err = new Error(`网络响应错误: ${response.status}`);
            err.response = response;
            throw err;
        }
        const data = await response.json();
        return model.parseModelList(normalized.provider, data);
    }

    function populateModelSelect(modelSelect, models, options = {}) {
        if (!modelSelect) return;
        const currentValue = options.currentValue || modelSelect.value;
        const fallbackValue = options.fallbackValue || '';
        modelSelect.innerHTML = '';
        if (!models.length) {
            modelSelect.innerHTML = '<option value="">未找到任何模型</option>';
            return;
        }
        models.forEach(modelName => {
            const opt = document.createElement('option');
            opt.value = modelName;
            opt.textContent = modelName;
            modelSelect.appendChild(opt);
        });
        if (models.includes(currentValue)) modelSelect.value = currentValue;
        else if (fallbackValue && models.includes(fallbackValue)) modelSelect.value = fallbackValue;
    }

    apiSettings.apiModelListService = {
        fetchModelList,
        populateModelSelect
    };
})(window);
