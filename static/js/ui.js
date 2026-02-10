// ========== UI Rendering ==========

const UI = {
    // ========== Chat List ==========
    renderChatList(chats, selectedId = null) {
        const list = document.getElementById("chat-list");

        if (!chats || chats.length === 0) {
            list.innerHTML = '<li class="empty-state">チャットがありません。「新規登録」から追加してください。</li>';
            return;
        }

        list.innerHTML = chats
            .map(
                (chat) => `
            <li data-id="${chat.id}" class="${chat.id === selectedId ? "selected" : ""}">
                <div style="display:flex;justify-content:space-between;align-items:start">
                    <span class="item-title">${escapeHtml(chat.title)}</span>
                    <button class="item-delete" data-id="${chat.id}" title="削除">&times;</button>
                </div>
                <div class="item-meta">
                    <span>${formatDate(chat.createdAt)}</span>
                    <span>${escapeHtml(chat.source || "")}</span>
                </div>
                ${
                    chat.tags && chat.tags.length > 0
                        ? `<div class="item-tags">${chat.tags.map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</div>`
                        : ""
                }
            </li>
        `
            )
            .join("");
    },

    // ========== Article List ==========
    renderArticleList(articles, selectedId = null) {
        const list = document.getElementById("article-list");

        if (!articles || articles.length === 0) {
            list.innerHTML = '<li class="empty-state">保存された記事はありません。</li>';
            return;
        }

        list.innerHTML = articles
            .map(
                (article) => `
            <li data-id="${article.id}" class="${article.id === selectedId ? "selected" : ""}">
                <div style="display:flex;justify-content:space-between;align-items:start">
                    <span class="item-title">${escapeHtml(article.title)}</span>
                    <button class="item-delete" data-id="${article.id}" title="削除">&times;</button>
                </div>
                <div class="item-meta">
                    <span>${formatDate(article.createdAt)}</span>
                </div>
                ${
                    article.tags && article.tags.length > 0
                        ? `<div class="item-tags">${article.tags.map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</div>`
                        : ""
                }
            </li>
        `
            )
            .join("");
    },

    // ========== Tag Filter ==========
    renderTagFilter(tags, activeTags = []) {
        const container = document.getElementById("chat-tag-filter");
        if (!tags || tags.length === 0) {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = tags
            .map(
                (tag) =>
                    `<button class="tag-pill ${activeTags.includes(tag) ? "active" : ""}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
            )
            .join("");
    },

    // ========== Draft Area ==========
    renderDraft(content, isEditable = true) {
        const area = document.getElementById("draft-area");
        if (!content) {
            area.innerHTML = '<p class="placeholder">チャットを選択して「下書き生成」をクリックしてください。</p>';
            area.contentEditable = "false";
            return;
        }

        area.innerHTML = marked.parse(content);
        area.contentEditable = isEditable ? "true" : "false";
    },

    getDraftText() {
        const area = document.getElementById("draft-area");
        // If editable, get the text content
        return area.innerText || "";
    },

    getDraftMarkdown() {
        // Return the raw markdown stored in state
        return window.appState?.currentDraftMarkdown || "";
    },

    // ========== Selection Info ==========
    showSelectionInfo(text) {
        const info = document.getElementById("selection-info");
        document.getElementById("selection-text").textContent = text;
        info.classList.add("visible");
    },

    hideSelectionInfo() {
        document.getElementById("selection-info").classList.remove("visible");
    },

    // ========== Dialogs ==========
    showImportDialog() {
        document.getElementById("import-dialog").showModal();
        // Reset form
        document.getElementById("chat-title-input").value = "";
        document.getElementById("chat-content-input").value = "";
        document.getElementById("file-input").value = "";
        document.getElementById("file-info").style.display = "none";
        this._clearTagInput("import-tag-wrapper");
        this._clearTagInput("file-tag-wrapper");
    },

    hideImportDialog() {
        document.getElementById("import-dialog").close();
    },

    showSettingsDialog() {
        document.getElementById("settings-dialog").showModal();
        document.getElementById("api-key-input").value = "";
    },

    hideSettingsDialog() {
        document.getElementById("settings-dialog").close();
    },

    showConsistencyDialog(result) {
        const dialog = document.getElementById("consistency-dialog");
        const resultsContainer = document.getElementById("consistency-results");
        const summaryContainer = document.getElementById("consistency-summary");

        if (!result.issues || result.issues.length === 0) {
            resultsContainer.innerHTML = `
                <div class="consistency-ok">&#10004; すべてのチェック項目で問題はありませんでした。</div>
            `;
        } else {
            const typeLabels = {
                contradiction: "主張の矛盾",
                terminology: "用語の不統一",
                tone: "トーン・文体",
                duplication: "重複",
            };

            resultsContainer.innerHTML = result.issues
                .map(
                    (issue) => `
                <div class="consistency-item severity-${issue.severity || "medium"}">
                    <div class="consistency-type">${typeLabels[issue.type] || issue.type}</div>
                    <div class="consistency-description">${escapeHtml(issue.description)}</div>
                    ${issue.suggestion ? `<div class="consistency-suggestion">&#128161; ${escapeHtml(issue.suggestion)}</div>` : ""}
                </div>
            `
                )
                .join("");
        }

        summaryContainer.textContent = result.summary || "";
        dialog.showModal();
    },

    hideConsistencyDialog() {
        document.getElementById("consistency-dialog").close();
    },

    // ========== Toast ==========
    showToast(message, type = "success") {
        const container = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transition = "opacity 0.3s";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ========== Loading ==========
    setLoading(element, isLoading) {
        if (isLoading) {
            element.classList.add("loading");
            element.disabled = true;
        } else {
            element.classList.remove("loading");
            element.disabled = false;
        }
    },

    // ========== Button State ==========
    updateButtonStates(hasSelection, hasDraft, hasArticles) {
        document.getElementById("btn-generate").disabled = !hasSelection;
        document.getElementById("btn-cleanup").disabled = !hasDraft;
        document.getElementById("btn-consistency").disabled = !hasDraft || !hasArticles;
        document.getElementById("btn-copy").disabled = !hasDraft;
        document.getElementById("btn-download").disabled = !hasDraft;
        document.getElementById("btn-save-article").disabled = !hasDraft;
    },

    // ========== API Key Status ==========
    updateApiKeyStatus(configured) {
        const el = document.getElementById("api-key-status");
        if (configured) {
            el.innerHTML = '<span style="color:var(--color-success)">&#10004; APIキーは設定済みです</span>';
        } else {
            el.innerHTML = '<span style="color:var(--color-warning)">&#9888; APIキーが未設定です</span>';
        }
    },

    // ========== Tab switching ==========
    switchImportTab(tabId) {
        const tabs = document.querySelectorAll("#import-dialog .tab");
        tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabId));

        document.getElementById("paste-tab").style.display = tabId === "paste-tab" ? "block" : "none";
        document.getElementById("file-tab").style.display = tabId === "file-tab" ? "block" : "none";
    },

    // ========== Tag Input Helper ==========
    _clearTagInput(wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        const pills = wrapper.querySelectorAll(".tag-pill");
        pills.forEach((p) => p.remove());
    },

    getTagsFromWrapper(wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        const pills = wrapper.querySelectorAll(".tag-pill");
        return Array.from(pills).map((p) => p.dataset.tag);
    },

    addTagToWrapper(wrapperId, tag) {
        const wrapper = document.getElementById(wrapperId);
        const input = wrapper.querySelector("input");

        // Check for duplicate
        const existing = this.getTagsFromWrapper(wrapperId);
        if (existing.includes(tag)) return;

        const pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.dataset.tag = tag;
        pill.innerHTML = `${escapeHtml(tag)} <span class="tag-remove">&times;</span>`;

        pill.querySelector(".tag-remove").addEventListener("click", (e) => {
            e.stopPropagation();
            pill.remove();
        });

        wrapper.insertBefore(pill, input);
    },
};
