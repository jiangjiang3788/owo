// --- Peek XML semantics owner (V30 canonical owner) ---
// 只负责把 AI 返回的 XML 片段解析成 JS 对象；不读写状态，不渲染 DOM，不发请求。
(function registerPeekXmlSemantics(app) {
    app.core = app.core || {};
    app.core.peek = app.core.peek || {};

    function coerceTextValue(value) {
        const text = String(value == null ? '' : value).trim();
        if (text === 'true') return true;
        if (text === 'false') return false;
        if (text !== '' && !Number.isNaN(Number(text))) return Number(text);
        return text;
    }

    function unwrapResultXml(xmlString) {
        const source = String(xmlString == null ? '' : xmlString);
        const match = source.match(/<result>([\s\S]*?)<\/result>/i);
        return match ? match[0] : source;
    }

    function createXmlDocument(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(unwrapResultXml(xmlString), 'text/xml');
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
            throw new Error('XML 解析错误: ' + parseError[0].textContent);
        }
        return xmlDoc;
    }

    function shouldFlattenList(containerKey, childKey) {
        const listKeys = ['item', 'entry', 'photo', 'memo', 'thought', 'post', 'conversation', 'reply', 'message', 'comment'];
        return String(containerKey || '').endsWith('s') || listKeys.includes(childKey) || containerKey === 'history' || containerKey === 'trajectory';
    }

    function parseXmlNode(node) {
        if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
            return coerceTextValue(node.textContent);
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return null;

        const children = Array.from(node.childNodes).filter(child => {
            const isText = child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE;
            return child.nodeType === Node.ELEMENT_NODE || (isText && child.textContent.trim() !== '');
        });

        if (children.length === 0) return '';
        if (children.length === 1 && (children[0].nodeType === Node.TEXT_NODE || children[0].nodeType === Node.CDATA_SECTION_NODE)) {
            return parseXmlNode(children[0]);
        }

        const obj = {};
        const isArrayMap = {};
        children.forEach(child => {
            if (child.nodeType !== Node.ELEMENT_NODE) return;
            const name = child.nodeName;
            if (obj[name] !== undefined) {
                if (!isArrayMap[name]) {
                    obj[name] = [obj[name]];
                    isArrayMap[name] = true;
                }
                obj[name].push(parseXmlNode(child));
            } else {
                obj[name] = parseXmlNode(child);
            }
        });

        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (!value || typeof value !== 'object' || Array.isArray(value)) return;
            const subKeys = Object.keys(value);
            if (subKeys.length !== 1) return;
            const subKey = subKeys[0];
            if (!shouldFlattenList(key, subKey)) return;
            obj[key] = Array.isArray(value[subKey]) ? value[subKey] : [value[subKey]];
        });

        return obj;
    }

    function parseXmlToJson(xmlString) {
        const xmlDoc = createXmlDocument(xmlString);
        const result = parseXmlNode(xmlDoc.documentElement);
        return xmlDoc.documentElement.nodeName === 'result'
            ? result
            : { [xmlDoc.documentElement.nodeName]: result };
    }

    app.core.peek.xmlSemantics = {
        coerceTextValue,
        unwrapResultXml,
        parseXmlToJson
    };
})(OwoApp);
