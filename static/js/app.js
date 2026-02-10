// ========== Application Controller ==========

window.appState = {
    selectedChatIds: [],
    selectedArticleId: null,
    currentDraftMarkdown: null,
    currentDraftTitle: null,
    outputMode: "article",
    length: "standard",
    activeTags: [],
    allChats: [],
    allArticles: [],
};

// ========== Initialization ==========

async function init() {
    // Check API key
    const settings = await API.getSettings();
    if (!settings.error) {
        UI.updateApiKeyStatus(settings.api_key_configured);
        if (!settings.api_key_configured) {
            UI.showSettingsDialog();
        }
    }

    // Load data
    await refreshChatList();
    await refreshArticleList();

    // Wire events
    wireEventListeners();

    // Update button states
    updateButtons();
}

// ========== Data Refresh ==========

async function refreshChatList() {
    appState.allChats = await getAllChats();
    const tags = await getAllChatTags();
    UI.renderTagFilter(tags, appState.activeTags);
    renderFilteredChats();
}

async function refreshArticleList() {
    appState.allArticles = await getAllArticles();
    UI.renderArticleList(appState.allArticles, appState.selectedArticleId);
}

function renderFilteredChats() {
    let chats = appState.allChats;

    // Filter by active tags
    if (appState.activeTags.length > 0) {
        chats = chats.filter(
            (c) => c.tags && appState.activeTags.some((t) => c.tags.includes(t))
        );
    }

    UI.renderChatList(chats, appState.selectedChatIds[0]);
}

function updateButtons() {
    const hasSelection = appState.selectedChatIds.length > 0;
    const hasDraft = !!appState.currentDraftMarkdown;
    const hasArticles = appState.allArticles.length > 0;
    UI.updateButtonStates(hasSelection, hasDraft, hasArticles);
}

// ========== Event Listeners ==========

function wireEventListeners() {
    // Import dialog
    document.getElementById("btn-import").addEventListener("click", () => UI.showImportDialog());
    document.getElementById("import-dialog-close").addEventListener("click", () => UI.hideImportDialog());
    document.getElementById("import-cancel").addEventListener("click", () => UI.hideImportDialog());
    document.getElementById("import-submit").addEventListener("click", handleImport);

    // Import tabs
    document.querySelectorAll("#import-dialog .tab").forEach((tab) => {
        tab.addEventListener("click", () => UI.switchImportTab(tab.dataset.tab));
    });

    // File upload
    const fileUploadArea = document.getElementById("file-upload-area");
    const fileInput = document.getElementById("file-input");

    fileUploadArea.addEventListener("click", () => fileInput.click());
    fileUploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = "var(--color-primary)";
    });
    fileUploadArea.addEventListener("dragleave", () => {
        fileUploadArea.style.borderColor = "";
    });
    fileUploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = "";
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            showFileInfo(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            showFileInfo(fileInput.files[0]);
        }
    });

    // Tag inputs
    setupTagInput("import-tag-input", "import-tag-wrapper");
    setupTagInput("file-tag-input", "file-tag-wrapper");

    // Settings dialog
    document.getElementById("btn-settings").addEventListener("click", () => UI.showSettingsDialog());
    document.getElementById("settings-dialog-close").addEventListener("click", () => UI.hideSettingsDialog());
    document.getElementById("settings-cancel").addEventListener("click", () => UI.hideSettingsDialog());
    document.getElementById("settings-save").addEventListener("click", handleSaveSettings);

    // Consistency dialog
    document.getElementById("consistency-dialog-close").addEventListener("click", () => UI.hideConsistencyDialog());
    document.getElementById("consistency-close").addEventListener("click", () => UI.hideConsistencyDialog());

    // Main controls
    document.getElementById("output-mode").addEventListener("change", (e) => {
        appState.outputMode = e.target.value;
    });
    document.getElementById("length-select").addEventListener("change", (e) => {
        appState.length = e.target.value;
    });

    // Action buttons
    document.getElementById("btn-generate").addEventListener("click", handleGenerate);
    document.getElementById("btn-cleanup").addEventListener("click", handleCleanup);
    document.getElementById("btn-consistency").addEventListener("click", handleConsistencyCheck);
    document.getElementById("btn-copy").addEventListener("click", handleCopy);
    document.getElementById("btn-download").addEventListener("click", handleDownload);
    document.getElementById("btn-save-article").addEventListener("click", handleSaveAsArticle);

    // Search
    document.getElementById("chat-search").addEventListener("input", handleChatSearch);
    document.getElementById("article-search").addEventListener("input", handleArticleSearch);

    // Chat list click delegation
    document.getElementById("chat-list").addEventListener("click", handleChatListClick);

    // Article list click delegation
    document.getElementById("article-list").addEventListener("click", handleArticleListClick);

    // Tag filter click delegation
    document.getElementById("chat-tag-filter").addEventListener("click", handleTagFilterClick);

    // Custom prompt toggle
    document.getElementById("prompt-toggle").addEventListener("click", () => {
        const content = document.getElementById("prompt-content");
        content.classList.toggle("open");
        const toggle = document.getElementById("prompt-toggle");
        toggle.innerHTML = content.classList.contains("open")
            ? "&#9650; カスタムプロンプト設定"
            : "&#9660; カスタムプロンプト設定";
    });

    // DB export/import
    document.getElementById("btn-export-db").addEventListener("click", handleExportDB);
    document.getElementById("btn-import-db").addEventListener("click", () => {
        document.getElementById("db-import-file").click();
    });
    document.getElementById("db-import-file").addEventListener("change", handleImportDB);

    // Draft editing - track changes
    document.getElementById("draft-area").addEventListener("input", () => {
        if (appState.currentDraftMarkdown) {
            // Update the stored markdown when user edits
            appState.currentDraftMarkdown = document.getElementById("draft-area").innerText;
        }
    });
}

