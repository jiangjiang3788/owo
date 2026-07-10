// --- archive-screen screen template (V35) ---
// 只保存从 index.html 拆出的静态 HTML；不写业务逻辑。
(function registerTemplate(global) {
    const registry = global.OwoApp && global.OwoApp.app && global.OwoApp.app.screenTemplates;
    if (!registry || typeof registry.registerTemplate !== 'function') {
        throw new Error('[archive-screen template] OwoApp.app.screenTemplates 尚未初始化');
    }

    registry.registerTemplate('archive-screen', "\n            <header class=\"app-header\">\n                <button class=\"back-btn\" data-target=\"chat-settings-screen\">‹</button>\n                <div class=\"title-container\">\n                    <h1 class=\"title\">记忆存档</h1>\n                </div>\n                <div class=\"action-btn-group\">\n                    <button type=\"button\" id=\"archive-multi-select-btn\" class=\"action-btn\" title=\"多选\">多选</button>\n                    <button type=\"button\" id=\"create-archive-btn\" class=\"action-btn\" title=\"新建存档\">+ 新建</button>\n                </div>\n            </header>\n            <div id=\"archive-multi-select-bar\" class=\"archive-multi-select-bar\">\n                <span>已选 <span id=\"archive-selected-count\">0</span> 项</span>\n                <button type=\"button\" id=\"archive-multi-delete-btn\" class=\"btn btn-small\" disabled>删除选中</button>\n                <button type=\"button\" id=\"archive-cancel-multi-btn\" class=\"btn btn-small btn-secondary\">取消</button>\n            </div>\n            <main class=\"content\">\n                <ul id=\"archive-list-container\" class=\"archive-list\"></ul>\n                <div id=\"no-archives-placeholder\" class=\"placeholder-text\" style=\"display: none;\">\n                    <p>还没有保存任何存档</p>\n                    <p>点击右上角「+ 新建」创建第一个存档</p>\n                </div>\n            </main>\n        ", {
        owner: 'features/archive',
        version: 'V35'
    });
})(window);
