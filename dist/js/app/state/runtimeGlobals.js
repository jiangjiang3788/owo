// --- Runtime globals (V10 compatibility owner) ---
// 这些变量仍以 legacy global lexical/var 形式存在，供旧脚本继续读写；不在这里写存储逻辑。
var db = window.OwoApp.app.state.initialState.createInitialDbState();

var currentChatId = null;
var currentChatType = null;
var isGenerating = false;
var currentReplyAbortController = null; // 用于「暂停调用」中止当前 AI 请求（单聊/群聊共用）
var longPressTimer = null;
var isInMultiSelectMode = false;
var editingMessageId = null;
var currentPage = 1;
var currentTransferMessageId = null;
var currentEditingWorldBookId = null;
var currentStickerActionTarget = null;
var currentJournalDetailId = null;
var currentQuoteInfo = null;
var isDebugMode = false;
var currentFolderId = 'all';
var currentFolderActionTarget = null;
var currentGroupAction = {type: null, recipients: []};
var isRawEditMode = false;
var currentPomodoroTask = null;
var pomodoroInterval = null;
var pomodoroRemainingSeconds = 0;
var pomodoroCurrentSessionSeconds = 0;
var isPomodoroPaused = true;
var pomodoroPokeCount = 0;
var pomodoroIsInterrupted = false;
var currentPomodoroSettingsContext = null;
var pomodoroSessionHistory = [];
var isStickerManageMode = false;
var selectedStickerIds = new Set();
var isWorldBookMultiSelectMode = false;
var selectedWorldBookIds = new Set();
var generatingPeekApps = new Set();
var selectedMessageIds = new Set();
var currentStickerCategory = 'recent';
const MESSAGES_PER_PAGE = 50;


// Dexie 数据库初始化
var dexieDB; // 声明全局变量，但不初始化

window.OwoApp.app.state.runtimeGlobals = Object.assign(window.OwoApp.app.state.runtimeGlobals || {}, {
    getDb: () => db,
    getDexieDB: () => dexieDB,
    assignDexieDB: (nextDexieDB) => { dexieDB = nextDexieDB; return dexieDB; }
});