// ========== Tag Input Setup ==========

function setupTagInput(inputId, wrapperId) {
    const input = document.getElementById(inputId);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const tag = input.value.trim();
            if (tag) {
                UI.addTagToWrapper(wrapperId, tag);
                input.value = "";
            }
        }
    });
}

// ========== File Info ==========

function showFileInfo(file) {
    const info = document.getElementById("file-info");
    info.textContent = `選択: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    info.style.display = "block";
}

// ========== Handlers ==========

async function handleImport() {
    const pasteTab = document.getElementById("paste-tab");
    const isFileMode = pasteTab.style.display === "none";

    let parsedChats = [];
    let tags = [];

    if (isFileMode) {
        // File upload mode
        const fileInput = document.getElementById("file-input");
        if (!fileInput.files || fileInput.files.length === 0) {
            UI.showToast("ファイルを選択してください。", "error");
            return;
        }

        const file = fileInput.files[0];
        const text = await file.text();
        tags = UI.getTagsFromWrapper("file-tag-wrapper");

        try {
            parsedChats = parseAutoDetect(text, file.name);
        } catch (err) {
            UI.showToast(`パースエラー: ${err.message}`, "error");
            return;
        }
    } else {
        // Paste mode
        const content = document.getElementById("chat-content-input").value.trim();
        if (!content) {
            UI.showToast("チャット内容を入力してください。", "error");
            return;
        }

        const titleInput = document.getElementById("chat-title-input").value.trim();
        tags = UI.getTagsFromWrapper("import-tag-wrapper");

        try {
            parsedChats = parseAutoDetect(content);
        } catch (err) {
            UI.showToast(`パースエラー: ${err.message}`, "error");
            return;
        }

        // Override title if provided
        if (titleInput && parsedChats.length > 0) {
            parsedChats[0].title = titleInput;
        }
    }

    // Save to DB
    let savedCount = 0;
    for (const chat of parsedChats) {
        await addChat({
            title: chat.title || "無題",
            content: chat.content,
            source: chat.source || "manual",
            tags: tags,
        });
        savedCount++;
    }

    UI.hideImportDialog();
    await refreshChatList();
    UI.showToast(`${savedCount}件のチャットを登録しました。`, "success");
}

async function handleSaveSettings() {
    const apiKey = document.getElementById("api-key-input").value.trim();
    if (!apiKey) {
        UI.showToast("APIキーを入力してください。", "error");
        return;
    }

    const btn = document.getElementById("settings-save");
    UI.setLoading(btn, true);

    const result = await API.saveApiKey(apiKey);

    UI.setLoading(btn, false);

    if (result.error) {
        UI.showToast(result.message, "error");
    } else {
        UI.updateApiKeyStatus(true);
        UI.hideSettingsDialog();
        UI.showToast("APIキーを保存しました。", "success");
    }
}

async function handleGenerate() {
    if (appState.selectedChatIds.length === 0) {
        UI.showToast("チャットを選択してください。", "error");
        return;
    }

    const btn = document.getElementById("btn-generate");
    UI.setLoading(btn, true);

    // Collect content from selected chats
    let combinedContent = "";
    let combinedTitle = "";

    for (const chatId of appState.selectedChatIds) {
        const chat = await getChat(chatId);
        if (chat) {
            if (!combinedTitle) combinedTitle = chat.title;
            combinedContent += chat.content + "\n\n";
        }
    }

    if (appState.selectedChatIds.length > 1) {
        combinedTitle = `${combinedTitle} 他${appState.selectedChatIds.length - 1}件`;
    }

    const result = await API.generateArticle({
        chatContent: combinedContent,
        chatTitle: combinedTitle,
        outputMode: appState.outputMode,
        length: appState.length,
    });

    UI.setLoading(btn, false);

    if (result.error) {
        UI.showToast(result.message, "error");
        return;
    }

    appState.currentDraftMarkdown = result.content;
    appState.currentDraftTitle = result.title;
    UI.renderDraft(result.content, true);
    updateButtons();
    UI.showToast("下書きを生成しました。", "success");
}

async function handleCleanup() {
    if (!appState.currentDraftMarkdown) return;

    const btn = document.getElementById("btn-cleanup");
    UI.setLoading(btn, true);

    const customPrompt = document.getElementById("custom-cleanup-prompt").value.trim();

    const result = await API.cleanupText({
        content: appState.currentDraftMarkdown,
        customPrompt: customPrompt || null,
    });

    UI.setLoading(btn, false);

    if (result.error) {
        UI.showToast(result.message, "error");
        return;
    }

    appState.currentDraftMarkdown = result.content;
    UI.renderDraft(result.content, true);
    UI.showToast("推敲が完了しました。", "success");
}

async function handleConsistencyCheck() {
    if (!appState.currentDraftMarkdown) return;

    const btn = document.getElementById("btn-consistency");
    UI.setLoading(btn, true);

    const articles = await getAllArticles();
    const pastArticles = articles.map((a) => ({
        title: a.title,
        content: a.content,
    }));

    const result = await API.checkConsistency({
        newArticle: appState.currentDraftMarkdown,
        pastArticles: pastArticles,
    });

    UI.setLoading(btn, false);

    if (result.error) {
        UI.showToast(result.message, "error");
        return;
    }

    UI.showConsistencyDialog(result);
}

async function handleCopy() {
    if (!appState.currentDraftMarkdown) return;

    const success = await copyToClipboard(appState.currentDraftMarkdown);
    if (success) {
        UI.showToast("クリップボードにコピーしました。", "success");
    }
}

function handleDownload() {
    if (!appState.currentDraftMarkdown) return;

    const title = appState.currentDraftTitle || "article";
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
    downloadFile(`${safeTitle}.md`, appState.currentDraftMarkdown, "text/markdown");
    UI.showToast("ダウンロードしました。", "success");
}

async function handleSaveAsArticle() {
    if (!appState.currentDraftMarkdown) return;

    const title = appState.currentDraftTitle || "無題";

    await addArticle({
        title: title,
        content: appState.currentDraftMarkdown,
        tags: [],
    });

    await refreshArticleList();
    updateButtons();
    UI.showToast("記事として保存しました。", "success");
}

// ========== Search ==========

async function handleChatSearch(e) {
    const query = e.target.value.trim();

    if (!query) {
        renderFilteredChats();
        return;
    }

    const results = await searchChats(query);
    UI.renderChatList(results, appState.selectedChatIds[0]);
}

async function handleArticleSearch(e) {
    const query = e.target.value.trim();

    if (!query) {
        UI.renderArticleList(appState.allArticles, appState.selectedArticleId);
        return;
    }

    const results = await searchArticles(query);
    UI.renderArticleList(results, appState.selectedArticleId);
}

// ========== List Click Handlers ==========

function handleChatListClick(e) {
    // Delete button
    const deleteBtn = e.target.closest(".item-delete");
    if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.dataset.id;
        handleDeleteChat(id);
        return;
    }

    // List item selection
    const li = e.target.closest("li[data-id]");
    if (li) {
        const id = li.dataset.id;

        if (e.ctrlKey || e.metaKey) {
            // Multi-select
            const idx = appState.selectedChatIds.indexOf(id);
            if (idx >= 0) {
                appState.selectedChatIds.splice(idx, 1);
            } else {
                appState.selectedChatIds.push(id);
            }
        } else {
            // Single select
            appState.selectedChatIds = [id];
        }

        renderFilteredChats();
        highlightSelectedChats();
        updateSelectionInfo();
        updateButtons();
    }
}

function handleArticleListClick(e) {
    // Delete button
    const deleteBtn = e.target.closest(".item-delete");
    if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.dataset.id;
        handleDeleteArticle(id);
        return;
    }

    // List item - view article
    const li = e.target.closest("li[data-id]");
    if (li) {
        const id = li.dataset.id;
        appState.selectedArticleId = id;
        viewArticle(id);
        UI.renderArticleList(appState.allArticles, id);
    }
}

async function viewArticle(id) {
    const article = await getArticle(id);
    if (article) {
        appState.currentDraftMarkdown = article.content;
        appState.currentDraftTitle = article.title;
        UI.renderDraft(article.content, false);
        updateButtons();
    }
}

function highlightSelectedChats() {
    const items = document.querySelectorAll("#chat-list li[data-id]");
    items.forEach((li) => {
        li.classList.toggle("selected", appState.selectedChatIds.includes(li.dataset.id));
    });
}

function updateSelectionInfo() {
    const count = appState.selectedChatIds.length;
    if (count > 0) {
        UI.showSelectionInfo(`${count}件のチャットを選択中`);
    } else {
        UI.hideSelectionInfo();
    }
}

// ========== Delete Handlers ==========

async function handleDeleteChat(id) {
    if (!confirm("このチャットを削除しますか？")) return;

    await deleteChat(id);
    appState.selectedChatIds = appState.selectedChatIds.filter((cid) => cid !== id);
    await refreshChatList();
    updateSelectionInfo();
    updateButtons();
    UI.showToast("チャットを削除しました。", "success");
}

async function handleDeleteArticle(id) {
    if (!confirm("この記事を削除しますか？")) return;

    await deleteArticle(id);
    if (appState.selectedArticleId === id) {
        appState.selectedArticleId = null;
    }
    await refreshArticleList();
    updateButtons();
    UI.showToast("記事を削除しました。", "success");
}

// ========== Tag Filter ==========

function handleTagFilterClick(e) {
    const pill = e.target.closest(".tag-pill");
    if (!pill) return;

    const tag = pill.dataset.tag;
    const idx = appState.activeTags.indexOf(tag);
    if (idx >= 0) {
        appState.activeTags.splice(idx, 1);
    } else {
        appState.activeTags.push(tag);
    }

    renderFilteredChats();

    // Re-render tag filter to update active states
    getAllChatTags().then((tags) => {
        UI.renderTagFilter(tags, appState.activeTags);
    });
}

// ========== DB Export/Import ==========

async function handleExportDB() {
    try {
        const data = await exportDatabase();
        downloadFile("chat-to-note-backup.json", data, "application/json");
        UI.showToast("データをエクスポートしました。", "success");
    } catch (err) {
        UI.showToast(`エクスポートエラー: ${err.message}`, "error");
    }
}

async function handleImportDB(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        await importDatabase(text);
        await refreshChatList();
        await refreshArticleList();
        updateButtons();
        UI.showToast("データをインポートしました。", "success");
    } catch (err) {
        UI.showToast(`インポートエラー: ${err.message}`, "error");
    }

    // Reset file input
    e.target.value = "";
}

// ========== Start ==========

document.addEventListener("DOMContentLoaded", init);
