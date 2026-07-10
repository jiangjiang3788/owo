// --- Wallet / shop payment semantics owner (V32 canonical owner) ---
// 只负责钱包、商城、代付、转账、亲属卡卡片的纯语义：解析、归一化、状态文案；不访问运行时状态、浏览器接口或网络。
(function registerWalletPaymentSemantics(app) {
    const core = app.core = app.core || {};
    core.wallet = core.wallet || {};

    function text(value) {
        return String(value == null ? '' : value).trim();
    }

    function normalizeAmount(value, fallback) {
        const raw = text(value).replace(/,/g, '');
        const num = Number.parseFloat(raw);
        if (!Number.isFinite(num)) return Number.isFinite(fallback) ? fallback : 0;
        return Math.max(0, num);
    }

    function formatMoney(value) {
        const amount = normalizeAmount(value, 0);
        return amount % 1 === 0 ? String(amount) : amount.toFixed(2);
    }

    function formatMoneyFixed(value) {
        return normalizeAmount(value, 0).toFixed(2);
    }

    function parseCartItems(itemsText) {
        const raw = text(itemsText);
        if (!raw) return [];
        return raw.split(/,\s*/).filter(Boolean).map((entry) => {
            const parts = entry.match(/(.+?)\s*x(\d+)$/);
            if (parts) {
                return { name: text(parts[1]), qty: Math.max(1, Number.parseInt(parts[2], 10) || 1) };
            }
            return { name: text(entry), qty: 1 };
        });
    }

    function parseShopOrderContent(content) {
        const match = text(content).match(/\[(.*?)为(.*?)下单了[：:](.*?)\|(.*?)\|(.*?)\]/);
        if (!match) return null;
        const deliveryType = text(match[3]);
        const pickupMatch = deliveryType.match(/自提口令:\s*(.*)/);
        return {
            kind: 'shop-order',
            fromName: text(match[1]),
            toName: text(match[2]),
            deliveryType,
            totalPrice: text(match[4]),
            totalAmount: normalizeAmount(match[4], 0),
            itemsText: text(match[5]),
            items: parseCartItems(match[5]),
            isPickup: !!pickupMatch,
            pickupCode: pickupMatch ? text(pickupMatch[1]) : '',
            match
        };
    }

    function parsePayRequestContent(content) {
        const match = text(content).match(/\[(.*?)向(.*?)发起了代付请求[：:](.*?)\|(.*?)\]/);
        if (!match) return null;
        return {
            kind: 'pay-request',
            fromName: text(match[1]),
            toName: text(match[2]),
            totalPrice: text(match[3]),
            totalAmount: normalizeAmount(match[3], 0),
            itemsText: text(match[4]),
            items: parseCartItems(match[4]),
            match
        };
    }

    function parseTransferContent(content) {
        const raw = text(content);
        const privateSentMatch = raw.match(/\[.*?给你转账[：:]([\d.,]+)元[；;]备注[：:](.*?)\]/);
        const privateReceivedMatch = raw.match(/\[.*?的转账[：:]([\d.,]+)元[；;]备注[：:](.*?)\]/);
        const groupMatch = raw.match(/\[(.*?)\s*向\s*(.*?)\s*转账[：:]([\d.,]+)元[；;]备注[：:](.*?)\]/);
        const match = privateSentMatch || privateReceivedMatch || groupMatch;
        if (!match) return null;
        if (groupMatch) {
            return {
                kind: 'group-transfer',
                fromName: text(groupMatch[1]),
                toName: text(groupMatch[2]),
                amount: normalizeAmount(groupMatch[3], 0),
                amountText: formatMoneyFixed(groupMatch[3]),
                remark: text(groupMatch[4]),
                privateSentMatch,
                privateReceivedMatch,
                groupMatch,
                match
            };
        }
        return {
            kind: privateSentMatch ? 'private-sent-transfer' : 'private-received-transfer',
            amount: normalizeAmount(match[1], 0),
            amountText: formatMoneyFixed(match[1]),
            remark: text(match[2]),
            privateSentMatch,
            privateReceivedMatch,
            groupMatch,
            match
        };
    }

    function parseFamilyCardGiftContent(content) {
        const match = text(content).match(/\[(.+?)赠送(.+?)亲属卡[：:]额度([\d.,]+)元[；;]刷新周期[：:](.+?)\]/);
        if (!match) return null;
        return {
            kind: 'family-card-gift',
            fromName: text(match[1]),
            toName: text(match[2]),
            limit: normalizeAmount(match[3], 0),
            limitText: text(match[3]),
            periodText: text(match[4]),
            match
        };
    }

    function getFamilyCardPeriodText(card, fallbackText) {
        const source = card || {};
        if (source.refreshPeriod === 'daily') return '每天';
        if (source.refreshPeriod === 'weekly') return '每周';
        if (source.refreshPeriod === 'monthly') return '每月';
        if (source.refreshPeriod === 'custom') return String(source.refreshDays || 30) + '天';
        return text(fallbackText) || (source.refreshDays ? String(source.refreshDays) + '天' : '—');
    }

    function getFamilyCardStatusText(status) {
        if (status === 'accepted') return '已接收';
        if (status === 'returned') return '已退还';
        if (status === 'revoked') return '已收回';
        return '待接收';
    }

    function getPayRequestStatusText(status) {
        if (status === 'paid') return '已支付';
        if (status === 'rejected') return '已拒绝';
        return '待支付';
    }

    function serializeCartItems(cart) {
        if (!Array.isArray(cart)) return '';
        return cart.map((entry) => {
            const item = entry && entry.item ? entry.item : {};
            return `${text(item.name)} x${Math.max(1, Number(entry.quantity) || 1)}`;
        }).join(', ');
    }

    function calculateCartTotal(cart) {
        if (!Array.isArray(cart)) return 0;
        return cart.reduce((sum, entry) => {
            const item = entry && entry.item ? entry.item : {};
            return sum + normalizeAmount(item.price, 0) * (Math.max(1, Number(entry.quantity) || 1));
        }, 0);
    }

    function buildShopOrderContent(myName, realName, deliveryName, totalAmount, itemsText) {
        return `[${text(myName)}为${text(realName)}下单了：${text(deliveryName)}|${formatMoneyFixed(totalAmount)}|${text(itemsText)}]`;
    }

    function buildPayRequestContent(myName, realName, totalAmount, itemsText) {
        return `[${text(myName)}向${text(realName)}发起了代付请求:${formatMoneyFixed(totalAmount)}|${text(itemsText)}]`;
    }

    function createShopExpenseRecord(amount, itemsText, realName) {
        return {
            type: 'expense',
            amount: normalizeAmount(amount, 0),
            remark: '商城订单：' + text(itemsText),
            source: '商城',
            charName: text(realName)
        };
    }

    function createFamilyCardConsumptionNotice(myName, amount, itemsText) {
        return `[系统情景通知：你给${text(myName)}的亲属卡刚刚产生了一笔 ${formatMoneyFixed(amount)} 元的消费，用途是：在商城购买了“${text(itemsText)}”。请根据你的人设和你们现在的关系，在下一次回复中自然地对此作出反应或询问。]`;
    }

    function buildPayResponseText(myName, realName, action) {
        const verb = action === 'pay' ? '同意了' : '拒绝了';
        return `[${text(myName)}${verb}${text(realName)}的代付请求]`;
    }

    function createPayExpenseRecord(amount, realName) {
        return {
            type: 'expense',
            amount: normalizeAmount(amount, 0),
            remark: '代付给' + text(realName),
            source: '商城代付',
            charName: text(realName)
        };
    }

    core.wallet.paymentSemantics = {
        normalizeAmount,
        formatMoney,
        formatMoneyFixed,
        parseCartItems,
        serializeCartItems,
        calculateCartTotal,
        buildShopOrderContent,
        buildPayRequestContent,
        createShopExpenseRecord,
        createFamilyCardConsumptionNotice,
        parseShopOrderContent,
        parsePayRequestContent,
        parseTransferContent,
        parseFamilyCardGiftContent,
        getFamilyCardPeriodText,
        getFamilyCardStatusText,
        getPayRequestStatusText,
        buildPayResponseText,
        createPayExpenseRecord
    };
})(OwoApp);
