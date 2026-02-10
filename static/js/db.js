// ========== IndexedDB (Dexie.js) ==========

const db = new Dexie("ChatToNoteDB");

db.version(1).stores({
    chats: "id, title, source, *tags, createdAt, updatedAt",
    articles: "id, title, *tags, publishedAt, createdAt",
});

// ========== Chat CRUD ==========

async function addChat({ title, content, source, tags = [] }) {
    const now = new Date().toISOString();
    const id = generateUUID();
    await db.chats.add({
        id,
        title,
        content,
        source,
        tags,
        createdAt: now,
        updatedAt: now,
    });
    return id;
}

async function getAllChats() {
    return db.chats.orderBy("createdAt").reverse().toArray();
}

async function getChat(id) {
    return db.chats.get(id);
}

async function updateChat(id, changes) {
    changes.updatedAt = new Date().toISOString();
    return db.chats.update(id, changes);
}

async function deleteChat(id) {
    return db.chats.delete(id);
}

async function searchChats(query) {
    const lower = query.toLowerCase();
    return db.chats
        .filter(
            (chat) =>
                chat.title.toLowerCase().includes(lower) ||
                chat.content.toLowerCase().includes(lower)
        )
        .toArray();
}

async function getChatsByTag(tag) {
    return db.chats.where("tags").equals(tag).toArray();
}

async function getAllChatTags() {
    const chats = await db.chats.toArray();
    const tagSet = new Set();
    for (const chat of chats) {
        if (chat.tags) {
            for (const tag of chat.tags) {
                tagSet.add(tag);
            }
        }
    }
    return [...tagSet].sort();
}

// ========== Article CRUD ==========

async function addArticle({ title, content, tags = [], publishedAt = null }) {
    const now = new Date().toISOString();
    const id = generateUUID();
    await db.articles.add({
        id,
        title,
        content,
        tags,
        publishedAt,
        createdAt: now,
    });
    return id;
}

async function getAllArticles() {
    return db.articles.orderBy("createdAt").reverse().toArray();
}

async function getArticle(id) {
    return db.articles.get(id);
}

async function deleteArticle(id) {
    return db.articles.delete(id);
}

async function searchArticles(query) {
    const lower = query.toLowerCase();
    return db.articles
        .filter(
            (a) =>
                a.title.toLowerCase().includes(lower) ||
                a.content.toLowerCase().includes(lower)
        )
        .toArray();
}

// ========== Export / Import ==========

async function exportDatabase() {
    const chats = await db.chats.toArray();
    const articles = await db.articles.toArray();
    return JSON.stringify(
        { chats, articles, exportedAt: new Date().toISOString() },
        null,
        2
    );
}

async function importDatabase(jsonString) {
    const data = JSON.parse(jsonString);
    await db.transaction("rw", db.chats, db.articles, async () => {
        if (data.chats) {
            for (const chat of data.chats) {
                await db.chats.put(chat);
            }
        }
        if (data.articles) {
            for (const article of data.articles) {
                await db.articles.put(article);
            }
        }
    });
}
