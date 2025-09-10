const db = require('../config/database');
const { isAdmin } = require('../utils/userManager');
const safeMessageEditor = require('../utils/safeMessageEdit');

class UserManagementHandler {
    static async handleUserManagement(bot, chatId, messageId) {
        if (!isAdmin(chatId)) {
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Akses ditolak. Fitur khusus admin.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'back_to_menu' }
                        ]]
                    }
                }
            );
            return;
        }

        await safeMessageEditor.editMessage(bot, chatId, messageId,
            '👥 **Manajemen User**\n\n' +
            'Pilih aksi yang ingin dilakukan:',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👤 Lihat Semua User', callback_data: 'view_all_users' },
                            { text: '🔍 Cari User', callback_data: 'search_user' }
                        ],
                        [
                            { text: '💰 Kelola Saldo', callback_data: 'manage_balance' },
                            { text: '🔒 Kelola Status', callback_data: 'manage_status' }
                        ],
                        [
                            { text: '📊 Statistik User', callback_data: 'user_statistics' }
                        ],
                        [
                            { text: '« Kembali', callback_data: 'back_to_menu' }
                        ]
                    ]
                }
            }
        );
    }

    static async handleViewAllUsers(bot, chatId, messageId, page = 0) {
        const limit = 10;
        const offset = page * limit;

        try {
            const users = await db.all(
                `SELECT telegram_id, balance, created_at, 
                        CASE WHEN telegram_id = ? THEN 1 ELSE 0 END as is_locked
                 FROM users 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
                [process.env.LOCKED_USER_ID || -1, limit, offset]
            );

            const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
            const totalPages = Math.ceil(totalUsers.count / limit);

            let messageText = `👥 **Daftar User** (Halaman ${page + 1}/${totalPages})\n\n`;
            
            if (users.length === 0) {
                messageText += 'Tidak ada user ditemukan.';
            } else {
                users.forEach((user, index) => {
                    const userNumber = offset + index + 1;
                    const joinDate = new Date(user.created_at).toLocaleDateString('id-ID');
                    const status = user.is_locked ? '🔒' : '✅';
                    
                    messageText += `${userNumber}. ${status} ID: \`${user.telegram_id}\`\n`;
                    messageText += `   💰 Saldo: Rp ${user.balance.toLocaleString()}\n`;
                    messageText += `   📅 Bergabung: ${joinDate}\n\n`;
                });
            }

            const keyboard = [];
            
            // Navigation buttons
            const navRow = [];
            if (page > 0) {
                navRow.push({ text: '⬅️ Sebelumnya', callback_data: `users_page_${page - 1}` });
            }
            if (page < totalPages - 1) {
                navRow.push({ text: 'Selanjutnya ➡️', callback_data: `users_page_${page + 1}` });
            }
            if (navRow.length > 0) {
                keyboard.push(navRow);
            }

            keyboard.push([
                { text: '🔄 Refresh', callback_data: `users_page_${page}` },
                { text: '« Kembali', callback_data: 'user_management' }
            ]);

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: { inline_keyboard: keyboard }
            });

        } catch (error) {
            console.error('Error viewing users:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Terjadi kesalahan saat mengambil data user.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'user_management' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleUserStatistics(bot, chatId, messageId) {
        try {
            const stats = await db.all(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(balance) as total_balance,
                    AVG(balance) as avg_balance,
                    COUNT(CASE WHEN balance > 0 THEN 1 END) as users_with_balance,
                    COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_users_week,
                    COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as new_users_month
                FROM users
            `);

            const transactions = await db.get(`
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_deposits,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_spending
                FROM transactions
            `);

            const rdpStats = await db.get(`
                SELECT 
                    COUNT(*) as total_installations,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_installations,
                    COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as installations_week
                FROM rdp_installations
            `);

            const stat = stats[0];
            const messageText = `📊 **Statistik User & Bot**\n\n` +
                `👥 **User Statistics:**\n` +
                `• Total User: ${stat.total_users.toLocaleString()}\n` +
                `• User dengan Saldo: ${stat.users_with_balance.toLocaleString()}\n` +
                `• User Baru (7 hari): ${stat.new_users_week.toLocaleString()}\n` +
                `• User Baru (30 hari): ${stat.new_users_month.toLocaleString()}\n\n` +
                
                `💰 **Saldo Statistics:**\n` +
                `• Total Saldo: Rp ${stat.total_balance.toLocaleString()}\n` +
                `• Rata-rata Saldo: Rp ${Math.round(stat.avg_balance).toLocaleString()}\n\n` +
                
                `💳 **Transaksi Statistics:**\n` +
                `• Total Transaksi: ${transactions.total_transactions.toLocaleString()}\n` +
                `• Total Deposit: Rp ${transactions.total_deposits.toLocaleString()}\n` +
                `• Total Pengeluaran: Rp ${transactions.total_spending.toLocaleString()}\n\n` +
                
                `🖥️ **RDP Statistics:**\n` +
                `• Total Instalasi: ${rdpStats.total_installations.toLocaleString()}\n` +
                `• Instalasi Berhasil: ${rdpStats.completed_installations.toLocaleString()}\n` +
                `• Instalasi Minggu Ini: ${rdpStats.installations_week.toLocaleString()}`;

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Refresh', callback_data: 'user_statistics' }],
                        [{ text: '« Kembali', callback_data: 'user_management' }]
                    ]
                }
            });

        } catch (error) {
            console.error('Error getting user statistics:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Terjadi kesalahan saat mengambil statistik.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'user_management' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleSearchUser(bot, chatId, messageId) {
        await safeMessageEditor.editMessage(bot, chatId, messageId,
            '🔍 **Cari User**\n\n' +
            'Masukkan User ID yang ingin dicari:\n\n' +
            'Format: `123456789`',
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« Kembali', callback_data: 'user_management' }
                    ]]
                }
            }
        );
    }

    static async processSearchUser(bot, msg, sessionManager) {
        const chatId = msg.chat.id;
        const userId = msg.text.trim();

        try {
            await bot.deleteMessage(chatId, msg.message_id);
        } catch (error) {
            console.log('Failed to delete search message:', error.message);
        }

        if (!/^\d+$/.test(userId)) {
            await bot.sendMessage(chatId, '❌ Format User ID tidak valid. Harus berupa angka.');
            return;
        }

        try {
            const user = await db.get('SELECT * FROM users WHERE telegram_id = ?', [userId]);
            
            if (!user) {
                await bot.sendMessage(chatId, 
                    `❌ User dengan ID \`${userId}\` tidak ditemukan.`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            const transactions = await db.all(
                'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
                [userId]
            );

            const rdpInstallations = await db.all(
                'SELECT * FROM rdp_installations WHERE user_id = ? ORDER BY created_at DESC LIMIT 3',
                [userId]
            );

            const joinDate = new Date(user.created_at).toLocaleDateString('id-ID');
            let messageText = `👤 **Detail User**\n\n` +
                `🆔 User ID: \`${user.telegram_id}\`\n` +
                `💰 Saldo: Rp ${user.balance.toLocaleString()}\n` +
                `📅 Bergabung: ${joinDate}\n\n`;

            if (transactions.length > 0) {
                messageText += `💳 **Transaksi Terakhir:**\n`;
                transactions.forEach((tx, index) => {
                    const date = new Date(tx.created_at).toLocaleDateString('id-ID');
                    const amount = tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString();
                    const type = tx.type === 'deposit' ? '📈' : '📉';
                    messageText += `${index + 1}. ${type} Rp ${amount} (${date})\n`;
                });
                messageText += '\n';
            }

            if (rdpInstallations.length > 0) {
                messageText += `🖥️ **RDP Terakhir:**\n`;
                rdpInstallations.forEach((rdp, index) => {
                    const date = new Date(rdp.created_at).toLocaleDateString('id-ID');
                    const status = rdp.status === 'completed' ? '✅' : '⏳';
                    messageText += `${index + 1}. ${status} ${rdp.ip_address} (${date})\n`;
                });
            }

            await bot.sendMessage(chatId, messageText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 Kelola Saldo', callback_data: `manage_user_balance_${userId}` },
                            { text: '🔒 Kelola Status', callback_data: `manage_user_status_${userId}` }
                        ],
                        [
                            { text: '🗑️ Hapus User', callback_data: `delete_user_${userId}` }
                        ],
                        [
                            { text: '« Kembali', callback_data: 'user_management' }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error('Error searching user:', error);
            await bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mencari user.');
        }
    }

    static async handleManageUserBalance(bot, query, sessionManager) {
        const userId = query.data.split('_')[3];
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        await safeMessageEditor.editMessage(bot, chatId, messageId,
            `💰 **Kelola Saldo User**\n\n` +
            `User ID: \`${userId}\`\n\n` +
            `Masukkan jumlah saldo yang ingin ditambah/kurangi:\n` +
            `Format: +50000 (tambah) atau -25000 (kurangi)`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« Kembali', callback_data: `search_user` }
                    ]]
                }
            }
        );

        sessionManager.setAdminSession(chatId, { 
            action: 'manage_user_balance', 
            targetUserId: userId 
        });
    }

    static async processManageUserBalance(bot, msg, sessionManager) {
        const chatId = msg.chat.id;
        const session = sessionManager.getAdminSession(chatId);

        if (!session || session.action !== 'manage_user_balance') {
            await bot.sendMessage(chatId, '❌ Sesi tidak valid.');
            return;
        }

        try {
            await bot.deleteMessage(chatId, msg.message_id);
        } catch (error) {
            console.log('Failed to delete balance message:', error.message);
        }

        const amount = parseInt(msg.text.replace(/[^-0-9]/g, ''));
        const userId = session.targetUserId;

        if (isNaN(amount) || amount === 0) {
            await bot.sendMessage(chatId, '❌ Jumlah tidak valid. Gunakan format: +50000 atau -25000');
            return;
        }

        try {
            const user = await db.get('SELECT * FROM users WHERE telegram_id = ?', [userId]);
            if (!user) {
                await bot.sendMessage(chatId, '❌ User tidak ditemukan.');
                return;
            }

            const newBalance = user.balance + amount;
            if (newBalance < 0) {
                await bot.sendMessage(chatId, '❌ Saldo tidak boleh negatif.');
                return;
            }

            await db.run('UPDATE users SET balance = ? WHERE telegram_id = ?', [newBalance, userId]);
            await db.run(
                'INSERT INTO transactions (user_id, amount, type) VALUES (?, ?, ?)',
                [userId, amount, amount > 0 ? 'admin_add' : 'admin_deduct']
            );

            const action = amount > 0 ? 'ditambahkan' : 'dikurangi';
            await bot.sendMessage(chatId,
                `✅ **Saldo berhasil ${action}**\n\n` +
                `👤 User ID: \`${userId}\`\n` +
                `💰 Jumlah: Rp ${Math.abs(amount).toLocaleString()}\n` +
                `💳 Saldo Baru: Rp ${newBalance.toLocaleString()}`,
                { parse_mode: 'Markdown' }
            );

            sessionManager.clearAdminSession(chatId);

        } catch (error) {
            console.error('Error managing user balance:', error);
            await bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengelola saldo.');
        }
    }

    static async handleDeleteUser(bot, query) {
        const userId = query.data.split('_')[2];
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        await safeMessageEditor.editMessage(bot, chatId, messageId,
            `🗑️ **Konfirmasi Hapus User**\n\n` +
            `⚠️ **PERINGATAN:** Tindakan ini tidak dapat dibatalkan!\n\n` +
            `User ID: \`${userId}\`\n\n` +
            `Yakin ingin menghapus user ini beserta semua data terkait?`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Ya, Hapus', callback_data: `confirm_delete_user_${userId}` },
                            { text: '❌ Batal', callback_data: 'user_management' }
                        ]
                    ]
                }
            }
        );
    }

    static async confirmDeleteUser(bot, query) {
        const userId = query.data.split('_')[3];
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        try {
            // Delete user and related data
            await db.run('DELETE FROM transactions WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM pending_payments WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM rdp_installations WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM vps_orders WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM users WHERE telegram_id = ?', [userId]);

            await safeMessageEditor.editMessage(bot, chatId, messageId,
                `✅ **User berhasil dihapus**\n\n` +
                `👤 User ID: \`${userId}\`\n` +
                `🗑️ Semua data terkait telah dihapus dari sistem.`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'user_management' }
                        ]]
                    }
                }
            );

        } catch (error) {
            console.error('Error deleting user:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Terjadi kesalahan saat menghapus user.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'user_management' }
                        ]]
                    }
                }
            );
        }
    }
}

module.exports = UserManagementHandler;