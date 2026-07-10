// --- Journal output contracts (v0.9.3 canonical owner) ---
(function registerJournalOutputContracts(app) {
    const registry = app.core.output.outputContracts;

    function unescapeXml(value) {
        return String(value || '')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
    }

    function extractJournal(raw) {
        const text = String(raw || '').trim();
        if (!text) throw new Error('模型返回为空');

        let title = '';
        let content = '';
        try {
            const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''));
            title = String(parsed && parsed.title || '').trim();
            content = String(parsed && parsed.content || '').trim();
        } catch (_) {
            const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i);
            const contentMatch = text.match(/<content>([\s\S]*?)<\/content>/i);
            title = titleMatch ? unescapeXml(titleMatch[1]).trim() : '';
            content = contentMatch ? unescapeXml(contentMatch[1]).trim() : '';
        }

        if (!title) throw new Error('日记输出缺少非空 title');
        if (!content) throw new Error('日记输出缺少非空 content');
        return { title, content };
    }

    function buildRepairPrompt(raw) {
        return [
            '你是结构化输出修复器。只修复格式，不补充、删改或推断原文事实。',
            '请把下面内容转换为严格 XML；只输出 XML，不要解释：',
            '<journal>',
            '  <title>非空标题</title>',
            '  <content>非空正文</content>',
            '</journal>',
            '',
            '待修复内容：',
            String(raw || '')
        ].join('\n');
    }

    registry.register({ id: 'journal.entry.v1', schemaVersion: 1, parse: extractJournal, buildRepairPrompt });
    registry.register({ id: 'journal.merge-result.v1', schemaVersion: 1, parse: extractJournal, buildRepairPrompt });
})(OwoApp);
