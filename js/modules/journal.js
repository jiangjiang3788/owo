// --- 回忆日记功能 (js/modules/journal.js) ---

let generatingChatId = null;
const autoJournalRetryTimers = {};

// @compat canonical: OwoApp.core.memory.journalSemantics
const journalSemantics = window.OwoApp.core.memory.journalSemantics;
// @compat canonical: OwoApp.features.journal.service
const journalService = window.OwoApp.features.journal.service;

function getJournalRuntimeContext() {
    return {
        isGenerating: typeof isGenerating !== 'undefined' && !!isGenerating,
        generatingChatId
    };
}

function setupMemoryJournalScreen() {
    const journalTitleBtn = document.getElementById('journal-title-btn');
    const journalTitleActionsheet = document.getElementById('journal-title-actionsheet');
    const journalTitleCancelBtn = document.getElementById('journal-title-cancel-btn');
    const manualAddJournalBtn = document.getElementById('manual-add-journal-btn');
    const searchJournalBtn = document.getElementById('search-journal-btn');
    const journalSearchBar = document.getElementById('journal-search-bar');
    const journalSearchInput = document.getElementById('journal-search-input');
    const manualJournalModal = document.getElementById('manual-journal-modal');
    const manualJournalForm = document.getElementById('manual-journal-form');
    const manualJournalCancelBtn = document.getElementById('manual-journal-cancel-btn');
    
    // 导入/导出
    const exportJournalBtn = document.getElementById('export-journal-btn');
    const importJournalBtn = document.getElementById('import-journal-btn');
    const importJournalFileInput = document.getElementById('import-journal-file-input');
    const journalBatchExportBtn = document.getElementById('journal-batch-export-btn');

    const generateNewJournalBtn = document.getElementById('generate-new-journal-btn');
    const generateJournalModal = document.getElementById('generate-journal-modal');
    const generateJournalForm = document.getElementById('generate-journal-form');
    const includeFavoritedCheckboxEl = document.getElementById('journal-include-favorited');
    const journalListContainer = document.getElementById('journal-list-container');
    const editDetailBtn = document.getElementById('edit-journal-detail-btn');
    const saveDetailBtn = document.getElementById('save-journal-detail-btn');
    const bindWorldBookBtn = document.getElementById('bind-journal-worldbook-btn');
    // 新增元素引用
    const journalStyleModal = document.getElementById('journal-style-selection-modal');
    const saveJournalStyleBtn = document.getElementById('save-journal-style-btn');
    const journalStyleRadios = document.querySelectorAll('input[name="journal-style-mode"]');
    const customStyleContainer = document.getElementById('journal-custom-style-container');
    const journalStyleWorldBookList = document.getElementById('journal-style-worldbook-list');
    // 新增：多选管理相关元素
    const manageBtn = document.getElementById('journal-manage-btn');
    const cancelManageBtn = document.getElementById('journal-cancel-manage-btn');
    const multiSelectBar = document.getElementById('journal-multi-select-bar');
    const batchDeleteBtn = document.getElementById('journal-batch-delete-btn');
    const mergeBtn = document.getElementById('journal-merge-btn');
    const selectCountSpan = document.getElementById('journal-select-count');
    const selectAllBtn = document.getElementById('journal-select-all-btn');

    let isMultiSelectMode = false;
    let selectedJournalIds = new Set();

    // 绑定标题点击事件
    if (journalTitleBtn) {
        journalTitleBtn.addEventListener('click', () => {
            if (journalTitleActionsheet) journalTitleActionsheet.classList.add('visible');
        });
    }

    if (journalTitleCancelBtn) {
        journalTitleCancelBtn.addEventListener('click', () => {
            if (journalTitleActionsheet) journalTitleActionsheet.classList.remove('visible');
        });
    }

    // 绑定搜索按钮事件
    if (searchJournalBtn) {
        searchJournalBtn.addEventListener('click', () => {
            if (journalTitleActionsheet) journalTitleActionsheet.classList.remove('visible');
            if (journalSearchBar) {
                if (journalSearchBar.style.display === 'none') {
                    journalSearchBar.style.display = 'block';
                    if (journalSearchInput) journalSearchInput.focus();
                } else {
                    journalSearchBar.style.display = 'none';
                    if (journalSearchInput) {
                        journalSearchInput.value = '';
                        renderJournalList();
                    }
                }
            }
        });
    }

    // 绑定导入导出按钮事件
    if (exportJournalBtn) {
        exportJournalBtn.addEventListener('click', () => {
            if (journalTitleActionsheet) journalTitleActionsheet.classList.remove('visible');
            exportAllJournals();
        });
    }
    
    if (importJournalBtn) {
        importJournalBtn.addEventListener('click', () => {
            if (journalTitleActionsheet) journalTitleActionsheet.classList.remove('visible');
            if (importJournalFileInput) importJournalFileInput.click();
        });
    }
    
    if (importJournalFileInput) {
        importJournalFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            importJournals(file);
            e.target.value = ''; // 清空选中以便下次重新选同一个文件
        });
    }

    if (journalSearchInput) {
        journalSearchInput.addEventListener('input', (e) => {
            renderJournalList(e.target.value.trim());
        });
    }

    // 绑定手动添加按钮事件
    if (manualAddJournalBtn) {
        manualAddJournalBtn.addEventListener('click', () => {
            if (journalTitleActionsheet) journalTitleActionsheet.classList.remove('visible');
            if (manualJournalForm) manualJournalForm.reset();
            if (manualJournalModal) manualJournalModal.classList.add('visible');
        });
    }

    if (manualJournalCancelBtn) {
        manualJournalCancelBtn.addEventListener('click', () => {
            if (manualJournalModal) manualJournalModal.classList.remove('visible');
        });
    }

    // 手动添加日记表单提交
    if (manualJournalForm) {
        manualJournalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('manual-journal-title');
            const contentInput = document.getElementById('manual-journal-content');
            
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();

            if (!title || !content) {
                showToast('标题和内容不能为空');
                return;
            }

            const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
            if (!chat) return;

            journalService.addManualJournal(chat, { title, content }, { currentChatId, currentChatType });
            await saveData();

            if (manualJournalModal) manualJournalModal.classList.remove('visible');
            renderJournalList();
            showToast('已手动添加新记忆');
        });
    }

    // 绑定按钮点击事件
    if (manageBtn) {
        manageBtn.addEventListener('click', () => {
            toggleMultiSelectMode(true);
        });
    }

    if (cancelManageBtn) {
        cancelManageBtn.addEventListener('click', () => {
            toggleMultiSelectMode(false);
        });
    }

    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', async () => {
            if (selectedJournalIds.size === 0) return;
            if (confirm(`确定要删除选中的 ${selectedJournalIds.size} 篇日记吗？此操作不可恢复。`)) {
                const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
                if (!chat) return;

                journalService.deleteJournals(chat, Array.from(selectedJournalIds));
                await saveData();
                toggleMultiSelectMode(false);
                renderJournalList();
                showToast('已批量删除');
            }
        });
    }
    
    if (journalBatchExportBtn) {
        journalBatchExportBtn.addEventListener('click', () => {
            if (selectedJournalIds.size === 0) return;
            exportSelectedJournals(Array.from(selectedJournalIds));
            toggleMultiSelectMode(false);
        });
    }

    if (mergeBtn) {
        mergeBtn.addEventListener('click', async () => {
            if (selectedJournalIds.size < 2) {
                showToast('请至少选择 2 篇日记进行合并');
                return;
            }
            await mergeJournals(Array.from(selectedJournalIds));
        });
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            toggleSelectAll();
        });
    }

    function toggleMultiSelectMode(active) {
        isMultiSelectMode = active;
        selectedJournalIds.clear();
        updateSelectCount();

        const container = document.getElementById('journal-list-container');
        const cards = container.querySelectorAll('.journal-card');
        
        if (active) {
            manageBtn.style.display = 'none';
            cancelManageBtn.style.display = 'flex';
            multiSelectBar.style.display = 'flex';
            generateNewJournalBtn.style.display = 'none'; // 隐藏生成按钮避免干扰
            if (bindWorldBookBtn) bindWorldBookBtn.style.display = 'none';
            
            cards.forEach(card => {
                card.classList.add('select-mode');
            });
        } else {
            manageBtn.style.display = 'flex';
            cancelManageBtn.style.display = 'none';
            multiSelectBar.style.display = 'none';
            generateNewJournalBtn.style.display = 'flex';
            if (bindWorldBookBtn && currentChatType === 'private') bindWorldBookBtn.style.display = 'flex';

            cards.forEach(card => {
                card.classList.remove('select-mode');
                const checkbox = card.querySelector('.journal-checkbox');
                if (checkbox) checkbox.classList.remove('checked');
            });
            
            // 退出多选模式时重置全选按钮
            if (selectAllBtn) selectAllBtn.textContent = '全选';
        }
    }

    function updateSelectCount() {
        if (selectCountSpan) {
            selectCountSpan.textContent = `已选 ${selectedJournalIds.size} 篇`;
        }
        
        // 更新全选按钮文字
        if (selectAllBtn) {
            const chat = (currentChatType === 'private') 
                ? db.characters.find(c => c.id === currentChatId) 
                : db.groups.find(g => g.id === currentChatId);
            
            if (chat && chat.memoryJournals) {
                const totalCount = chat.memoryJournals.length;
                const isAllSelected = selectedJournalIds.size === totalCount && totalCount > 0;
                selectAllBtn.textContent = isAllSelected ? '取消全选' : '全选';
            }
        }
    }

    function toggleSelectAll() {
        const chat = (currentChatType === 'private') 
            ? db.characters.find(c => c.id === currentChatId) 
            : db.groups.find(g => g.id === currentChatId);
        
        if (!chat || !chat.memoryJournals) return;
        
        const allJournalIds = chat.memoryJournals.map(j => j.id);
        const isAllSelected = allJournalIds.every(id => selectedJournalIds.has(id));
        
        if (isAllSelected) {
            // 取消全选
            selectedJournalIds.clear();
            document.querySelectorAll('.journal-checkbox').forEach(checkbox => {
                checkbox.classList.remove('checked');
            });
        } else {
            // 全选
            allJournalIds.forEach(id => selectedJournalIds.add(id));
            document.querySelectorAll('.journal-checkbox').forEach(checkbox => {
                checkbox.classList.add('checked');
            });
        }
        
        updateSelectCount();
    }
    
    // --- 导出所有日记 ---
    function exportAllJournals() {
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat || !chat.memoryJournals || chat.memoryJournals.length === 0) {
            showToast('当前没有可导出的日记');
            return;
        }
        downloadJournalsJson(chat.memoryJournals, `${chat.name || chat.remarkName || '未知角色'}_日记导出`);
    }
    
    // --- 导出选中的日记 ---
    function exportSelectedJournals(ids) {
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat || !chat.memoryJournals) return;
        
        const selectedJournals = chat.memoryJournals.filter(j => ids.includes(j.id));
        if (selectedJournals.length === 0) {
             showToast('未选择要导出的日记');
             return;
        }
        downloadJournalsJson(selectedJournals, `${chat.name || chat.remarkName || '未知角色'}_选定日记导出`);
    }
    
    // --- 下载 JSON 工具函数 ---
    function downloadJournalsJson(journalsData, defaultFilename) {
        try {
            const dataStr = JSON.stringify(journalsData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${defaultFilename}_${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`成功导出 ${journalsData.length} 篇日记`);
        } catch (e) {
            console.error('导出日记失败:', e);
            showToast('导出日记失败');
        }
    }
    
    // --- 导入日记逻辑 ---
    function importJournals(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!Array.isArray(importedData)) {
                    throw new Error("格式错误，请确保导入的是包含日记数组的 JSON 文件。");
                }
                
                const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
                if (!chat) return;
                const importedJournals = journalService.importJournals(chat, importedData, { currentChatId, currentChatType });
                const count = importedJournals.length;
                
                if (count > 0) {
                    await saveData();
                    renderJournalList();
                    showToast(`成功导入 ${count} 篇日记`);
                } else {
                    showToast('未在文件中找到有效的日记数据');
                }
            } catch (err) {
                console.error('解析日记文件失败:', err);
                showToast('导入失败：文件格式不正确');
            }
        };
        reader.readAsText(file);
    }

    async function mergeJournals(journalIds) {
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat) return;

        const mergeDraft = journalService.createMergedJournalDraft(chat, journalIds, { currentChatId, currentChatType });
        if (!mergeDraft) return;

        const { mergedStart, mergedEnd, summaryPrompt } = mergeDraft;

        showToast('正在合并精简，请稍候...');
        
        // 退出多选模式并显示加载状态
        toggleMultiSelectMode(false);
        
        // 显示列表占位卡片
        const container = document.getElementById('journal-list-container');
        const loadingCard = document.createElement('li');
        loadingCard.className = 'journal-card generating';
        loadingCard.id = 'journal-generating-card';
        loadingCard.innerHTML = `
            <div class="spinner"></div>
            <div class="text">正在合并回忆...</div>
        `;
        if (container.firstChild) {
            container.insertBefore(loadingCard, container.firstChild);
        } else {
            container.appendChild(loadingCard);
        }
        container.scrollTop = 0;

        isGenerating = true;
        generatingChatId = currentChatId;

        try {
            let { url, key, model } = db.apiSettings;
            if (!url || !key || !model) {
                throw new Error("API设置不完整。");
            }

            if (url.endsWith('/')) {
                url = url.slice(0, -1);
            }

            const requestBody = {
                model: model,
                messages: [{ role: 'user', content: summaryPrompt }],
                temperature: 0.7
            };
            const endpoint = `${url}/v1/chat/completions`;
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };

            const rawContent = await fetchAiResponse(db.apiSettings, requestBody, headers, endpoint);

            const journalData = journalSemantics.parseJournalXml(rawContent, '合并日记');
            journalService.addGeneratedJournal(chat, {
                range: { start: mergedStart, end: mergedEnd },
                title: journalData.title,
                content: journalData.content
            }, { currentChatId, currentChatType });
            await saveData();

            renderJournalList();
            showToast('日记合并完成！');

        } catch (error) {
            const card = document.getElementById('journal-generating-card');
            if(card) card.remove();
            showApiError(error);
        } finally {
            isGenerating = false;
            generatingChatId = null;
        }
    }

    bindWorldBookBtn.addEventListener('click', () => {
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat) return;

        // 仅私聊支持新风格设置
        if (currentChatType === 'private') {
            // 智能迁移
            const migrationMsg = migrateJournalSettings(chat);
            if (migrationMsg) {
                showToast(migrationMsg);
            }

            // 设置 Radio 状态
            const currentMode = chat.journalStyleSettings.mode || 'default';
            const radio = document.querySelector(`input[name="journal-style-mode"][value="${currentMode}"]`);
            if (radio) radio.checked = true;

            // 显示/隐藏自定义列表
            customStyleContainer.style.display = (currentMode === 'custom') ? 'flex' : 'none';

            // 渲染世界书列表 (总是渲染，以便切换时可用)
            renderCategorizedWorldBookList(journalStyleWorldBookList, db.worldBooks, chat.journalStyleSettings.customWorldBookIds || [], 'journal-style-wb-select');
            
            journalStyleModal.classList.add('visible');
        } else {
            showToast('群聊暂不支持自定义风格设置');
        }
    });

    // Radio 切换事件
    journalStyleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            customStyleContainer.style.display = (e.target.value === 'custom') ? 'flex' : 'none';
        });
    });

    // 保存按钮点击事件
    saveJournalStyleBtn.addEventListener('click', async () => {
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : null;
        if (!chat) return;

        const selectedMode = document.querySelector('input[name="journal-style-mode"]:checked').value;
        const selectedIds = Array.from(journalStyleWorldBookList.querySelectorAll('.item-checkbox:checked')).map(input => input.value);

        chat.journalStyleSettings = {
            mode: selectedMode,
            customWorldBookIds: selectedIds
        };
        
        // 同步更新旧字段以保持潜在的向后兼容性
        chat.journalWorldBookIds = selectedIds;

        await saveData();
        journalStyleModal.classList.remove('visible');
        showToast('日记风格设置已保存');
    });

    generateNewJournalBtn.addEventListener('click', () => {
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        const totalMessages = chat ? chat.history.length : 0;
        
        const rangeInfo = document.getElementById('journal-range-info');
        rangeInfo.textContent = `当前聊天总消息数: ${totalMessages}`;

        const modalTitle = document.querySelector('#generate-journal-modal h3');
        if (modalTitle) {
            modalTitle.textContent = (currentChatType === 'group') ? '生成群聊总结' : '指定总结范围';
        }

        generateJournalForm.reset();
        if (chat && includeFavoritedCheckboxEl) {
            ensureAutoJournalState(chat);
            includeFavoritedCheckboxEl.checked = !!chat.journalIncludeFavorited;
        }
        generateJournalModal.classList.add('visible');
    });

    generateJournalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const startInput = document.getElementById('journal-range-start');
        const endInput = document.getElementById('journal-range-end');
        const includeFavoritedCheckbox = document.getElementById('journal-include-favorited');

        const start = parseInt(startInput.value);
        const end = parseInt(endInput.value);
        const includeFavorited = includeFavoritedCheckbox.checked;
        
        if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
            showToast('请输入有效的起止范围');
            return;
        }

        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (chat) {
            ensureAutoJournalState(chat);
            chat.journalIncludeFavorited = includeFavorited;
            await saveData();
        }

        generateJournalModal.classList.remove('visible');
        await generateJournal(start, end, includeFavorited);
    });

    journalListContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const card = target.closest('.journal-card');
        if (!card) return;

        const journalId = card.dataset.id;
        
        // 多选模式逻辑
        if (isMultiSelectMode) {
            if (selectedJournalIds.has(journalId)) {
                selectedJournalIds.delete(journalId);
                card.querySelector('.journal-checkbox').classList.remove('checked');
            } else {
                selectedJournalIds.add(journalId);
                card.querySelector('.journal-checkbox').classList.add('checked');
            }
            updateSelectCount();
            return; // 阻止进入详情页
        }

        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat) return;
        const journal = chat.memoryJournals.find(j => j.id === journalId);
        if (!journal) return;

        if (target.closest('.delete-journal-btn')) {
            if (confirm('确定要删除这篇日记吗？')) {
                journalService.deleteJournal(chat, journalId);
                await saveData();
                renderJournalList();
                showToast('日记已删除');
            }
            return;
        }

        if (target.closest('.favorite-journal-btn')) {
            const isFavorited = journalService.toggleJournalFavorite(chat, journalId);
            await saveData();
            target.closest('.favorite-journal-btn').classList.toggle('favorited', !!isFavorited);
            showToast(isFavorited ? '已收藏' : '已取消收藏');
            renderJournalList();
            return;
        }
        
        const formattedDate = journalSemantics.formatYmd(journal.createdAt);
        
        currentJournalDetailId = journal.id;

        const titleEl = document.getElementById('journal-detail-title');
        const contentEl = document.getElementById('journal-detail-content');

        titleEl.isContentEditable = false;
        contentEl.isContentEditable = false;
        titleEl.style.border = 'none';
        contentEl.style.border = 'none';
        titleEl.style.padding = '0';
        contentEl.style.padding = '0';
        editDetailBtn.style.display = '';
        saveDetailBtn.style.display = 'none';

        titleEl.textContent = journal.title;
        document.getElementById('journal-detail-meta').textContent = `创建于 ${formattedDate} | 消息范围: ${journal.range.start}-${journal.range.end}`;
        document.getElementById('journal-detail-content').textContent = journal.content;
        
        switchScreen('memory-journal-detail-screen');
    });

    editDetailBtn.addEventListener('click', () => {
        if (!currentJournalDetailId) return;

        const titleEl = document.getElementById('journal-detail-title');
        const contentEl = document.getElementById('journal-detail-content');

        titleEl.setAttribute('contenteditable', 'true');
        contentEl.setAttribute('contenteditable', 'true');
        titleEl.style.border = '1px dashed #ccc';
        titleEl.style.padding = '5px';
        contentEl.style.border = '1px dashed #ccc';
        contentEl.style.padding = '10px';
        editDetailBtn.style.display = 'none';
        saveDetailBtn.style.display = '';
        titleEl.focus();
    });

    saveDetailBtn.addEventListener('click', async () => {
        if (!currentJournalDetailId) return;

        const titleEl = document.getElementById('journal-detail-title');
        const contentEl = document.getElementById('journal-detail-content');

        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat) return;
        const journal = chat.memoryJournals.find(j => j.id === currentJournalDetailId);
        if (!journal) return;

        journalService.updateJournalDetail(chat, currentJournalDetailId, titleEl.textContent, contentEl.textContent);
        await saveData();

        titleEl.isContentEditable = false;
        contentEl.isContentEditable = false;
        titleEl.style.border = 'none';
        contentEl.style.border = 'none';
        titleEl.style.padding = '0';
        contentEl.style.padding = '0';
        saveDetailBtn.style.display = 'none';
        editDetailBtn.style.display = '';
        showToast('日记已保存');
        renderJournalList();
    });
}

