// --- Data Management view (v0.2.17) ---
// 数据管理承载教程/备份/存储；控制台只保留“打开悬浮球控制台”入口，不再嵌入第二套控制台 UI。
(function registerDataManagementView(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.dataManagement;
    const service = feature.service;

    function openConsole() {
        return service.openConsole({ source: 'dataManagement.view' });
    }

    function handleClick(event) {
        const target = event.target;
        const actionEl = target && target.closest ? target.closest('[data-dm-action]') : null;
        if (actionEl && actionEl.dataset.dmAction === 'open-console') {
            openConsole();
            return;
        }
        const controlEl = target && target.closest ? target.closest('button, input[type="button"], input[type="submit"], input[type="checkbox"], select') : null;
        if (controlEl && typeof service.recordControlAction === 'function') {
            service.recordControlAction(controlEl, event.type, { host: 'dataManagement' });
        }
    }

    function bindActions(screen) {
        if (!screen || screen.__owoDataManagementClickBound) return;
        screen.__owoDataManagementClickBound = true;
        screen.addEventListener('click', handleClick);
    }

    function render() {
        const screen = document.getElementById('data-management-screen');
        if (!screen) return;
        bindActions(screen);
        screen.innerHTML = `
            <header class="app-header">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container"><h1 class="title">数据管理</h1></div>
                <div class="placeholder"></div>
            </header>
            <main class="content data-management-content">
                <section class="dm-hero-card">
                    <h2>数据管理</h2>
                    <p>教程、GitHub 备份恢复、导入导出、数据清理和存储分析都直接合并到这里；控制台只在悬浮球里打开，避免重复面板。</p>
                </section>

                <details class="dm-fold" open>
                    <summary>调试记录</summary>
                    <div class="dm-fold-body dm-console-entry">
                        <p class="dm-note">控制台已经收口到悬浮球：用户发送、AI 回复、AI/API 请求、模型返回、错误和诊断都会汇总到同一个面板。</p>
                        <button type="button" class="btn btn-primary dm-primary-action" data-dm-action="open-console">打开悬浮球控制台</button>
                    </div>
                </details>

                <details class="dm-fold" open>
                    <summary>教程 / 备份 / 数据清理</summary>
                    <div class="dm-fold-body dm-legacy-body">
                        <p class="dm-note">原教程页内容直接承载在这里，包括 GitHub Token、仓库配置、自动备份、恢复、分类导入导出、数据清理、更新日志和使用说明。</p>
                        <div id="data-management-tutorial-content-area" class="dm-tutorial-mount dm-embedded-tutorial"></div>
                    </div>
                </details>

                <details class="dm-fold">
                    <summary>存储分析</summary>
                    <div class="dm-fold-body dm-legacy-body">
                        <p class="dm-note">存储分析直接嵌入数据管理。</p>
                        <div id="data-management-storage-mount" class="dm-storage-mount dm-embedded-storage"></div>
                    </div>
                </details>
            </main>`;
        service.renderTutorialContent(screen.querySelector('#data-management-tutorial-content-area'));
        service.renderStorageAnalysis(screen.querySelector('#data-management-storage-mount'));
        if (service.consumeOpenConsoleRequest()) openConsole();
    }

    feature.view = { render, openConsole };
})(window);
