// --- Chat prompt semantics facade (V15 canonical owner) ---
// 聚合 promptContext 与 promptPieces。facade 只做稳定出口，不写业务逻辑。
(function registerChatPromptSemantics(app) {
    const core = app.core;
    core.chat = core.chat || {};
    core.chat.promptSemantics = Object.assign(
        {},
        core.chat.promptContext || {},
        core.chat.promptPieces || {}
    );
})(OwoApp);