function renderJournalList(searchQuery = '') {
    const container = document.getElementById('journal-list-container');
    const placeholder = document.getElementById('no-journals-placeholder');
    container.innerHTML = '';

    const chat = journalService.getChatByContext({ state: db, currentChatId, currentChatType });
    const journals = journalService.getJournalDisplayItems(chat, searchQuery);

    // 更新标题和按钮显示
    const bindBtn = document.getElementById('bind-journal-worldbook-btn');
    const title = document.querySelector('#memory-journal-screen .title');
    
    if (currentChatType === 'group') {
        if (bindBtn) bindBtn.style.display = 'none';
        if (title) title.textContent = '智能总结';
        if (placeholder) {
            placeholder.innerHTML = '<p>还没有总结哦~</p><p>点击右上角的“+号”来生成第一篇吧！</p>';
        }
    } else {
        if (bindBtn) bindBtn.style.display = 'flex';
        if (title) title.textContent = '回忆日记';
        if (placeholder) {
            placeholder.innerHTML = '<p>还没有日记哦~</p><p>点击右上角的“+号”来创建第一篇吧！</p>';
        }
    }

    let isShowingLoading = false;
    // 恢复生成状态卡片
    if (typeof isGenerating !== 'undefined' && isGenerating && generatingChatId === currentChatId) {
        const loadingCard = document.createElement('li');
        loadingCard.className = 'journal-card generating';
        loadingCard.id = 'journal-generating-card';
        loadingCard.innerHTML = `
            <div class="spinner"></div>
            <div class="text">正在${currentChatType === 'group' ? '总结群聊' : '编织回忆'}...</div>
        `;
        container.appendChild(loadingCard);
        isShowingLoading = true;
    }

    if ((!journals || journals.length === 0) && !isShowingLoading) {
        if (placeholder) placeholder.style.display = 'block';
        return;
    }

    if (placeholder) placeholder.style.display = 'none';

    journals.forEach(journal => {
        const card = document.createElement('li');
        card.className = 'journal-card';
        card.dataset.id = journal.id;

        const date = new Date(journal.createdAt);
        const formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

        let nodeTagHtml = '';
        if (journal.isNodeSummary) {
            nodeTagHtml = `<span style="font-size: 10px; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; color: #888; margin-left: 8px;">节点总结</span>`;
        }

        card.innerHTML = `
            <div class="journal-checkbox"></div>
            <div class="journal-card-header">
                <div class="journal-card-title">${journal.title}</div>
            </div>
            <div class="journal-card-actions">
                <button class="action-icon-btn favorite-journal-btn" title="收藏">
                    <svg viewBox="0 0 24 24">
                        <path class="star-outline" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" fill="currentColor"/>
                        <path class="star-solid" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
                    </svg>
                </button>
                <button class="action-icon-btn delete-journal-btn" title="删除">
                    <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
                </button>
            </div>
            <div class="journal-card-footer" style="justify-content: space-between; height: auto; opacity: 1; margin-top: 10px; align-items: center;">
                <span class="journal-card-date">${formattedDate}${nodeTagHtml}</span>
                <span class="journal-card-range">范围: ${journal.range ? `${journal.range.start}-${journal.range.end}` : '节点'}</span>
            </div>
        `;

        if (journal.isFavorited) {
            card.querySelector('.favorite-journal-btn').classList.add('favorited');
        }

        container.appendChild(card);
    });
}

