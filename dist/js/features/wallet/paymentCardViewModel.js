// --- Wallet / shop payment card view model owner (V32 canonical owner) ---
// 只负责聊天卡片渲染前的数据模型：订单、代付、转账、亲属卡；不写 DOM、不保存、不发请求。
(function registerPaymentCardViewModel(app) {
    const features = app.features = app.features || {};
    features.wallet = features.wallet || {};
    const semantics = app.core.wallet.paymentSemantics;

    function pad2(value) {
        return String(value).padStart(2, '0');
    }

    function formatReceiptDate(timestamp) {
        const date = new Date(Number(timestamp) || Date.now());
        return `${date.getMonth() + 1}/${date.getDate()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    }

    function createOrderId(prefix, timestamp) {
        const date = new Date(Number(timestamp) || Date.now());
        return `${prefix}.${date.getTime().toString().slice(-8)}`;
    }

    function getPiggyBankSnapshot(state) {
        return state && state.piggyBank ? state.piggyBank : { familyCards: [], receivedFamilyCards: [] };
    }

    function findSentFamilyCard(state, id) {
        const piggyBank = getPiggyBankSnapshot(state);
        return Array.isArray(piggyBank.familyCards) ? piggyBank.familyCards.find(card => card.id === id) : null;
    }

    function findReceivedFamilyCard(state, id) {
        const piggyBank = getPiggyBankSnapshot(state);
        return Array.isArray(piggyBank.receivedFamilyCards) ? piggyBank.receivedFamilyCards.find(card => card.id === id) : null;
    }

    function createShopOrderViewModel(input) {
        const parsed = semantics.parseShopOrderContent(input && input.content);
        if (!parsed) return null;
        const message = (input && input.message) || {};
        return Object.assign({}, parsed, {
            receiptType: 'shop-order',
            orderId: createOrderId('NO', input && input.timestamp),
            dateStr: formatReceiptDate(input && input.timestamp),
            isPickedUp: !!message.isPickedUp
        });
    }

    function createPayRequestViewModel(input) {
        const parsed = semantics.parsePayRequestContent(input && input.content);
        if (!parsed) return null;
        const message = (input && input.message) || {};
        const isSent = !!(input && input.isSent);
        const status = message.payStatus || 'pending';
        return Object.assign({}, parsed, {
            receiptType: 'pay-request',
            orderId: createOrderId('REQ', input && input.timestamp),
            dateStr: formatReceiptDate(input && input.timestamp),
            status,
            statusText: semantics.getPayRequestStatusText(message.payStatus),
            showActions: !isSent && !message.payStatus
        });
    }

    function createTransferCardViewModel(input) {
        const parsed = semantics.parseTransferContent(input && input.content);
        if (!parsed) return null;
        const isSent = !!(input && input.isSent);
        const chat = (input && input.chat) || {};
        const chatType = (input && input.currentChatType) || 'private';
        const message = (input && input.message) || {};
        const isSentTransfer = parsed.kind === 'private-sent-transfer' || (parsed.kind === 'group-transfer' && isSent);
        let titleText = '';
        if (parsed.kind === 'group-transfer') {
            const myName = chatType === 'private' ? chat.myName : ((chat.me && chat.me.nickname) || '');
            const isToMe = parsed.toName === myName;
            if (isSent) titleText = `向 ${parsed.toName} 转账`;
            else titleText = isToMe ? `${parsed.fromName} 向你转账` : `${parsed.fromName} 向 ${parsed.toName} 转账`;
        } else {
            titleText = isSentTransfer ? '给你转账' : '转账';
        }
        let statusText = isSentTransfer ? '待查收' : '转账给你';
        if (parsed.kind === 'group-transfer' && !isSent) {
            const myName = chatType === 'private' ? chat.myName : ((chat.me && chat.me.nickname) || '');
            statusText = parsed.toName === myName ? '转账给你' : '转账给Ta';
        }
        if (message.transferStatus === 'received') statusText = '已收款';
        if (message.transferStatus === 'returned') statusText = '已退回';
        const isGroupPendingForMe = chatType === 'group'
            && message.transferStatus === 'pending'
            && parsed.kind === 'group-transfer'
            && !isSent
            && parsed.toName === ((chat.me && chat.me.nickname) || '');
        return Object.assign({}, parsed, {
            isSentTransfer,
            titleText,
            statusText,
            cursor: isGroupPendingForMe ? 'pointer' : (chatType === 'group' ? 'default' : (message.transferStatus !== 'pending' ? 'default' : '')),
            isReceived: message.transferStatus === 'received',
            isReturned: message.transferStatus === 'returned'
        });
    }

    function createFamilyCardViewModel(input) {
        const message = (input && input.message) || {};
        const state = input && input.state;
        const gift = semantics.parseFamilyCardGiftContent(input && input.content);
        const sentCard = message.familyCardId ? findSentFamilyCard(state, message.familyCardId) : null;
        const receivedCard = message.receivedFamilyCardId ? findReceivedFamilyCard(state, message.receivedFamilyCardId) : null;
        const card = sentCard || receivedCard;
        if (!gift && !card) return null;
        const isSent = !!(input && input.isSent);
        const status = message.familyCardStatus || message.receivedFamilyCardStatus || 'pending';
        const periodText = card ? semantics.getFamilyCardPeriodText(card, '') : (gift ? gift.periodText : '');
        const holderName = isSent
            ? (card ? card.targetCharName : (gift ? gift.toName : ''))
            : (card ? card.fromCharName : '');
        const limitText = card ? String(card.limit) : (gift ? gift.limitText : '');
        const cardNumber = card ? card.cardNumber : '****';
        const cardIdShort = card && card.id ? card.id.slice(-8) : String((input && input.timestamp) || Date.now()).slice(-8);
        return {
            receiptType: 'family-card',
            gift,
            card,
            sentCard,
            receivedCard,
            status,
            statusText: semantics.getFamilyCardStatusText(status),
            cardNumber,
            cardIdShort,
            limitText,
            periodText,
            holderName,
            dateStr: formatReceiptDate(input && input.timestamp),
            showActions: !isSent && status === 'pending'
        };
    }

    function getRoutingReport() {
        return {
            owner: 'OwoApp.features.wallet.paymentCardViewModel',
            semanticsOwner: 'OwoApp.core.wallet.paymentSemantics',
            cards: ['shop-order', 'pay-request', 'transfer', 'family-card'],
            note: 'V32: chat_render 保留 DOM renderer；钱包/商城/代付/亲属卡卡片解析和 view model 归本模块。'
        };
    }

    features.wallet.paymentCardViewModel = {
        formatReceiptDate,
        createOrderId,
        createShopOrderViewModel,
        createPayRequestViewModel,
        createTransferCardViewModel,
        createFamilyCardViewModel,
        getRoutingReport
    };
})(OwoApp);
