// ========== Chat Format Parsers ==========

/**
 * Auto-detect format and parse input.
 * Returns array of { title, content, source } objects.
 */
function parseAutoDetect(input, filename = "") {
    if (typeof input === "string") {
        const trimmed = input.trim();

        // Try JSON
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
                const json = JSON.parse(trimmed);
                return parseJsonInput(json);
            } catch {
                // Not valid JSON, continue
            }
        }

        // Check file extension
        if (filename.endsWith(".json")) {
            try {
                const json = JSON.parse(trimmed);
                return parseJsonInput(json);
            } catch {
                // Fall through
            }
        }

        if (filename.endsWith(".md")) {
            return [parseMarkdown(trimmed)];
        }

        // Plain text
        return [parsePlainText(trimmed)];
    }

    return [parsePlainText(String(input))];
}

/**
 * Route JSON to appropriate parser.
 */
function parseJsonInput(json) {
    // ChatGPT conversations.json: array of conversation objects
    if (Array.isArray(json)) {
        const results = [];
        for (const item of json) {
            if (item.mapping) {
                results.push(parseChatGPTConversation(item));
            } else if (item.chat_messages || item.messages) {
                results.push(parseClaudeConversation(item));
            } else {
                // Generic JSON array item
                results.push({
                    title: item.title || item.name || "無題",
                    content: JSON.stringify(item, null, 2),
                    source: "manual",
                });
            }
        }
        return results.length > 0 ? results : [{ title: "無題", content: JSON.stringify(json, null, 2), source: "manual" }];
    }

    // Single ChatGPT conversation
    if (json.mapping) {
        return [parseChatGPTConversation(json)];
    }

    // Claude export format
    if (json.chat_messages) {
        return [parseClaudeConversation(json)];
    }

    // Generic object with messages array
    if (json.messages && Array.isArray(json.messages)) {
        return [parseGenericMessages(json)];
    }

    // Fallback: stringify
    return [{
        title: json.title || "無題",
        content: JSON.stringify(json, null, 2),
        source: "manual",
    }];
}

/**
 * Parse ChatGPT conversation object (mapping structure).
 */
function parseChatGPTConversation(conv) {
    const title = conv.title || "ChatGPT会話";
    const messages = [];

    if (!conv.mapping) {
        return { title, content: JSON.stringify(conv, null, 2), source: "chatgpt" };
    }

    // Find root node and traverse
    const nodes = conv.mapping;
    const nodeIds = Object.keys(nodes);

    // Find the root: node with no parent or null parent
    let rootId = null;
    for (const id of nodeIds) {
        const node = nodes[id];
        if (!node.parent || node.parent === null) {
            rootId = id;
            break;
        }
    }

    if (!rootId) {
        // Fallback: try the first node
        rootId = nodeIds[0];
    }

    // BFS/DFS to collect messages in order
    const visited = new Set();
    const queue = [rootId];

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = nodes[currentId];
        if (!node) continue;

        // Extract message if present
        if (node.message && node.message.content) {
            const role = node.message.author?.role;
            const parts = node.message.content.parts;

            if (role && parts && (role === "user" || role === "assistant")) {
                const text = parts
                    .filter((p) => typeof p === "string")
                    .join("\n");
                if (text.trim()) {
                    const label = role === "user" ? "User" : "Assistant";
                    messages.push(`**${label}:**\n${text}`);
                }
            }
        }

        // Add children to queue
        if (node.children && Array.isArray(node.children)) {
            for (const childId of node.children) {
                queue.push(childId);
            }
        }
    }

    const content = messages.join("\n\n---\n\n");
    return { title, content: content || "（メッセージなし）", source: "chatgpt" };
}

/**
 * Parse Claude export format.
 */
function parseClaudeConversation(conv) {
    const title = conv.name || conv.title || "Claude会話";
    const msgs = conv.chat_messages || conv.messages || [];
    const messages = [];

    for (const msg of msgs) {
        const role = msg.sender || msg.role;
        const text = extractClaudeText(msg);

        if (text && text.trim()) {
            let label;
            if (role === "human" || role === "user") {
                label = "User";
            } else if (role === "assistant") {
                label = "Assistant";
            } else {
                continue;
            }
            messages.push(`**${label}:**\n${text}`);
        }
    }

    const content = messages.join("\n\n---\n\n");
    return { title, content: content || "（メッセージなし）", source: "claude" };
}

/**
 * Extract text from Claude message object.
 */
function extractClaudeText(msg) {
    // Direct text field
    if (typeof msg.text === "string") return msg.text;

    // Content array (newer format)
    if (Array.isArray(msg.content)) {
        return msg.content
            .filter((c) => c.type === "text" && typeof c.text === "string")
            .map((c) => c.text)
            .join("\n");
    }

    // Content as string
    if (typeof msg.content === "string") return msg.content;

    return "";
}

/**
 * Parse generic messages array format.
 */
function parseGenericMessages(json) {
    const title = json.title || "会話";
    const messages = [];

    for (const msg of json.messages) {
        const role = msg.role || msg.sender;
        const text = msg.content || msg.text || "";

        if (typeof text === "string" && text.trim()) {
            const label = role === "user" || role === "human" ? "User" : "Assistant";
            messages.push(`**${label}:**\n${text}`);
        }
    }

    const content = messages.join("\n\n---\n\n");
    return { title, content: content || "（メッセージなし）", source: "manual" };
}

/**
 * Parse Markdown chat log.
 */
function parseMarkdown(text) {
    return {
        title: extractTitleFromContent(text),
        content: text,
        source: "manual",
    };
}

/**
 * Parse plain text.
 */
function parsePlainText(text) {
    return {
        title: extractTitleFromContent(text),
        content: text,
        source: "manual",
    };
}