async function generateJournal(start, end, includeFavorited = false, silent = false, nodeInfo = null, options = {}) {
    if (!silent) {
        showToast('正在生成日记，请稍候...');
    }

    // 显示列表占位卡片
    const container = document.getElementById('journal-list-container');
    const placeholder = document.getElementById('no-journals-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    const loadingCard = document.createElement('li');
    loadingCard.className = 'journal-card generating';
    loadingCard.id = 'journal-generating-card';
    loadingCard.innerHTML = `
        <div class="spinner"></div>
        <div class="text">正在${currentChatType === 'group' ? '总结群聊' : '编织回忆'}...</div>
    `;
    
    if (container.firstChild) {
        container.insertBefore(loadingCard, container.firstChild);
    } else {
        container.appendChild(loadingCard);
    }
    container.scrollTop = 0;

    isGenerating = true; 
    generatingChatId = currentChatId;

    try {
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat) {
            throw new Error("未找到当前聊天。");
        }
        ensureAutoJournalState(chat);

        const startIndex = start - 1;
        const endIndex = end;
        
        if (startIndex < 0 || endIndex > chat.history.length || startIndex >= endIndex) {
            throw new Error("无效的消息范围。");
        }

        // ...
        let messagesToSummarize = chat.history.slice(startIndex, endIndex);
        
        // 1. 保持原样：第三个参数设为 true，确保你想要的“高权重”隐藏消息能被读进来
        messagesToSummarize = filterHistoryForAI(chat, messagesToSummarize, true);

        // 2. 【新增】精准剔除 thinking 消息
        // 你的 chat_ai.js 中生成的思考消息带有 isThinking: true 属性
        // 即使它们包含在上下文里，我们也在生成日记前把它们扔掉
        messagesToSummarize = messagesToSummarize.filter(m => !m.isThinking);

        // 3. 【可选保险】防止只有标签没有属性的情况（针对旧历史记录）
        // 如果你担心以前的历史记录里有 thinking 标签但没有 isThinking 属性，可以加一步正则清洗
        messagesToSummarize.forEach(m => {
            if (m.content && typeof m.content === 'string') {
               m.content = m.content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
            }
        });

        let worldBooksContent = '';
        let summaryPrompt = '';
        let favoritedJournalsPrompt = '';

        // 新增：读取已收藏的日记 (通用逻辑)
        if (includeFavorited) {
            favoritedJournalsPrompt = journalSemantics.buildFavoritedJournalsPrompt(chat.memoryJournals || []);
        }

        if (currentChatType === 'group') {
            // 群聊逻辑
            // 收集关联的 + 全局的世界书（去重）
            const associatedIds = chat.worldBookIds || [];
            const globalBooks = db.worldBooks.filter(wb => wb.isGlobal && !wb.disabled);
            const globalIds = globalBooks.map(wb => wb.id);
            const allBookIds = [...new Set([...associatedIds, ...globalIds])];
            const groupWorldBooks = allBookIds.map(id => db.worldBooks.find(wb => wb.id === id)).filter(wb => wb && !wb.disabled);
            worldBooksContent = groupWorldBooks.map(wb => wb.content).join('\n\n');

            summaryPrompt = `你是一个群聊记录总结助手。请以完全客观的第三视角，对以下群聊记录进行精简总结。\n\n`;
            
            if (favoritedJournalsPrompt) {
                summaryPrompt += favoritedJournalsPrompt;
            }

            // 注入群聊基础信息
            summaryPrompt += `群聊名称: ${chat.name}\n`;
            summaryPrompt += `群成员列表: ${chat.members.map(m => `${m.groupNickname}(${m.realName})`).join(', ')}\n\n`;

            // 注入群聊关联的世界书
            if (worldBooksContent) {
                summaryPrompt += `背景设定参考:\n${worldBooksContent}\n\n`;
            }

            summaryPrompt += `总结要求：\n`;
            summaryPrompt += `1. **客观中立**：使用第三人称视角，不带个人情感色彩，不使用强烈的情绪词汇。\n`;
            summaryPrompt += `2. **精简准确**：只陈述事实，概括主要话题和事件，去除无关的闲聊细节。\n`;
            summaryPrompt += `3. **无升华**：不要进行价值升华、感悟或总结性评价，仅记录发生了什么。\n\n`;

            summaryPrompt += `请严格使用以下 XML 标签格式输出你的结果，不要输出任何其他多余的解释：\n`;
            summaryPrompt += `<journal>\n`;
            summaryPrompt += `    <title>格式为“日期·核心事件”，例如“1月20日·讨论周末计划”</title>\n`;
            summaryPrompt += `    <content>总结正文。分条列出主要讨论点或事件。</content>\n`;
            summaryPrompt += `</journal>\n\n`;
            summaryPrompt += `聊天记录如下：\n\n---\n${(() => {
                let lastTime = 0;
                return messagesToSummarize.map(m => {
                    let prefix = '';
                    const currentTime = m.timestamp;
                    const timeDiff = currentTime - lastTime;
                    const isSameDay = new Date(currentTime).toDateString() === new Date(lastTime).toDateString();
                    
                    if (lastTime === 0 || timeDiff > 20 * 60 * 1000 || !isSameDay) {
                        const d = new Date(currentTime);
                        const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        prefix = `\n[系统时间: ${timeStr}]\n`;
                    }
                    lastTime = currentTime;
                    return `${prefix}${m.content}`;
                }).join('\n');
            })()}\n---`;

        } else {
            // 私聊逻辑
            // 0. 确保迁移
            migrateJournalSettings(chat);

            // 1. 自动获取通用世界书 (Context) + 全局世界书
            let isOfflineNode = false;
            if (chat.activeNodeId && chat.nodes) {
                const activeNode = chat.nodes.find(n => n.id === chat.activeNodeId);
                if (activeNode) {
                    let baseMode = (activeNode.customConfig && activeNode.customConfig.baseMode) ? activeNode.customConfig.baseMode : 
                                   (activeNode.type === 'offline' || (activeNode.type === 'spinoff' && activeNode.spinoffMode === 'offline') ? 'offline' : 'online');
                    if (baseMode === 'offline') {
                        isOfflineNode = true;
                    }
                }
            }
            let associatedIds = chat.worldBookIds || [];
            if (isOfflineNode) {
                associatedIds = (chat.offlineWorldBookIds && chat.offlineWorldBookIds.length > 0) ? chat.offlineWorldBookIds : (chat.worldBookIds || []);
            }
            const globalBooks = db.worldBooks.filter(wb => wb.isGlobal && !wb.disabled);
            const globalIds = globalBooks.map(wb => wb.id);
            const allBookIds = [...new Set([...associatedIds, ...globalIds])];
            const commonWorldBooks = allBookIds.map(id => db.worldBooks.find(wb => wb.id === id)).filter(wb => wb && !wb.disabled);
            worldBooksContent = commonWorldBooks.map(wb => wb.content).join('\n\n');

            // 2. 获取风格设置
            const styleSettings = chat.journalStyleSettings || { mode: 'default', customWorldBookIds: [] };
            
            // 3. 构建 Prompt
            if (styleSettings.mode === 'summary') {
                // 摘要总结风格
                summaryPrompt = `你是一个专业的对话记录总结助手。请根据提供的聊天记录，生成一份精简的摘要总结。\n\n`;
                
                if (favoritedJournalsPrompt) {
                    summaryPrompt += favoritedJournalsPrompt;
                }

                summaryPrompt += `要求：
1. **体现时间进程**：正文内容必须按时间顺序组织，并明确指出时间点。**格式规范：**请严格按照“x年x月x日，发生了[事件]”的格式进行叙述，确保时间线清晰。
2. **客观平实**：使用第三人称视角，客观陈述事实。**绝对禁止使用强烈的情绪词汇**（如“极度愤怒”、“痛彻心扉”、“欣喜若狂”等），保持冷静、克制的叙述风格。
3. **抓取重点**：识别对话中的核心事件、重要话题转折、关键决策或信息。忽略无关的闲聊和琐碎细节。
4. **关键原话摘录（重要）**：
    - 仅当出现具有**极高情感价值**（如表白、郑重承诺、极具感染力的情感宣泄）或**重大剧情价值**（如揭示核心秘密、决定性瞬间）的对话时，请**直接引用角色的原话**。
    - **引用格式**：使用引号包裹原话，例如：${chat.realName}说：“我永远不会离开你。”
    - **严格控制数量**：只摘录最闪光、最不可替代的那几句。如果聊天记录平淡无奇或全是日常琐事，**请不要摘录任何原话**，以免破坏摘要的精简性。
5. **无升华**：不要进行价值升华、感悟或总结性评价，仅记录发生了什么。

请严格使用以下 XML 标签格式输出你的结果，不要输出任何其他多余的解释：
<journal>
    <title>格式为“日期范围·核心事件”，例如“1月20日-1月22日·关于旅行计划的讨论”</title>
    <content>总结正文</content>
</journal>

聊天记录如下：\n\n---\n${(() => {
                let lastTime = 0;
                return messagesToSummarize.map(m => {
                    let prefix = '';
                    const currentTime = m.timestamp;
                    const timeDiff = currentTime - lastTime;
                    const isSameDay = new Date(currentTime).toDateString() === new Date(lastTime).toDateString();
                    
                    if (lastTime === 0 || timeDiff > 20 * 60 * 1000 || !isSameDay) {
                        const d = new Date(currentTime);
                        const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        prefix = `\n[系统时间: ${timeStr}]\n`;
                    }
                    lastTime = currentTime;
                    return `${prefix}${m.content}`;
                }).join('\n');
            })()}\n---`;

            } else {
                // 默认风格 (流水账) 或 自定义风格
                // 基础 Prompt (第一人称)
                summaryPrompt = `你是一个日记整理助手。请以角色 "${chat.remarkName || chat.name}" 的第一人称视角，总结以下聊天记录。请专注于重要的情绪、事件和细节。\n\n`;
                
                if (favoritedJournalsPrompt) {
                    summaryPrompt += favoritedJournalsPrompt;
                }

                summaryPrompt += "为了更好地理解角色和背景，请参考以下信息：\n";
                summaryPrompt += "=====\n";

                if (worldBooksContent) {
                    summaryPrompt += `世界观设定:\n${worldBooksContent}\n\n`;
                }

                summaryPrompt += `你的角色设定:\n- 角色名: ${chat.realName}\n- 人设: ${chat.persona || "一个友好、乐于助人的伙伴。"}\n\n`;
                summaryPrompt += `我的角色设定:\n- 我的称呼: ${chat.myName}\n- 我的人设: ${chat.myPersona || "无特定人设。"}\n\n`;
                summaryPrompt += "=====\n";

                // 如果是自定义风格，注入额外要求
                if (styleSettings.mode === 'custom') {
                    const customWorldBooks = (styleSettings.customWorldBookIds || []).map(id => db.worldBooks.find(wb => wb.id === id)).filter(wb => wb && !wb.disabled);
                    const customStyleContent = customWorldBooks.map(wb => wb.content).join('\n\n');
                    
                    if (customStyleContent) {
                        summaryPrompt += `\n**特别日记格式/风格要求**：\n请优先严格遵循以下风格指南或格式要求来撰写日记：\n${customStyleContent}\n\n`;
                    }
                }

                summaryPrompt += `请基于以上所有背景信息，总结以下聊天记录。请严格使用以下 XML 标签格式输出你的结果，不要输出任何其他多余的解释：\n<journal>\n    <title>年月日·一个简洁的标题</title>\n    <content>完整的日记正文</content>\n</journal>\n\n聊天记录如下：\n\n---\n${(() => {
                let lastTime = 0;
                return messagesToSummarize.map(m => {
                    let prefix = '';
                    const currentTime = m.timestamp;
                    const timeDiff = currentTime - lastTime;
                    const isSameDay = new Date(currentTime).toDateString() === new Date(lastTime).toDateString();
                    
                    if (lastTime === 0 || timeDiff > 20 * 60 * 1000 || !isSameDay) {
                        const d = new Date(currentTime);
                        const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        prefix = `\n[系统时间: ${timeStr}]\n`;
                    }
                    lastTime = currentTime;
                    return `${prefix}${m.content}`;
                }).join('\n');
            })()}\n---`;
            }
        }

        // === 使用总结API（如果已配置）===
        let apiConfig;
        if (db.summaryApiSettings && db.summaryApiSettings.url && db.summaryApiSettings.key && db.summaryApiSettings.model) {
            apiConfig = db.summaryApiSettings;
        } else {
            apiConfig = db.apiSettings;
        }
        
        let { url, key, model, provider } = apiConfig;
        if (!url || !key || !model) {
            throw new Error("API设置不完整。");
        }

        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }

        const requestBody = {
            model: model,
            messages: [{ role: 'user', content: summaryPrompt }],
            temperature: 0.7
        };
        const endpoint = `${url}/v1/chat/completions`;
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };

        const rawContent = await fetchAiResponse(apiConfig, requestBody, headers, endpoint);

        const journalData = journalSemantics.parseJournalXml(rawContent, '无标题日记');
        const newJournal = journalSemantics.normalizeJournal({
            range: { start, end },
            title: journalData.title,
            content: journalData.content,
            isNodeSummary: nodeInfo && nodeInfo.isNodeSummary,
            nodeId: nodeInfo && nodeInfo.nodeId
        }, { currentChatId, currentChatType });

        // 如果是节点总结，附加节点信息
        if (nodeInfo && nodeInfo.isNodeSummary && nodeInfo.nodeName) {
            newJournal.title = `节点总结：${nodeInfo.nodeName}`;
        }

        if (!chat.memoryJournals) {
            chat.memoryJournals = [];
        }

        // 如果是重新总结，查找并替换旧的总结
        if (nodeInfo && nodeInfo.isResummarize) {
            const existingIndex = chat.memoryJournals.findIndex(j => j.isNodeSummary && j.nodeId === nodeInfo.nodeId);
            if (existingIndex !== -1) {
                // 保留原有的 id 和 createdAt，只更新内容和标题
                chat.memoryJournals[existingIndex].content = newJournal.content;
                chat.memoryJournals[existingIndex].title = newJournal.title;
                chat.memoryJournals[existingIndex].range = newJournal.range;
            } else {
                chat.memoryJournals.push(newJournal);
            }
        } else {
            chat.memoryJournals.push(newJournal);
        }

        // 如果是节点总结，同时更新节点对象中的 summaryContent
        if (nodeInfo && nodeInfo.nodeId && chat.nodes) {
            const node = chat.nodes.find(n => n.id === nodeInfo.nodeId);
            if (node) {
                node.summaryContent = newJournal.content;
            }
        }

        if (!options.isAutoJournal && (!nodeInfo || !nodeInfo.isNodeSummary)) {
            syncAutoJournalCursorAfterManualSummary(chat, start, end);
        }

        await saveData();
        refreshAutoJournalButton(chat, currentChatType);

        renderJournalList();
        
        // 如果是重新总结且在节点大厅，刷新列表
        if (nodeInfo && nodeInfo.isResummarize && document.getElementById('node-system-screen').classList.contains('active')) {
            if (typeof NodeSystem !== 'undefined' && typeof NodeSystem.renderArchiveList === 'function') {
                NodeSystem.renderArchiveList();
            }
        }

        if (!options.suppressSuccessToast) {
            showToast(silent ? `日记总结已生成 (第${start}-${end}条)` : '新日记已生成！');
        }

    } catch (error) {
        // 移除生成卡片
        const card = document.getElementById('journal-generating-card');
        if(card) card.remove();
        
        // 如果列表为空，恢复显示 placeholder
        const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
        if (!chat || !chat.memoryJournals || chat.memoryJournals.length === 0) {
             const placeholder = document.getElementById('no-journals-placeholder');
             if (placeholder) placeholder.style.display = 'block';
        }

        if (options.propagateError) {
            throw error;
        }

        showApiError(error);
    } finally {
        isGenerating = false; 
        generatingChatId = null;
    }
}

