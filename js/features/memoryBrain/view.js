// --- Memory Brain view owner (v0.3.0) ---
// 只负责记忆脑 App 展示和按钮绑定，不直接读取旧记忆系统私有状态。
(function registerMemoryBrainView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    const service = feature.service;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderLayerCards(cards) {
        return cards.map(card => `
            <article class="memory-brain-layer-card" data-layer="${escapeHtml(card.id)}">
                <div class="memory-brain-layer-top">
                    <span>${escapeHtml(card.name)}</span>
                    <strong>${escapeHtml(card.countText)}</strong>
                </div>
                <p>${escapeHtml(card.goal)}</p>
                <small>${escapeHtml(card.status)}</small>
            </article>
        `).join('');
    }

    function renderReplacementCards(cards) {
        return cards.map(card => `
            <article class="memory-brain-stage-card">
                <div class="memory-brain-stage-index">${card.index}</div>
                <div>
                    <h3>${escapeHtml(card.name)} <span>${escapeHtml(card.targetVersion)}</span></h3>
                    <p>${escapeHtml(card.goal)}</p>
                    <div class="memory-brain-stage-modes">
                        <em>旧系统：${escapeHtml(card.oldSystemMode)}</em>
                        <em>新记忆脑：${escapeHtml(card.brainMode)}</em>
                    </div>
                </div>
            </article>
        `).join('');
    }

    function renderLegacyScan(scan) {
        if (!scan) {
            return `<div class="memory-brain-empty">还没有扫描旧记忆来源。点“扫描旧记忆源”后，只统计来源，不迁移、不写入旧系统。</div>`;
        }
        const sources = (scan.sources || []).map(source => `
            <div class="memory-brain-source-pill">
                <span>${escapeHtml(source.name)}</span>
                <strong>${escapeHtml(source.count)}</strong>
                <small>${escapeHtml(source.mode)}</small>
            </div>
        `).join('');
        const topChats = (scan.topChats || []).map(chat => `
            <li>
                <span>${escapeHtml(chat.name)}</span>
                <em>${escapeHtml(chat.messageCount)} 条消息 · ${escapeHtml(chat.vectorEntryCount)} 向量 · ${escapeHtml(chat.tableCellCount)} 表格项</em>
            </li>
        `).join('');
        return `
            <div class="memory-brain-scan-grid">${sources}</div>
            <ul class="memory-brain-chat-list">${topChats || '<li><span>暂无聊天来源</span><em></em></li>'}</ul>
        `;
    }

    function buildHtml(dashboard) {
        const totals = dashboard.totals || {};
        return `
            <header class="app-header memory-brain-header">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container">
                    <h1 class="title">记忆脑</h1>
                    <p class="memory-brain-subtitle">v0.3.0 · 影子模式 · 不替换旧系统</p>
                </div>
                <button class="action-btn" id="memory-brain-open-console-btn">控制台</button>
            </header>
            <main class="memory-brain-page">
                <section class="memory-brain-hero">
                    <div>
                        <span class="memory-brain-kicker">Memory Brain</span>
                        <h2>先建长期脑骨架，再逐步接管旧记忆。</h2>
                        <p>这一版只做结构、入口、旧来源扫描和替换路线。旧记忆表格 / 向量 / 日记继续工作，新记忆脑先做只读观察，避免双系统互相抢注入。</p>
                    </div>
                    <div class="memory-brain-hero-stats">
                        <strong>${escapeHtml(totals.messages || 0)}</strong><span>聊天消息</span>
                        <strong>${escapeHtml(totals.vectorEntries || 0)}</strong><span>向量记忆</span>
                        <strong>${escapeHtml(totals.tableCells || 0)}</strong><span>表格项</span>
                    </div>
                </section>

                <section class="memory-brain-actions">
                    <button id="memory-brain-scan-btn">扫描旧记忆源</button>
                    <button id="memory-brain-copy-plan-btn">复制替换计划</button>
                    <button id="memory-brain-refresh-btn">刷新页面</button>
                </section>

                <section class="memory-brain-section">
                    <div class="memory-brain-section-title">
                        <h2>七层记忆结构</h2>
                        <p>分类不写死，只固定生长流程：事件 → 事实 → 家族 → graph → 长期模型 → 注入包。</p>
                    </div>
                    <div class="memory-brain-layer-grid">${renderLayerCards(dashboard.layerCards)}</div>
                </section>

                <section class="memory-brain-section">
                    <div class="memory-brain-section-title">
                        <h2>旧系统什么时候被替换</h2>
                        <p>替换不是时间点，而是 gate：新记忆脑能稳定整理、对照、注入后才接管。</p>
                    </div>
                    <div class="memory-brain-stage-list">${renderReplacementCards(dashboard.replacementCards)}</div>
                </section>

                <section class="memory-brain-section">
                    <div class="memory-brain-section-title">
                        <h2>历史记录怎么整理</h2>
                        <p>历史不会一次性全吞，先分批生成事件，再拆事实，再聚家族和 graph。</p>
                    </div>
                    ${renderLegacyScan(dashboard.legacyScan)}
                </section>

                <section class="memory-brain-section memory-brain-note">
                    <h2>避免双系统的规则</h2>
                    <p>v0.3.0 开始只允许一个正式聊天注入 owner。旧表格、旧向量、旧日记在切换前继续正式工作；新记忆脑先只读扫描和整理预览。等 v0.3.6 完成注入影子对照后，再决定是否切换。</p>
                </section>
            </main>
        `;
    }

    function showToast(text) {
        const toast = app.shared && app.shared.ui && app.shared.ui.toast;
        if (toast && typeof toast.showToast === 'function') toast.showToast(text);
    }

    function bindEvents(screen) {
        const scanBtn = screen.querySelector('#memory-brain-scan-btn');
        if (scanBtn) scanBtn.addEventListener('click', () => {
            service.scanLegacySources();
            render();
            showToast('已扫描旧记忆来源，不会迁移或改写旧系统');
        });
        const refreshBtn = screen.querySelector('#memory-brain-refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => render());
        const copyBtn = screen.querySelector('#memory-brain-copy-plan-btn');
        if (copyBtn) copyBtn.addEventListener('click', () => {
            service.copyPlanningText();
            showToast('已复制记忆脑替换计划');
        });
        const consoleBtn = screen.querySelector('#memory-brain-open-console-btn');
        if (consoleBtn) consoleBtn.addEventListener('click', () => service.openConsole());
    }

    function render() {
        const screen = document.getElementById('memory-brain-screen');
        if (!screen) return false;
        const dashboard = service.getDashboard();
        screen.innerHTML = buildHtml(dashboard);
        bindEvents(screen);
        service.recordOperation('打开记忆脑 App', {
            mode: dashboard.mode,
            stage: dashboard.currentStageId,
            totals: dashboard.totals
        });
        return true;
    }

    feature.view = { render };
})(window);
