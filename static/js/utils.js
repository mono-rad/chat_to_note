// ========== Utility Functions ==========

function generateUUID() {
    return crypto.randomUUID();
}

function formatDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function formatDateTime(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function downloadFile(filename, content, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return true;
    }
}

function truncateText(text, maxLen = 50) {
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + "...";
}

function extractTitleFromContent(content) {
    if (!content) return "無題";
    const lines = content.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
            return truncateText(trimmed, 40);
        }
        if (trimmed.startsWith("# ")) {
            return trimmed.substring(2).trim();
        }
    }
    return "無題";
}