function migrateJournalSettings(chat) {
    return journalService.migrateJournalSettings(chat);
}

function ensureAutoJournalState(chat) {
    return journalService.ensureAutoJournalState(chat, getJournalRuntimeContext());
}

function getAutoJournalCursorInfo(chat) {
    return journalService.getAutoJournalCursorInfo(chat, getJournalRuntimeContext());
}

function getNextAutoJournalRange(chat) {
    return journalService.getNextAutoJournalRange(chat, getJournalRuntimeContext());
}

function setAutoJournalCursorByMessage(chat, message) {
    return journalService.setAutoJournalCursorByMessage(chat, message, getJournalRuntimeContext());
}

function setAutoJournalCursorByEndIndex(chat, endIndex) {
    return journalService.setAutoJournalCursorByEndIndex(chat, endIndex, getJournalRuntimeContext());
}

function resetAutoJournalCursorToLatest(chat) {
    return journalService.resetAutoJournalCursorToLatest(chat, getJournalRuntimeContext());
}

function syncAutoJournalCursorAfterManualSummary(chat, start, end) {
    return journalService.syncAutoJournalCursorAfterManualSummary(chat, start, end, getJournalRuntimeContext());
}

function getAutoJournalChatType(chat) {
    return journalService.getAutoJournalChatType(chat, { state: db });
}

