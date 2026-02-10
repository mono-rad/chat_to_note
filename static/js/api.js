// ========== Backend API Client ==========

const API = {
    async _fetch(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: { "Content-Type": "application/json" },
                ...options,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                return {
                    error: true,
                    message: data.detail || `エラーが発生しました (${res.status})`,
                };
            }

            return await res.json();
        } catch (err) {
            return {
                error: true,
                message: `通信エラー: ${err.message}`,
            };
        }
    },

    // Health check
    async health() {
        return this._fetch("/api/health");
    },

    // Settings
    async getSettings() {
        return this._fetch("/api/settings");
    },

    async saveApiKey(apiKey) {
        return this._fetch("/api/settings/apikey", {
            method: "POST",
            body: JSON.stringify({ api_key: apiKey }),
        });
    },

    // Generate
    async generateArticle({ chatContent, chatTitle, outputMode, length, customPrompt }) {
        return this._fetch("/api/generate/article", {
            method: "POST",
            body: JSON.stringify({
                chat_content: chatContent,
                chat_title: chatTitle,
                output_mode: outputMode,
                length: length,
                custom_prompt: customPrompt || null,
            }),
        });
    },

    async cleanupText({ content, customPrompt }) {
        return this._fetch("/api/generate/cleanup", {
            method: "POST",
            body: JSON.stringify({
                content: content,
                custom_prompt: customPrompt || null,
            }),
        });
    },

    // Consistency check
    async checkConsistency({ newArticle, pastArticles }) {
        return this._fetch("/api/consistency/check", {
            method: "POST",
            body: JSON.stringify({
                new_article: newArticle,
                past_articles: pastArticles,
            }),
        });
    },
};
