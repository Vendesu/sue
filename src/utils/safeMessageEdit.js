class SafeMessageEditor {
    constructor() {
        this.lastSentMessages = new Map(); // chatId_messageId -> {text, markup}
    }

    shouldUpdate(chatId, messageId, newText, newMarkup) {
        const key = `${chatId}_${messageId}`;
        const lastSent = this.lastSentMessages.get(key);
        
        if (!lastSent) {
            return true; // First time, always update
        }

        // Compare text
        if (lastSent.text !== newText) {
            return true;
        }

        // Compare markup using JSON comparison
        try {
            const lastMarkupStr = JSON.stringify(lastSent.markup, null, 0);
            const newMarkupStr = JSON.stringify(newMarkup, null, 0);
            if (lastMarkupStr !== newMarkupStr) {
                return true;
            }
        } catch (error) {
            // If JSON comparison fails, assume different
            return true;
        }

        return false; // No changes detected
    }

    async editMessage(bot, chatId, messageId, newText, options = {}) {
        const newMarkup = options.reply_markup || null;
        
        if (!this.shouldUpdate(chatId, messageId, newText, newMarkup)) {
            // No changes, skip edit to avoid Telegram error
            return { success: true, skipped: true };
        }

        try {
            await bot.editMessageText(newText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                ...options
            });

            // Store the successfully sent content
            const key = `${chatId}_${messageId}`;
            this.lastSentMessages.set(key, {
                text: newText,
                markup: newMarkup
            });

            return { success: true, skipped: false };
        } catch (error) {
            console.error('Error editing message:', error.message);
            return { success: false, error: error.message };
        }
    }

    clearMessageCache(chatId, messageId) {
        const key = `${chatId}_${messageId}`;
        this.lastSentMessages.delete(key);
    }

    clearAllCache() {
        this.lastSentMessages.clear();
    }
}

// Create singleton instance
const safeMessageEditor = new SafeMessageEditor();

module.exports = safeMessageEditor;