function askSummarizeLatestOptions(info) {
    const unsummarizedCount = Math.max(0, info && info.unsummarizedCount || 0);
    const interval = Math.max(10, parseInt(info && info.interval, 10) || 100);
    const existingModal = document.getElementById('journal-latest-choice-modal');
    if (existingModal) {
        existingModal.remove();
    }

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'journal-latest-choice-modal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-window" style="max-width: 360px;">
                <h3>总结到最新</h3>
                <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 12px 0 8px;">
                    当前有 ${unsummarizedCount} 条新消息未纳入总结。
                </p>
                <div style="display: flex; align-items: center; gap: 8px; margin: 0 0 12px;">
                    <span style="font-size: 12px; color: #666; white-space: nowrap;">拆分条数</span>
                    <input type="number" id="journal-latest-split-size" value="${interval}" min="1" step="1"
                        style="width: 78px; text-align: right; border: none; background: rgba(0,0,0,0.05); border-radius: 4px; padding: 6px 8px;">
                </div>
                <p id="journal-latest-split-info" style="color: #888; font-size: 12px; line-height: 1.6; margin: 0 0 14px;">
                    按当前间隔 ${interval} 条计算。
                </p>
                <label id="journal-latest-remainder-label" style="display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #666; margin-bottom: 14px;">
                    <input type="checkbox" id="journal-latest-include-remainder">
                    <span></span>
                </label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button type="button" class="btn btn-primary" data-choice="single">合并成一整篇</button>
                    <button type="button" class="btn btn-secondary" data-choice="split">按每 ${interval} 条拆分</button>
                    <button type="button" class="btn" data-choice="cancel">取消</button>
                </div>
            </div>
        `;

        const splitInput = overlay.querySelector('#journal-latest-split-size');
        const splitInfo = overlay.querySelector('#journal-latest-split-info');
        const remainderLabel = overlay.querySelector('#journal-latest-remainder-label');
        const includeRemainderCheckbox = overlay.querySelector('#journal-latest-include-remainder');
        const splitButton = overlay.querySelector('button[data-choice="split"]');

        const getSplitSize = () => {
            const value = parseInt(splitInput ? splitInput.value : '', 10);
            return (isNaN(value) || value < 1) ? interval : value;
        };

        const updateSplitPreview = () => {
            const splitSize = getSplitSize();
            const completedBatchCount = Math.floor(unsummarizedCount / splitSize);
            const remainderCount = Math.max(0, unsummarizedCount - (completedBatchCount * splitSize));

            if (splitInfo) {
                splitInfo.textContent = `按每 ${splitSize} 条计算，可拆出 ${completedBatchCount} 个完整批次${remainderCount > 0 ? `，另有 ${remainderCount} 条零头消息。` : '。'}`;
            }

            if (splitButton) {
                splitButton.textContent = `按每 ${splitSize} 条拆分`;
            }

            if (remainderLabel) {
                remainderLabel.style.opacity = remainderCount > 0 ? '1' : '0.6';
                const remainderText = remainderLabel.querySelector('span');
                if (remainderText) {
                    remainderText.textContent = remainderCount > 0
                        ? `拆分时将末尾不足 ${splitSize} 条的 ${remainderCount} 条消息也单独总结成篇`
                        : '当前没有零头消息，拆分时会全部按完整批次生成';
                }
            }

            if (includeRemainderCheckbox) {
                if (remainderCount > 0) {
                    includeRemainderCheckbox.disabled = false;
                    if (!includeRemainderCheckbox.dataset.userTouched) {
                        includeRemainderCheckbox.checked = true;
                    }
                } else {
                    includeRemainderCheckbox.checked = false;
                    includeRemainderCheckbox.disabled = true;
                }
            }
        };

        if (includeRemainderCheckbox) {
            includeRemainderCheckbox.addEventListener('change', () => {
                includeRemainderCheckbox.dataset.userTouched = 'true';
            });
        }

        if (splitInput) {
            splitInput.addEventListener('input', updateSplitPreview);
            splitInput.addEventListener('blur', () => {
                splitInput.value = String(getSplitSize());
                updateSplitPreview();
            });
        }

        const finalize = (result) => {
            document.removeEventListener('keydown', handleKeydown);
            overlay.remove();
            resolve(result);
        };

        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                finalize(null);
            }
        };

        document.addEventListener('keydown', handleKeydown);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                finalize(null);
                return;
            }

            const button = event.target.closest('button[data-choice]');
            if (!button) return;

            const choice = button.dataset.choice;
            if (choice === 'cancel') {
                finalize(null);
                return;
            }

            finalize({
                mode: choice,
                splitSize: getSplitSize(),
                includeRemainder: !!(includeRemainderCheckbox && !includeRemainderCheckbox.disabled && includeRemainderCheckbox.checked)
            });
        });

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));
        updateSplitPreview();
        if (splitInput) {
            splitInput.focus();
            splitInput.select();
        }
    });
}

function getCurrentSettingsAutoJournalElements(chatType) {
    if (chatType === 'group') {
        return {
            retryButton: document.getElementById('setting-group-auto-journal-retry-btn'),
            latestButton: document.getElementById('setting-group-summarize-latest-btn'),
            intervalInput: document.getElementById('setting-group-auto-journal-interval')
        };
    }

    return {
        retryButton: document.getElementById('setting-auto-journal-retry-btn'),
        latestButton: document.getElementById('setting-summarize-latest-btn'),
        intervalInput: document.getElementById('setting-auto-journal-interval')
    };
}

function refreshAutoJournalButton(chat, chatType = null) {
    if (!chat) return;

    ensureAutoJournalState(chat);

    const resolvedChatType = chatType || getAutoJournalChatType(chat);
    const { retryButton, latestButton } = getCurrentSettingsAutoJournalElements(resolvedChatType);
    if (!retryButton && !latestButton) return;

    const pendingRange = getNextAutoJournalRange(chat);
    const hasPendingBatch = !!pendingRange;
    const isRunning = chat.autoJournalState === 'running';
    const hasFailed = chat.autoJournalState === 'failed';

    if (retryButton) {
        retryButton.disabled = isRunning;
        retryButton.textContent = isRunning
            ? '自动总结进行中...'
            : (hasFailed ? '重试自动总结（上次失败）' : (hasPendingBatch ? '重试自动总结（有待补）' : '重试自动总结'));

        retryButton.style.background = hasFailed ? '#ffe7e7' : '';
        retryButton.style.color = hasFailed ? '#c62828' : '';
        retryButton.style.borderColor = hasFailed ? '#f2b8b5' : '';
        retryButton.style.fontWeight = hasFailed ? '600' : '';
    }

    if (latestButton) {
        latestButton.disabled = isRunning;
        latestButton.textContent = isRunning ? '总结进行中...' : '总结到最新';
    }
}

function schedulePendingAutoJournal(chat) {
    if (!chat || !chat.id) return;

    clearTimeout(autoJournalRetryTimers[chat.id]);
    autoJournalRetryTimers[chat.id] = setTimeout(() => {
        flushPendingAutoJournal(chat.id);
    }, 1200);
}

async function flushPendingAutoJournal(chatId) {
    const chat = db.characters.find(character => character.id === chatId) || db.groups.find(group => group.id === chatId);
    if (!chat) return;

    ensureAutoJournalState(chat);
    if (!chat.autoJournalPending) {
        return;
    }

    if (typeof isGenerating !== 'undefined' && isGenerating) {
        schedulePendingAutoJournal(chat);
        return;
    }

    await processAutoJournal(chat, {
        force: true,
        processAllAvailable: true,
        showNoPendingToast: false
    });
}

async function processAutoJournal(chat, options = {}) {
    if (!chat) return { status: 'noop', generatedCount: 0 };

    ensureAutoJournalState(chat);

    if (!options.force && !chat.autoJournalEnabled) {
        refreshAutoJournalButton(chat, options.chatType);
        return { status: 'disabled', generatedCount: 0 };
    }

    if (chat.autoJournalState === 'running') {
        return { status: 'running', generatedCount: 0 };
    }

    if (typeof isGenerating !== 'undefined' && isGenerating) {
        chat.autoJournalPending = true;
        schedulePendingAutoJournal(chat);
        refreshAutoJournalButton(chat, options.chatType);
        return { status: 'queued', generatedCount: 0 };
    }

    const nextRange = getNextAutoJournalRange(chat);
    if (!nextRange) {
        chat.autoJournalPending = false;
        chat.autoJournalState = 'idle';
        refreshAutoJournalButton(chat, options.chatType);
        if (!options.showNoPendingToast) {
            showToast('当前没有可补的自动总结范围');
        }
        return { status: 'noop', generatedCount: 0 };
    }

    const savedChatId = currentChatId;
    const savedChatType = currentChatType;
    const targetChatType = options.chatType || getAutoJournalChatType(chat);
    let generatedCount = 0;

    chat.autoJournalState = 'running';
    chat.autoJournalPending = false;
    refreshAutoJournalButton(chat, targetChatType);

    currentChatId = chat.id;
    currentChatType = targetChatType;

    try {
        do {
            const currentRange = getNextAutoJournalRange(chat);
            if (!currentRange) break;

            await generateJournal(
                currentRange.start,
                currentRange.end,
                !!chat.journalIncludeFavorited,
                true,
                null,
                {
                    isAutoJournal: true,
                    propagateError: true,
                    suppressSuccessToast: true
                }
            );

            setAutoJournalCursorByEndIndex(chat, currentRange.end);
            generatedCount++;
            await saveData();
        } while (options.processAllAvailable && getNextAutoJournalRange(chat));

        chat.autoJournalState = 'idle';
        chat.autoJournalPending = false;
        await saveData();
        refreshAutoJournalButton(chat, targetChatType);

        if (options.showSuccessToast && generatedCount > 0) {
            showToast(generatedCount > 1 ? `已补生成 ${generatedCount} 篇自动总结` : '自动总结已补生成');
        }

        return { status: 'success', generatedCount };
    } catch (error) {
        console.error('自动总结失败:', error);
        chat.autoJournalState = 'failed';
        chat.autoJournalPending = false;
        await saveData();
        refreshAutoJournalButton(chat, targetChatType);
        
        // 高调报错：弹窗显示失败原因
        const errorMsg = error ? (error.message || String(error)) : '未知错误';
        if (typeof showAppConfirmDialog === 'function') {
            showAppConfirmDialog({
                title: '自动总结失败',
                message: `API 报错：\n${errorMsg}\n\n当前进度已暂停。当您继续发送消息，累计达到下一个间隔时系统将自动重试；您也可以随时在设置中手动触发。`,
                confirmText: '确定',
                cancelText: '' // 隐藏取消按钮
            }).catch(() => {});
        } else {
            window.alert(`自动总结失败：\n${errorMsg}`);
        }
        
        return { status: 'failed', generatedCount, error };
    } finally {
        currentChatId = savedChatId;
        currentChatType = savedChatType;
    }
}

async function applyAutoJournalToggleDecision(chat, enabled, options = {}) {
    if (!chat) return { status: 'noop' };

    ensureAutoJournalState(chat);
    chat.autoJournalEnabled = enabled;

    if (!enabled) {
        chat.autoJournalPending = false;
        if (chat.autoJournalState === 'running') {
            chat.autoJournalState = 'idle';
        }
        refreshAutoJournalButton(chat, options.chatType);
        return { status: 'disabled' };
    }

    chat.autoJournalState = 'idle';

    const info = getAutoJournalCursorInfo(chat);
    if (info.unsummarizedCount <= 0) {
        refreshAutoJournalButton(chat, options.chatType);
        return { status: 'enabled' };
    }

    const batchCount = info.completedBatchCount;
    const message = batchCount > 0
        ? `检测到当前聊天已有 ${info.unsummarizedCount} 条未纳入自动总结的消息。\n\n是否立即补总结已满 ${info.interval} 条的部分？这将生成 ${batchCount} 篇自动总结。`
        : `检测到当前聊天已有 ${info.unsummarizedCount} 条未纳入自动总结的消息。\n\n是否从这些现有消息继续累计自动总结？选择“取消”将从当前最新消息重新开始计数。`;

    let decision = 'confirm';
    if (typeof showAppConfirmDialog === 'function') {
        decision = await showAppConfirmDialog({
            title: '检测到未总结消息',
            message,
            confirmText: batchCount > 0 ? '立即补总结' : '继续累计',
            cancelText: '从最新开始',
            dismissText: '稍后再说'
        });
    } else if (!window.confirm(message)) {
        decision = 'cancel';
    }

    if (decision === 'dismiss') {
        refreshAutoJournalButton(chat, options.chatType);
        return { status: 'dismissed_keep_backlog' };
    }

    if (decision !== 'confirm') {
        resetAutoJournalCursorToLatest(chat);
        refreshAutoJournalButton(chat, options.chatType);
        return { status: 'baseline_reset' };
    }

    if (batchCount <= 0) {
        refreshAutoJournalButton(chat, options.chatType);
        return { status: 'enabled_keep_backlog' };
    }

    return processAutoJournal(chat, {
        force: true,
        processAllAvailable: true,
        showNoPendingToast: true,
        showSuccessToast: true,
        chatType: options.chatType
    });
}

async function retryAutoJournalForChat(chat, options = {}) {
    if (!chat) return { status: 'noop' };

    ensureAutoJournalState(chat);
    chat.autoJournalState = 'idle';

    return processAutoJournal(chat, {
        force: true,
        processAllAvailable: true,
        showNoPendingToast: false,
        showSuccessToast: true,
        ignoreFailedState: true,
        chatType: options.chatType || getAutoJournalChatType(chat)
    });
}

async function summarizeUntilLatest(chat, options = {}) {
    if (!chat) return { status: 'noop', generatedCount: 0 };

    ensureAutoJournalState(chat);

    if (chat.autoJournalState === 'running' || (typeof isGenerating !== 'undefined' && isGenerating)) {
        showToast('正在总结中，请稍候...');
        return { status: 'running', generatedCount: 0 };
    }

    const info = getAutoJournalCursorInfo(chat);
    if (info.unsummarizedCount <= 0) {
        showToast('当前没有新增消息需要总结');
        return { status: 'noop', generatedCount: 0 };
    }

    const start = info.nextStartIndex + 1;
    const end = info.history.length;
    const interval = info.interval;
    const mode = options.mode === 'split' ? 'split' : 'single';
    const splitSize = Math.max(1, parseInt(options.splitSize, 10) || interval);
    const completedBatchCount = Math.floor(info.unsummarizedCount / splitSize);
    const remainderCount = Math.max(0, info.unsummarizedCount - (completedBatchCount * splitSize));
    const includeRemainder = remainderCount > 0 ? options.includeRemainder !== false : true;
    const targetChatType = options.chatType || getAutoJournalChatType(chat);
    const savedChatId = currentChatId;
    const savedChatType = currentChatType;
    let generatedCount = 0;
    let finalCursorEnd = null;

    chat.autoJournalState = 'running';
    chat.autoJournalPending = false;
    refreshAutoJournalButton(chat, targetChatType);

    currentChatId = chat.id;
    currentChatType = targetChatType;

    try {
        if (mode === 'split') {
            const fullBatchEnd = start - 1 + (completedBatchCount * splitSize);
            const limit = includeRemainder ? end : fullBatchEnd;

            if (limit < start) {
                chat.autoJournalState = 'idle';
                refreshAutoJournalButton(chat, targetChatType);
                showToast(`当前未满 ${splitSize} 条，暂无可拆分的完整批次`);
                return { status: 'noop', generatedCount: 0 };
            }

            let cursor = start;
            while (cursor <= limit) {
                const batchEnd = Math.min(cursor + splitSize - 1, limit);
                await generateJournal(
                    cursor,
                    batchEnd,
                    !!chat.journalIncludeFavorited,
                    true,
                    null,
                    {
                        isAutoJournal: true,
                        propagateError: true,
                        suppressSuccessToast: true
                    }
                );

                setAutoJournalCursorByEndIndex(chat, batchEnd);
                finalCursorEnd = batchEnd;
                generatedCount++;
                await saveData();
                cursor = batchEnd + 1;
            }
        } else {
            await generateJournal(
                start,
                end,
                !!chat.journalIncludeFavorited,
                true,
                null,
                {
                    isAutoJournal: true,
                    propagateError: true,
                    suppressSuccessToast: true
                }
            );

            setAutoJournalCursorByEndIndex(chat, end);
            finalCursorEnd = end;
            generatedCount = 1;
        }

        chat.autoJournalState = 'idle';
        chat.autoJournalPending = false;
        await saveData();
        refreshAutoJournalButton(chat, targetChatType);

        if (mode === 'split') {
            const remainingCount = Math.max(0, end - (finalCursorEnd || 0));
            if (remainingCount > 0) {
                showToast(`已按每 ${splitSize} 条生成 ${generatedCount} 篇总结，剩余 ${remainingCount} 条消息待下次处理`);
            } else {
                showToast(generatedCount > 1 ? `已按每 ${splitSize} 条生成 ${generatedCount} 篇总结` : `已按每 ${splitSize} 条生成 1 篇总结`);
            }
        } else {
            showToast(`已总结到最新 (第${start}-${end}条)`);
        }

        return { status: 'success', generatedCount, endIndex: finalCursorEnd };
    } catch (error) {
        console.error('总结到最新失败:', error);
        chat.autoJournalState = 'idle';
        chat.autoJournalPending = false;
        await saveData();
        refreshAutoJournalButton(chat, targetChatType);
        showApiError(error);
        return { status: 'failed', generatedCount, error };
    } finally {
        currentChatId = savedChatId;
        currentChatType = savedChatType;
    }
}

/**
 * 在 AI 回复完成后调用：若开启自动总结且达到间隔，则按消息 ID 游标补齐下一个完整区间。
 * @param {Object} chat - 当前聊天对象（character 或 group）
 */
async function checkAndTriggerAutoJournal(chat) {
    if (!chat || !chat.autoJournalEnabled) return;

    ensureAutoJournalState(chat);

    await processAutoJournal(chat, {
        force: false,
        processAllAvailable: true,
        showNoPendingToast: true
    });
}
