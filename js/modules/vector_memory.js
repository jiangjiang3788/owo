(function () {
    const uiState = {
        tab: 'entries',
        editingTemplateId: null
    };


    // @compat canonical: OwoApp.features.vectorMemory.model
    const vectorMemoryModel = window.OwoApp.features.vectorMemory.model;
    // @compat canonical: OwoApp.features.vectorMemory.contextService
    const vectorMemoryContextService = window.OwoApp.features.vectorMemory.contextService;
    // @compat canonical: OwoApp.platform.ai.embeddingAdapter
    const vectorEmbeddingAdapter = window.OwoApp.platform.ai.embeddingAdapter;
    const VECTOR_MEMORY_DEFAULT_INTERVAL = vectorMemoryModel.DEFAULTS.interval;
    const VECTOR_MEMORY_DEFAULT_TOP_K = vectorMemoryModel.DEFAULTS.topK;
    const VECTOR_MEMORY_DEFAULT_THRESHOLD = vectorMemoryModel.DEFAULTS.threshold;
    const VECTOR_MEMORY_DEFAULT_MAX_ENTRY_LENGTH = vectorMemoryModel.DEFAULTS.maxEntryLength;
    const createVectorId = vectorMemoryModel.createVectorId;
    const deepClone = vectorMemoryModel.deepClone;
    const createStarterVectorTemplate = vectorMemoryModel.createStarterVectorTemplate;
    const cosineSimilarity = vectorEmbeddingAdapter.cosineSimilarity;
    const trimText = vectorMemoryContextService.trimText;
    const readMessageText = vectorMemoryContextService.readMessageText;
    const formatMessageForMemory = vectorMemoryContextService.formatMessageForMemory;
    const buildHistoryText = vectorMemoryContextService.buildHistoryText;
    const fillTemplateString = vectorMemoryContextService.fillTemplateString;
    const buildVectorQueryText = vectorMemoryContextService.buildVectorQueryText;
    const getEntryTags = vectorMemoryContextService.getEntryTags;
    const buildMemoryListText = vectorMemoryContextService.buildMemoryListText;
    const buildContextBlock = function buildContextBlock(chat, entries, queryText) {
        return vectorMemoryContextService.buildContextBlock(chat, entries, queryText, {state: db});
    };
    const computeLexicalScore = vectorMemoryContextService.computeLexicalScore;
    const selectFallbackEntries = function selectFallbackEntries(chat, queryText) {
        return vectorMemoryContextService.selectFallbackEntries(chat, queryText, {state: db});
    };
    // @compat canonical: OwoApp.platform.ai.embeddingAdapter.fetchEmbeddings
    const fetchEmbeddings = function legacyFetchEmbeddings(texts) {
        return vectorMemoryContextService.fetchEmbeddings(texts, {state: db});
    };
    const embedEntriesIfNeeded = function embedEntriesIfNeeded(entries) {
        return vectorMemoryContextService.embedEntriesIfNeeded(entries, {state: db});
    };

    function ensureVectorTemplateStore() {
        return vectorMemoryModel.ensureVectorTemplateStore(db);
    }

    // @compat canonical: OwoApp.features.vectorMemory.model.ensureVectorMemoryState
    const ensureVectorMemoryState = function legacyEnsureVectorMemoryState(chat) {
        return vectorMemoryModel.ensureVectorMemoryState(chat, {state: db});
    };

    function getActiveVectorTemplate(chat) {
        return vectorMemoryModel.getActiveVectorTemplate(chat, {state: db});
    }

    function clearVectorContextCache(chat) {
        return vectorMemoryModel.clearVectorContextCache(chat, {state: db});
    }

    // @compat canonical: OwoApp.features.vectorMemory.contextService.getVectorMemoryContextBlock
    const getVectorMemoryContextBlock = function legacyGetVectorMemoryContextBlock(chat, options = {}) {
        return vectorMemoryContextService.getVectorMemoryContextBlock(chat, {...options, state: db});
    };

    // @compat canonical: OwoApp.features.vectorMemory.contextService.prepareVectorMemoryContext
    const prepareVectorMemoryContext = function legacyPrepareVectorMemoryContext(chat, options = {}) {
        return vectorMemoryContextService.prepareVectorMemoryContext(chat, {...options, state: db});
    };

    function pushVectorHistory(chat, action, summary) {
        return vectorMemoryModel.pushVectorHistory(chat, action, summary, {state: db});
    }

    function inferEntryTitle(text) {
        return vectorMemoryModel.inferEntryTitle(text);
    }

    function addVectorEntry(chat, payload) {
        return vectorMemoryContextService.addVectorEntry(chat, payload, {state: db});
    }

    function getAutoVectorCursorInfo(chat) {
        return vectorMemoryModel.getAutoVectorCursorInfo(chat, {state: db});
    }

    function getNextAutoVectorRange(chat) {
        return vectorMemoryModel.getNextAutoVectorRange(chat, {state: db});
    }

    function setVectorCursorByEndIndex(chat, endIndex) {
        return vectorMemoryModel.setVectorCursorByEndIndex(chat, endIndex, {state: db});
    }

    // @compat canonical: OwoApp.features.vectorMemory.model.resetVectorCursorToLatest
    const resetVectorCursorToLatest = function legacyResetVectorCursorToLatest(chat) {
        return vectorMemoryModel.resetVectorCursorToLatest(chat, {state: db});
    };

    function getCurrentVectorChat() {
        if (!currentChatId || currentChatType !== 'private') return null;
        const chat = db.characters.find(item => item.id === currentChatId);
        if (chat) ensureVectorMemoryState(chat);
        return chat || null;
    }

    function getSummaryApiConfig() {
        const apiConfig = (db.summaryApiSettings && db.summaryApiSettings.url && db.summaryApiSettings.key && db.summaryApiSettings.model)
            ? db.summaryApiSettings
            : db.apiSettings;
        if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) {
            throw new Error('请先配置总结 API');
        }
        return apiConfig;
    }

    async function requestVectorSummary(prompt, temperature) {
        const apiConfig = getSummaryApiConfig();
        let { url, key, model } = apiConfig;
        url = (url || '').replace(/\/$/, '');
        const provider = apiConfig.provider || 'newapi';
        const endpoint = provider === 'gemini'
            ? `${url}/v1beta/models/${model}:generateContent?key=${getRandomValue(key)}`
            : `${url}/v1/chat/completions`;
        const headers = provider === 'gemini'
            ? { 'Content-Type': 'application/json' }
            : {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`
            };
        const requestBody = provider === 'gemini'
            ? {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature }
            }
            : {
                model,
                temperature,
                messages: [{ role: 'user', content: prompt }]
            };
        return fetchAiResponse(apiConfig, requestBody, headers, endpoint);
    }

function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

function parseVectorSummaryXml(rawContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(`<root>${rawContent || ''}</root>`, 'text/xml');
        if (xmlDoc.querySelector('parsererror')) {
            return null;
        }
        return {
            title: xmlDoc.querySelector('title')?.textContent?.trim() || '',
            content: xmlDoc.querySelector('content')?.textContent?.trim() || '',
            tags: (xmlDoc.querySelector('tags')?.textContent || '')
                .split(',')
                .map(item => item.trim())
                .filter(Boolean)
        };
    }

    async function summarizeRangeToVectorEntry(chat, start, end, options = {}) {
        ensureVectorMemoryState(chat);
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        if (start < 1 || end < start || end > history.length) {
            throw new Error('请输入有效的总结范围');
        }
        const template = getActiveVectorTemplate(chat);
        const historyText = buildHistoryText(chat, start - 1, end);
        if (!historyText.trim()) {
            throw new Error('当前范围内没有可总结的消息');
        }
        const prompt = fillTemplateString(template?.summaryPrompt || '', {
            charName: chat.realName || '',
            userName: chat.myName || '',
            rangeLabel: `${start}-${end}`,
            history: historyText
        });
        const rawContent = await requestVectorSummary(prompt, Number(template?.summaryTemperature) || 0.35);
        const parsed = parseVectorSummaryXml(rawContent);
        const summaryText = parsed && parsed.content
            ? trimText(parsed.content, Math.max(200, parseInt(template?.maxEntryLength, 10) || VECTOR_MEMORY_DEFAULT_MAX_ENTRY_LENGTH))
            : trimText(String(rawContent || '').replace(/<[^>]+>/g, '').trim(), Math.max(200, parseInt(template?.maxEntryLength, 10) || VECTOR_MEMORY_DEFAULT_MAX_ENTRY_LENGTH));
        if (!summaryText) {
            throw new Error('没有提取到有效的向量记忆内容');
        }
        const entry = await addVectorEntry(chat, {
            title: parsed && parsed.title ? parsed.title : `记忆 ${start}-${end}`,
            text: summaryText,
            tags: parsed ? parsed.tags : [],
            source: options.source || 'manual_summary',
            range: { start, end }
        });
        entry.rangeLabel = `${start}-${end}`;
        pushVectorHistory(chat, options.source || 'manual_summary', `总结消息 ${start}-${end}`);
        return entry;
    }

async function runVectorAutoSummary(chat, options = {}) {
        ensureVectorMemoryState(chat);
        if (!chat.vectorMemory.autoSummaryEnabled && !options.force) return 0;
        if (chat.vectorMemory.autoSummaryState === 'running') return 0;
        if (chat.vectorMemory.autoSummaryState === 'failed' && !options.ignoreFailedState) return 0;
        const nextRange = getNextAutoVectorRange(chat);
        if (!nextRange) {
            if (!options.silent) showToast('当前没有可补的向量自动总结范围');
            return 0;
        }
        chat.vectorMemory.autoSummaryState = 'running';
        chat.vectorMemory.autoSummaryPending = false;
        try {
            await summarizeRangeToVectorEntry(chat, nextRange.start, nextRange.end, { source: 'auto_summary' });
            setVectorCursorByEndIndex(chat, nextRange.end);
            chat.vectorMemory.autoSummaryState = 'idle';
            await saveCharacter(chat.id);
            return 1;
        } catch (error) {
            chat.vectorMemory.autoSummaryState = 'failed';
            chat.vectorMemory.autoSummaryPending = false;
            await saveCharacter(chat.id);
            throw error;
        }
    }

    async function checkAndTriggerVectorMemory(chat) {
        if (!chat) return;
        if (!db.characters || !db.characters.some(item => item.id === chat.id)) return;
        ensureVectorMemoryState(chat);
        if (!chat.vectorMemory.autoSummaryEnabled) return;
        if (chat.vectorMemory.autoSummaryState === 'running' || chat.vectorMemory.autoSummaryState === 'failed') return;
        const nextRange = getNextAutoVectorRange(chat);
        if (!nextRange) return;
        try {
            await runVectorAutoSummary(chat, { silent: true });
        } catch (error) {
            console.error('[VectorMemory] auto summary failed:', error);
        }
    }

    function buildEntriesAggregateText(chat) {
        ensureVectorMemoryState(chat);
        return chat.vectorMemory.entries
            .slice()
            .sort((a, b) => (b.pinned === a.pinned) ? ((b.updatedAt || 0) - (a.updatedAt || 0)) : (a.pinned ? -1 : 1))
            .map(item => `标题：${item.title}\n来源：${item.source || 'manual'}\n内容：${item.text}`)
            .join('\n\n---\n\n');
    }

    function createJournalEntry(chat, title, content, source) {
        if (!Array.isArray(chat.memoryJournals)) chat.memoryJournals = [];
        chat.memoryJournals.unshift({
            id: createVectorId('journal'),
            range: null,
            title: title || '向量记忆整理',
            content,
            createdAt: Date.now(),
            chatId: chat.id,
            chatType: 'private',
            isFavorited: true,
            source: source || 'vector_memory_conversion'
        });
    }

    async function convertVectorToJournal() {
        const chat = getCurrentVectorChat();
        if (!chat) {
            showToast('请先进入一个角色聊天');
            return;
        }
        ensureVectorMemoryState(chat);
        if (!chat.vectorMemory.entries.length) {
            showToast('当前没有可转换的向量记忆');
            return;
        }
        const text = buildEntriesAggregateText(chat);
        const prompt = [
            '请把下面这些向量记忆整理成一篇适合长期回忆的客观记忆日记。',
            '只输出以下 XML：',
            '<journal>',
            '  <title>标题</title>',
            '  <content>正文</content>',
            '</journal>',
            '',
            '要求：',
            '1. 不要编造。',
            '2. 保持时间线和事件逻辑。',
            '3. 适合导入回忆日记作为长期记忆。',
            '',
            text
        ].join('\n');
        try {
            const rawContent = await requestVectorSummary(prompt, 0.45);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(`<root>${rawContent || ''}</root>`, 'text/xml');
            if (xmlDoc.querySelector('parsererror')) {
                throw new Error('向量转日记返回格式解析失败');
            }
            const title = xmlDoc.querySelector('title')?.textContent?.trim() || '向量记忆整理';
            const content = xmlDoc.querySelector('content')?.textContent?.trim() || '';
            if (!content) {
                throw new Error('没有提取到有效日记内容');
            }
            createJournalEntry(chat, title, content, 'vector_to_journal');
            pushVectorHistory(chat, 'vector_to_journal', '已生成 1 篇日记');
            await saveCharacter(chat.id);
            showToast('已根据向量记忆生成新日记');
        } catch (error) {
            console.error('[VectorMemory] vector to journal failed:', error);
            if (typeof showApiError === 'function') showApiError(error);
            else showToast(error.message || '向量转日记失败');
        }
    }

    async function convertJournalsToVector() {
        const chat = getCurrentVectorChat();
        if (!chat) {
            showToast('请先进入一个角色聊天');
            return;
        }
        const journals = (chat.memoryJournals || []).slice();
        if (journals.length === 0) {
            showToast('当前没有可转换的日记');
            return;
        }
        const prepared = journals.map(item => ({
            id: createVectorId('vector_entry'),
            title: item.title || '日记导入',
            text: trimText(item.content || '', 1200),
            vector: [],
            tags: ['日记转换'],
            source: 'from_journal',
            pinned: !!item.isFavorited,
            weight: item.isFavorited ? 1.15 : 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            range: item.range || null,
            meta: { journalId: item.id }
        }));
        try {
            await embedEntriesIfNeeded(prepared);
            prepared.reverse().forEach(entry => {
                chat.vectorMemory.entries.unshift(entry);
            });
            pushVectorHistory(chat, 'journal_to_vector', `已导入 ${prepared.length} 条日记为向量记忆`);
            clearVectorContextCache(chat);
            await saveCharacter(chat.id);
            renderVectorMemoryScreen();
            showToast(`已将 ${prepared.length} 篇日记转为向量记忆`);
        } catch (error) {
            console.error('[VectorMemory] journal to vector failed:', error);
            if (typeof showApiError === 'function') showApiError(error);
            else showToast(error.message || '日记转向量失败');
        }
    }

    async function convertTableToVector() {
        const chat = getCurrentVectorChat();
        if (!chat) {
            showToast('请先进入一个角色聊天');
            return;
        }
        const tableContext = typeof window.exportMemoryTableContext === 'function'
            ? window.exportMemoryTableContext(chat, { force: true })
            : (typeof getMemoryTableContextBlock === 'function' ? getMemoryTableContextBlock(chat, { force: true }) : '');
        if (!tableContext) {
            showToast('当前没有可转换的表格记忆');
            return;
        }
        try {
            await addVectorEntry(chat, {
                title: '结构记忆快照',
                text: tableContext,
                tags: ['表格转换'],
                source: 'from_table',
                pinned: true
            });
            pushVectorHistory(chat, 'table_to_vector', '已保存一份结构记忆快照');
            await saveCharacter(chat.id);
            renderVectorMemoryScreen();
            showToast('已将当前表格记忆转为向量记忆');
        } catch (error) {
            console.error('[VectorMemory] table to vector failed:', error);
            if (typeof showApiError === 'function') showApiError(error);
            else showToast(error.message || '表格转向量失败');
        }
    }

    async function convertVectorToTable() {
        const chat = getCurrentVectorChat();
        if (!chat) {
            showToast('请先进入一个角色聊天');
            return;
        }
        if (!chat.vectorMemory.entries.length) {
            showToast('当前没有可转换的向量记忆');
            return;
        }
        if (typeof window.convertTextToMemoryTable !== 'function') {
            showToast('结构化记忆转换能力未加载');
            return;
        }
        try {
            const text = buildEntriesAggregateText(chat);
            const changedCount = await window.convertTextToMemoryTable(chat, text, { source: 'vector_memory_conversion' });
            renderVectorMemoryScreen();
            showToast(changedCount > 0 ? `已写入 ${changedCount} 项表格变更` : '没有检测到可更新的表格字段');
        } catch (error) {
            console.error('[VectorMemory] vector to table failed:', error);
            if (typeof showApiError === 'function') showApiError(error);
            else showToast(error.message || '向量转表格失败');
        }
    }

    function buildVectorPackagePayload(chat) {
        ensureVectorMemoryState(chat);
        const template = getActiveVectorTemplate(chat);
        return {
            type: 'vector_memory_package',
            version: 1,
            template: template ? deepClone(template) : null,
            binding: {
                memoryMode: chat.memoryMode,
                autoSummaryEnabled: !!chat.vectorMemory.autoSummaryEnabled,
                autoSummaryInterval: chat.vectorMemory.autoSummaryInterval || VECTOR_MEMORY_DEFAULT_INTERVAL,
                boundTemplateId: template ? template.id : null
            },
            entries: deepClone(chat.vectorMemory.entries || [])
        };
    }

    function downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function exportVectorTemplates() {
        ensureVectorTemplateStore();
        downloadJson(db.vectorMemoryTemplates || [], 'vector-memory-templates.json');
    }

    function exportVectorMemoryPackage() {
        const chat = getCurrentVectorChat();
        if (!chat) {
            showToast('请先进入一个角色聊天');
            return;
        }
        ensureVectorMemoryState(chat);
        if (!chat.vectorMemory.entries.length) {
            showToast('当前没有可导出的向量记忆');
            return;
        }
        downloadJson(buildVectorPackagePayload(chat), `${chat.remarkName || chat.realName || 'vector'}_vector_memory_package.json`);
    }

    function cloneTemplateWithFreshId(template) {
        return {
            ...deepClone(template),
            id: createVectorId('vector_tpl')
        };
    }

    async function importVectorFile(file) {
        if (!file) return;
        let parsed;
        try {
            parsed = JSON.parse(await file.text());
        } catch (error) {
            showToast('导入失败：JSON 无法解析');
            return;
        }
        ensureVectorTemplateStore();
        const chat = getCurrentVectorChat();
        if (parsed && parsed.type === 'vector_memory_package') {
            let importedTemplate = null;
            if (parsed.template) {
                importedTemplate = cloneTemplateWithFreshId(parsed.template);
                db.vectorMemoryTemplates.unshift(importedTemplate);
            }
            if (chat && Array.isArray(parsed.entries)) {
                ensureVectorMemoryState(chat);
                const importedEntries = deepClone(parsed.entries).map(entry => ({
                    ...entry,
                    id: createVectorId('vector_entry'),
                    vector: Array.isArray(entry.vector) ? entry.vector : [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }));
                chat.vectorMemory.entries.unshift(...importedEntries.reverse());
                if (parsed.binding) {
                    chat.vectorMemory.autoSummaryEnabled = !!parsed.binding.autoSummaryEnabled;
                    chat.vectorMemory.autoSummaryInterval = Math.max(10, parseInt(parsed.binding.autoSummaryInterval, 10) || VECTOR_MEMORY_DEFAULT_INTERVAL);
                    if (importedTemplate) {
                        chat.vectorMemory.boundTemplateId = importedTemplate.id;
                    }
                    if (parsed.binding.memoryMode) {
                        chat.memoryMode = parsed.binding.memoryMode;
                    }
                }
                try {
                    await embedEntriesIfNeeded(chat.vectorMemory.entries);
                } catch (error) {
                    console.warn('[VectorMemory] import package embed fallback:', error);
                }
                pushVectorHistory(chat, 'import_package', `已导入 ${importedEntries.length} 条向量记忆`);
                clearVectorContextCache(chat);
                await saveCharacter(chat.id);
            }
            await saveData();
            renderVectorMemoryScreen();
            showToast('已导入向量模板/记忆包');
            return;
        }

        const list = Array.isArray(parsed) ? parsed : [parsed];
        const templates = list.filter(item => item && item.name && (item.summaryPrompt || item.injectPrompt));
        if (templates.length === 0) {
            showToast('未在文件中找到有效的向量模板');
            return;
        }
        templates.forEach(template => {
            db.vectorMemoryTemplates.unshift(cloneTemplateWithFreshId(template));
        });
        await saveData();
        renderVectorMemoryScreen();
        showToast(`已导入 ${templates.length} 个向量模板`);
    }

    function renderVectorEntriesTab(chat) {
        const content = document.getElementById('vector-memory-content');
        if (!content) return;
        ensureVectorMemoryState(chat);
        const activeIds = new Set(chat.vectorMemory.lastRetrievedEntryIds || []);
        if (chat.vectorMemory.entries.length === 0) {
            content.innerHTML = '<div class="vector-memory-empty-card">还没有向量记忆。可以先手动总结，或把日记/表格转过来。</div>';
            return;
        }
        content.innerHTML = chat.vectorMemory.entries.map(entry => `
            <div class="vector-memory-card ${activeIds.has(entry.id) ? 'is-hit' : ''}">
                <div class="vector-memory-card-head">
                    <div>
                        <div class="vector-memory-card-title">${escapeHtml(entry.title || '未命名记忆')}</div>
                        <div class="vector-memory-card-meta">
                            <span>${escapeHtml(entry.source || 'manual')}</span>
                            <span>${new Date(entry.updatedAt || entry.createdAt || Date.now()).toLocaleString()}</span>
                            ${entry.range ? `<span>范围 ${entry.range.start}-${entry.range.end}</span>` : ''}
                            ${activeIds.has(entry.id) ? '<span>当前命中</span>' : ''}
                        </div>
                    </div>
                    <div class="vector-memory-card-actions">
                        <button type="button" class="btn btn-small ${entry.pinned ? 'btn-primary' : 'btn-secondary'}" data-action="toggle-pin" data-entry-id="${entry.id}">${entry.pinned ? '已置顶' : '置顶'}</button>
                        <button type="button" class="btn btn-small btn-secondary" data-action="boost-weight" data-entry-id="${entry.id}">加权</button>
                        <button type="button" class="btn btn-small btn-danger" data-action="delete-entry" data-entry-id="${entry.id}">删除</button>
                    </div>
                </div>
                <div class="vector-memory-card-body">${escapeHtml(entry.text || '')}</div>
                <div class="vector-memory-card-tags">${getEntryTags(entry) ? `标签：${escapeHtml(getEntryTags(entry))}` : '标签：暂无'} · 权重 ${Number(entry.weight || 1).toFixed(2)}</div>
            </div>
        `).join('');
    }

    function renderVectorTemplatesTab(chat) {
        const content = document.getElementById('vector-memory-content');
        if (!content) return;
        ensureVectorTemplateStore();
        ensureVectorMemoryState(chat);
        content.innerHTML = db.vectorMemoryTemplates.map(template => {
            const isActive = chat.vectorMemory.boundTemplateId === template.id;
            return `
                <div class="vector-memory-card ${isActive ? 'is-hit' : ''}">
                    <div class="vector-memory-card-head">
                        <div>
                            <div class="vector-memory-card-title">${escapeHtml(template.name || '未命名模板')}</div>
                            <div class="vector-memory-card-meta">
                                <span>TopK ${template.topK || VECTOR_MEMORY_DEFAULT_TOP_K}</span>
                                <span>阈值 ${Number(template.similarityThreshold || VECTOR_MEMORY_DEFAULT_THRESHOLD).toFixed(2)}</span>
                                <span>最长 ${template.maxEntryLength || VECTOR_MEMORY_DEFAULT_MAX_ENTRY_LENGTH} 字</span>
                            </div>
                        </div>
                        <div class="vector-memory-card-actions">
                            <button type="button" class="btn btn-small ${isActive ? 'btn-primary' : 'btn-secondary'}" data-action="bind-template" data-template-id="${template.id}">${isActive ? '当前使用中' : '绑定到当前角色'}</button>
                            <button type="button" class="btn btn-small btn-secondary" data-action="edit-template" data-template-id="${template.id}">编辑</button>
                            <button type="button" class="btn btn-small btn-secondary" data-action="export-template" data-template-id="${template.id}">导出</button>
                            <button type="button" class="btn btn-small btn-danger" data-action="delete-template" data-template-id="${template.id}">删除</button>
                        </div>
                    </div>
                    <div class="vector-memory-card-body">${escapeHtml(template.description || '暂无描述')}</div>
                </div>
            `;
        }).join('');
    }

    function renderVectorHistoryTab(chat) {
        const content = document.getElementById('vector-memory-content');
        if (!content) return;
        ensureVectorMemoryState(chat);
        if (!chat.vectorMemory.history.length) {
            content.innerHTML = '<div class="vector-memory-empty-card">还没有操作记录。</div>';
            return;
        }
        content.innerHTML = chat.vectorMemory.history.map(item => `
            <div class="vector-memory-card">
                <div class="vector-memory-card-head">
                    <div>
                        <div class="vector-memory-card-title">${escapeHtml(item.action || 'history')}</div>
                        <div class="vector-memory-card-meta">
                            <span>${new Date(item.createdAt || Date.now()).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div class="vector-memory-card-body">${escapeHtml(item.summary || '')}</div>
            </div>
        `).join('');
    }

    function refreshVectorAutoControls(chat) {
        const toggle = document.getElementById('vector-memory-auto-toggle');
        const intervalInput = document.getElementById('vector-memory-auto-interval');
        const status = document.getElementById('vector-memory-auto-status');
        if (!toggle || !intervalInput || !status) return;
        if (!chat) {
            toggle.checked = false;
            intervalInput.value = VECTOR_MEMORY_DEFAULT_INTERVAL;
            status.textContent = '独立自动总结：未启用';
            return;
        }
        ensureVectorMemoryState(chat);
        const info = getAutoVectorCursorInfo(chat);
        toggle.checked = !!chat.vectorMemory.autoSummaryEnabled;
        intervalInput.value = chat.vectorMemory.autoSummaryInterval || VECTOR_MEMORY_DEFAULT_INTERVAL;
        const state = chat.vectorMemory.autoSummaryState || 'idle';
        status.textContent = `独立自动总结：${chat.vectorMemory.autoSummaryEnabled ? '已开启' : '已关闭'} · 未处理消息 ${info.unsummarizedCount} 条 · 状态 ${state}`;
    }

    function refreshVectorHeader(chat) {
        const summary = document.getElementById('vector-memory-chat-summary');
        const modePill = document.getElementById('vector-memory-mode-pill');
        if (!summary || !modePill) return;
        if (!chat) {
            summary.textContent = '请先进入一个私聊角色。';
            modePill.textContent = '未选择角色';
            modePill.style.background = 'rgba(160,160,160,0.12)';
            modePill.style.color = '#666';
            return;
        }
        ensureVectorMemoryState(chat);
        const template = getActiveVectorTemplate(chat);
        summary.textContent = `${chat.remarkName || chat.realName || '当前角色'} · ${chat.vectorMemory.entries.length} 条向量记忆 · 模板 ${template ? template.name : '未绑定'}`;
        const map = {
            journal: { label: '日记模式', bg: 'rgba(255, 181, 71, 0.12)', color: '#b26a00' },
            table: { label: '表格模式', bg: 'rgba(73, 129, 255, 0.12)', color: '#335eea' },
            vector: { label: '向量模式', bg: 'rgba(116, 87, 255, 0.12)', color: '#5a38d6' }
        };
        const meta = map[chat.memoryMode] || map.journal;
        modePill.textContent = meta.label;
        modePill.style.background = meta.bg;
        modePill.style.color = meta.color;
        document.querySelectorAll('[data-vector-memory-mode-switch]').forEach(button => {
            button.classList.toggle('btn-primary', button.dataset.vectorMemoryModeSwitch === chat.memoryMode);
            button.classList.toggle('btn-secondary', button.dataset.vectorMemoryModeSwitch !== chat.memoryMode);
        });
    }

    function renderVectorMemoryScreen() {
        const chat = getCurrentVectorChat();
        const screen = document.getElementById('vector-memory-screen');
        if (!screen) return;
        refreshVectorHeader(chat);
        refreshVectorAutoControls(chat);
        document.querySelectorAll('.vector-memory-tab-btn').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === uiState.tab);
            button.classList.toggle('btn-primary', button.dataset.tab === uiState.tab);
            button.classList.toggle('btn-secondary', button.dataset.tab !== uiState.tab);
        });
        if (!chat) {
            const content = document.getElementById('vector-memory-content');
            if (content) {
                content.innerHTML = '<div class="vector-memory-empty-card">向量记忆暂时只支持单角色私聊。</div>';
            }
            return;
        }
        if (uiState.tab === 'templates') renderVectorTemplatesTab(chat);
        else if (uiState.tab === 'history') renderVectorHistoryTab(chat);
        else renderVectorEntriesTab(chat);
    }

    function openTemplateModal(template) {
        const modal = document.getElementById('vector-template-modal');
        if (!modal) return;
        uiState.editingTemplateId = template ? template.id : null;
        document.getElementById('vector-template-name').value = template?.name || '';
        document.getElementById('vector-template-description').value = template?.description || '';
        document.getElementById('vector-template-topk').value = template?.topK || VECTOR_MEMORY_DEFAULT_TOP_K;
        document.getElementById('vector-template-threshold').value = template?.similarityThreshold || VECTOR_MEMORY_DEFAULT_THRESHOLD;
        document.getElementById('vector-template-max-length').value = template?.maxEntryLength || VECTOR_MEMORY_DEFAULT_MAX_ENTRY_LENGTH;
        document.getElementById('vector-template-summary-prompt').value = template?.summaryPrompt || createStarterVectorTemplate().summaryPrompt;
        document.getElementById('vector-template-inject-prompt').value = template?.injectPrompt || createStarterVectorTemplate().injectPrompt;
        modal.classList.add('visible');
    }

    function closeTemplateModal() {
        const modal = document.getElementById('vector-template-modal');
        if (modal) modal.classList.remove('visible');
        uiState.editingTemplateId = null;
    }

    async function saveTemplateFromModal() {
        ensureVectorTemplateStore();
        const name = (document.getElementById('vector-template-name')?.value || '').trim();
        if (!name) {
            showToast('模板名称不能为空');
            return;
        }
        const template = {
            id: uiState.editingTemplateId || createVectorId('vector_tpl'),
            name,
            description: (document.getElementById('vector-template-description')?.value || '').trim(),
            topK: Math.max(1, parseInt(document.getElementById('vector-template-topk')?.value, 10) || VECTOR_MEMORY_DEFAULT_TOP_K),
            similarityThreshold: Math.max(0, Math.min(1, parseFloat(document.getElementById('vector-template-threshold')?.value) || VECTOR_MEMORY_DEFAULT_THRESHOLD)),
            maxEntryLength: Math.max(200, parseInt(document.getElementById('vector-template-max-length')?.value, 10) || VECTOR_MEMORY_DEFAULT_MAX_ENTRY_LENGTH),
            summaryPrompt: (document.getElementById('vector-template-summary-prompt')?.value || '').trim(),
            injectPrompt: (document.getElementById('vector-template-inject-prompt')?.value || '').trim(),
            summaryTemperature: 0.35
        };
        const index = db.vectorMemoryTemplates.findIndex(item => item.id === template.id);
        if (index >= 0) db.vectorMemoryTemplates[index] = template;
        else db.vectorMemoryTemplates.unshift(template);
        const chat = getCurrentVectorChat();
        if (chat && !chat.vectorMemory.boundTemplateId) {
            chat.vectorMemory.boundTemplateId = template.id;
        }
        await saveData();
        if (chat) await saveCharacter(chat.id);
        closeTemplateModal();
        renderVectorMemoryScreen();
        showToast('向量模板已保存');
    }

    function openManualModal() {
        const chat = getCurrentVectorChat();
        const modal = document.getElementById('vector-manual-modal');
        if (!chat || !modal) return;
        const historyLength = Array.isArray(chat.history) ? chat.history.length : 0;
        document.getElementById('vector-manual-recent-count').value = Math.max(1, Math.min(40, historyLength || 20));
        document.getElementById('vector-manual-range-start').value = Math.max(1, historyLength - 19);
        document.getElementById('vector-manual-range-end').value = historyLength || 1;
        document.getElementById('vector-manual-title').value = '';
        document.getElementById('vector-manual-text').value = '';
        modal.classList.add('visible');
    }

    function closeManualModal() {
        const modal = document.getElementById('vector-manual-modal');
        if (modal) modal.classList.remove('visible');
    }

    async function submitManualSummary() {
        const chat = getCurrentVectorChat();
        if (!chat) return;
        const mode = document.querySelector('input[name="vector-manual-mode"]:checked')?.value || 'recent';
        try {
            if (mode === 'text') {
                await addVectorEntry(chat, {
                    title: (document.getElementById('vector-manual-title')?.value || '').trim(),
                    text: (document.getElementById('vector-manual-text')?.value || '').trim(),
                    source: 'manual_text',
                    pinned: true
                });
                pushVectorHistory(chat, 'manual_text', '手动录入 1 条向量记忆');
            } else if (mode === 'range') {
                const start = Math.max(1, parseInt(document.getElementById('vector-manual-range-start')?.value, 10) || 1);
                const end = Math.max(start, parseInt(document.getElementById('vector-manual-range-end')?.value, 10) || start);
                await summarizeRangeToVectorEntry(chat, start, end, { source: 'manual_range' });
            } else {
                const recentCount = Math.max(1, parseInt(document.getElementById('vector-manual-recent-count')?.value, 10) || 20);
                const history = Array.isArray(chat.history) ? chat.history : [];
                const start = Math.max(1, history.length - recentCount + 1);
                const end = history.length;
                await summarizeRangeToVectorEntry(chat, start, end, { source: 'manual_recent' });
            }
            await saveCharacter(chat.id);
            closeManualModal();
            renderVectorMemoryScreen();
            showToast('向量记忆已生成');
        } catch (error) {
            console.error('[VectorMemory] manual summary failed:', error);
            if (typeof showApiError === 'function' && /API/i.test(error.message || '')) showApiError(error);
            else showToast(error.message || '手动总结失败');
        }
    }

    async function summarizeVectorLatest(chat) {
        ensureVectorMemoryState(chat);
        const info = getAutoVectorCursorInfo(chat);
        if (info.unsummarizedCount <= 0) {
            showToast('当前没有新增消息需要总结');
            return;
        }
        const start = info.nextStartIndex + 1;
        const end = info.history.length;
        await summarizeRangeToVectorEntry(chat, start, end, { source: 'latest_summary' });
        setVectorCursorByEndIndex(chat, end);
        await saveCharacter(chat.id);
        renderVectorMemoryScreen();
        showToast(`已总结到最新（第${start}-${end}条）`);
    }

    async function retryVectorAutoSummary(chat) {
        ensureVectorMemoryState(chat);
        if (chat.vectorMemory.autoSummaryState === 'running') {
            showToast('向量自动总结进行中，请稍候...');
            return;
        }
        let count = 0;
        try {
            while (getNextAutoVectorRange(chat)) {
                count += await runVectorAutoSummary(chat, { force: true, ignoreFailedState: true, silent: true });
            }
            renderVectorMemoryScreen();
            showToast(count > 0 ? `已补做 ${count} 次向量自动总结` : '当前没有可补的向量自动总结范围');
        } catch (error) {
            console.error('[VectorMemory] retry auto summary failed:', error);
            if (typeof showApiError === 'function') showApiError(error);
            else showToast(error.message || '向量自动总结失败');
        }
    }

    async function bindTemplateToCurrentChat(templateId) {
        const chat = getCurrentVectorChat();
        if (!chat) return;
        ensureVectorMemoryState(chat);
        chat.vectorMemory.boundTemplateId = templateId;
        clearVectorContextCache(chat);
        await saveCharacter(chat.id);
        renderVectorMemoryScreen();
        showToast('已绑定新的向量模板');
    }

    async function deleteTemplate(templateId) {
        if (!window.confirm('确定删除这个向量模板吗？')) return;
        const index = db.vectorMemoryTemplates.findIndex(item => item.id === templateId);
        if (index < 0) return;
        db.vectorMemoryTemplates.splice(index, 1);
        ensureVectorTemplateStore();
        db.characters.forEach(chat => {
            ensureVectorMemoryState(chat);
            if (chat.vectorMemory.boundTemplateId === templateId) {
                chat.vectorMemory.boundTemplateId = db.vectorMemoryTemplates[0]?.id || null;
                clearVectorContextCache(chat);
            }
        });
        await saveData();
        renderVectorMemoryScreen();
        showToast('向量模板已删除');
    }

    function exportTemplate(templateId) {
        const template = db.vectorMemoryTemplates.find(item => item.id === templateId);
        if (!template) return;
        downloadJson(template, `${template.name || 'vector-template'}.json`);
    }

    async function handleEntryAction(action, entryId) {
        const chat = getCurrentVectorChat();
        if (!chat) return;
        ensureVectorMemoryState(chat);
        const entry = chat.vectorMemory.entries.find(item => item.id === entryId);
        if (!entry) return;
        if (action === 'toggle-pin') {
            entry.pinned = !entry.pinned;
            entry.updatedAt = Date.now();
            clearVectorContextCache(chat);
            await saveCharacter(chat.id);
            renderVectorMemoryScreen();
            showToast(entry.pinned ? '已置顶该记忆' : '已取消置顶');
        } else if (action === 'boost-weight') {
            entry.weight = Math.min(3, (Number(entry.weight) || 1) + 0.15);
            entry.updatedAt = Date.now();
            clearVectorContextCache(chat);
            await saveCharacter(chat.id);
            renderVectorMemoryScreen();
            showToast(`记忆权重已提升到 ${entry.weight.toFixed(2)}`);
        } else if (action === 'delete-entry') {
            if (!window.confirm('确定删除这条向量记忆吗？')) return;
            chat.vectorMemory.entries = chat.vectorMemory.entries.filter(item => item.id !== entryId);
            pushVectorHistory(chat, 'delete', `删除记忆：${entry.title}`);
            clearVectorContextCache(chat);
            await saveCharacter(chat.id);
            renderVectorMemoryScreen();
            showToast('向量记忆已删除');
        }
    }

    function switchVectorMemoryMode(mode) {
        const chat = getCurrentVectorChat();
        if (!chat) return;
        if (!['journal', 'table', 'vector'].includes(mode)) return;
        chat.memoryMode = mode;
        saveCharacter(chat.id);
        renderVectorMemoryScreen();
        showToast(mode === 'journal' ? '已切换为日记模式' : (mode === 'table' ? '已切换为表格模式' : '已切换为向量模式'));
    }

    function setupVectorMemoryScreen() {
        ensureVectorTemplateStore();

        const createTemplateBtn = document.getElementById('vector-memory-create-template-btn');
        if (createTemplateBtn) {
            createTemplateBtn.addEventListener('click', () => openTemplateModal(null));
        }

        const saveTemplateBtn = document.getElementById('vector-template-save-btn');
        if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', saveTemplateFromModal);

        const cancelTemplateBtn = document.getElementById('vector-template-cancel-btn');
        if (cancelTemplateBtn) cancelTemplateBtn.addEventListener('click', closeTemplateModal);

        const manualBtn = document.getElementById('vector-memory-manual-btn');
        if (manualBtn) manualBtn.addEventListener('click', openManualModal);

        const manualCancelBtn = document.getElementById('vector-manual-cancel-btn');
        if (manualCancelBtn) manualCancelBtn.addEventListener('click', closeManualModal);

        const manualSaveBtn = document.getElementById('vector-manual-save-btn');
        if (manualSaveBtn) manualSaveBtn.addEventListener('click', submitManualSummary);

        const importBtn = document.getElementById('vector-memory-import-btn');
        const importInput = document.getElementById('vector-memory-import-input');
        if (importBtn && importInput) {
            importBtn.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', async () => {
                await importVectorFile(importInput.files[0]);
                importInput.value = '';
            });
        }

        const exportAllBtn = document.getElementById('vector-memory-export-all-btn');
        if (exportAllBtn) exportAllBtn.addEventListener('click', exportVectorTemplates);

        const exportPackageBtn = document.getElementById('vector-memory-export-package-btn');
        if (exportPackageBtn) exportPackageBtn.addEventListener('click', exportVectorMemoryPackage);

        const fromJournalBtn = document.getElementById('vector-memory-from-journal-btn');
        if (fromJournalBtn) fromJournalBtn.addEventListener('click', convertJournalsToVector);

        const fromTableBtn = document.getElementById('vector-memory-from-table-btn');
        if (fromTableBtn) fromTableBtn.addEventListener('click', convertTableToVector);

        const toJournalBtn = document.getElementById('vector-memory-to-journal-btn');
        if (toJournalBtn) toJournalBtn.addEventListener('click', convertVectorToJournal);

        const toTableBtn = document.getElementById('vector-memory-to-table-btn');
        if (toTableBtn) toTableBtn.addEventListener('click', convertVectorToTable);

        const autoToggle = document.getElementById('vector-memory-auto-toggle');
        if (autoToggle) {
            autoToggle.addEventListener('change', async (event) => {
                const chat = getCurrentVectorChat();
                if (!chat) return;
                ensureVectorMemoryState(chat);
                chat.vectorMemory.autoSummaryEnabled = event.target.checked;
                if (!event.target.checked) {
                    chat.vectorMemory.autoSummaryPending = false;
                    if (chat.vectorMemory.autoSummaryState === 'running') chat.vectorMemory.autoSummaryState = 'idle';
                } else {
                    chat.vectorMemory.autoSummaryState = 'idle';
                }
                await saveCharacter(chat.id);
                refreshVectorAutoControls(chat);
            });
        }

        const autoInterval = document.getElementById('vector-memory-auto-interval');
        if (autoInterval) {
            autoInterval.addEventListener('blur', async () => {
                const chat = getCurrentVectorChat();
                if (!chat) return;
                ensureVectorMemoryState(chat);
                chat.vectorMemory.autoSummaryInterval = Math.max(10, parseInt(autoInterval.value, 10) || VECTOR_MEMORY_DEFAULT_INTERVAL);
                await saveCharacter(chat.id);
                refreshVectorAutoControls(chat);
            });
        }

        const latestBtn = document.getElementById('vector-memory-latest-btn');
        if (latestBtn) {
            latestBtn.addEventListener('click', async () => {
                const chat = getCurrentVectorChat();
                if (!chat) return;
                try {
                    await summarizeVectorLatest(chat);
                } catch (error) {
                    console.error('[VectorMemory] summarize latest failed:', error);
                    if (typeof showApiError === 'function') showApiError(error);
                    else showToast(error.message || '总结到最新失败');
                }
            });
        }

        const retryBtn = document.getElementById('vector-memory-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', async () => {
                const chat = getCurrentVectorChat();
                if (!chat) return;
                await retryVectorAutoSummary(chat);
            });
        }

        document.querySelectorAll('.vector-memory-tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                uiState.tab = button.dataset.tab || 'entries';
                renderVectorMemoryScreen();
            });
        });

        document.querySelectorAll('[data-vector-memory-mode-switch]').forEach(button => {
            button.addEventListener('click', () => {
                switchVectorMemoryMode(button.dataset.vectorMemoryModeSwitch);
            });
        });

        const screen = document.getElementById('vector-memory-screen');
        if (screen) {
            screen.addEventListener('click', async (event) => {
                const actionEl = event.target.closest('[data-action]');
                if (!actionEl) return;
                const action = actionEl.dataset.action;
                if (action === 'bind-template') {
                    await bindTemplateToCurrentChat(actionEl.dataset.templateId);
                } else if (action === 'edit-template') {
                    const template = db.vectorMemoryTemplates.find(item => item.id === actionEl.dataset.templateId);
                    if (template) openTemplateModal(template);
                } else if (action === 'delete-template') {
                    await deleteTemplate(actionEl.dataset.templateId);
                } else if (action === 'export-template') {
                    exportTemplate(actionEl.dataset.templateId);
                } else if (action === 'toggle-pin' || action === 'delete-entry' || action === 'boost-weight') {
                    await handleEntryAction(action, actionEl.dataset.entryId);
                }
            });
        }

        const openFromSettingsBtn = document.getElementById('setting-open-vector-memory-btn');
        if (openFromSettingsBtn) {
            openFromSettingsBtn.addEventListener('click', () => {
                renderVectorMemoryScreen();
                switchScreen('vector-memory-screen');
            });
        }
    }

    window.setupVectorMemoryScreen = setupVectorMemoryScreen;
    window.renderVectorMemoryScreen = renderVectorMemoryScreen;
    window.OwoApp.compat.expose('ensureVectorMemoryState', ensureVectorMemoryState, {
        state: 'canonical',
        owner: 'OwoApp.features.vectorMemory.model.ensureVectorMemoryState',
        note: 'V24: legacy window.ensureVectorMemoryState 只保留兼容出口'
    });
    window.OwoApp.compat.expose('getVectorMemoryContextBlock', getVectorMemoryContextBlock, {
        state: 'canonical',
        owner: 'OwoApp.features.vectorMemory.contextService.getVectorMemoryContextBlock',
        note: 'V24: legacy window.getVectorMemoryContextBlock 只保留兼容出口'
    });
    window.OwoApp.compat.expose('prepareVectorMemoryContext', prepareVectorMemoryContext, {
        state: 'canonical',
        owner: 'OwoApp.features.vectorMemory.contextService.prepareVectorMemoryContext',
        note: 'V24: legacy window.prepareVectorMemoryContext 只保留兼容出口'
    });
    window.checkAndTriggerVectorMemory = checkAndTriggerVectorMemory;
    window.OwoApp.compat.expose('resetVectorCursorToLatest', resetVectorCursorToLatest, {
        state: 'canonical',
        owner: 'OwoApp.features.vectorMemory.model.resetVectorCursorToLatest',
        note: 'V24: legacy window.resetVectorCursorToLatest 只保留兼容出口'
    });
})();
