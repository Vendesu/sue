const VPSProductManager = require('../config/vpsProducts');
const digitalOcean = require('../config/digitalOcean');
const { DEDICATED_OS_VERSIONS } = require('../config/constants');
const { deductBalance, isAdmin } = require('../utils/userManager');
const { installDedicatedRDP } = require('../utils/dedicatedRdpInstaller');
const safeMessageEditor = require('../utils/safeMessageEdit');
const RDPMonitor = require('../utils/rdpMonitor');

class VPSHandler {
    static async handleVPSMenu(bot, chatId, messageId) {
        await safeMessageEditor.editMessage(bot, chatId, messageId,
            '🖥️ **VPS Services**\n\n' +
            'Pilih jenis layanan VPS yang Anda inginkan:',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🖥️ VPS Biasa', callback_data: 'vps_regular' },
                            { text: '🪟 VPS + RDP', callback_data: 'vps_rdp' }
                        ],
                        [
                            { text: '📋 Pesanan Saya', callback_data: 'my_vps_orders' }
                        ],
                        [
                            { text: '« Kembali', callback_data: 'back_to_menu' }
                        ]
                    ]
                }
            }
        );
    }

    static async handleVPSRegular(bot, chatId, messageId) {
        try {
            const products = await VPSProductManager.getProducts();
            
            if (products.length === 0) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    '❌ Belum ada produk VPS yang tersedia.\n\n' +
                    'Silakan hubungi admin untuk menambahkan produk.',
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '« Kembali', callback_data: 'vps_menu' }
                            ]]
                        }
                    }
                );
                return;
            }

            let messageText = `🖥️ **VPS Biasa - Pilih Paket**\n\n`;
            const keyboard = [];

            products.forEach((product, index) => {
                messageText += `${index + 1}. **${product.name}**\n`;
                messageText += `   💰 Harga: Rp ${product.price.toLocaleString()}/bulan\n`;
                messageText += `   ⚡ CPU: ${product.cpu} Core\n`;
                messageText += `   💾 RAM: ${product.memory} MB\n`;
                messageText += `   💽 Disk: ${product.disk} GB\n`;
                messageText += `   🌍 Regions: ${product.regions.length} tersedia\n\n`;

                keyboard.push([{
                    text: `${index + 1}. ${product.name} - Rp ${product.price.toLocaleString()}`,
                    callback_data: `select_vps_regular_${product.id}`
                }]);
            });

            keyboard.push([{ text: '« Kembali', callback_data: 'vps_menu' }]);

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: { inline_keyboard: keyboard }
            });

        } catch (error) {
            console.error('Error handling VPS regular:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Terjadi kesalahan saat mengambil data produk VPS.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'vps_menu' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleVPSRDP(bot, chatId, messageId) {
        try {
            const products = await VPSProductManager.getProducts();
            
            if (products.length === 0) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    '❌ Belum ada produk VPS yang tersedia.\n\n' +
                    'Silakan hubungi admin untuk menambahkan produk.',
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '« Kembali', callback_data: 'vps_menu' }
                            ]]
                        }
                    }
                );
                return;
            }

            let messageText = `🪟 **VPS + RDP - Pilih Paket**\n\n`;
            messageText += `💡 **Fitur VPS + RDP:**\n`;
            messageText += `• VPS dengan Ubuntu 24.04 LTS\n`;
            messageText += `• Instalasi Windows otomatis\n`;
            messageText += `• RDP siap pakai\n`;
            messageText += `• Port custom 8765\n\n`;

            const keyboard = [];

            products.forEach((product, index) => {
                messageText += `${index + 1}. **${product.name}**\n`;
                messageText += `   💰 Harga: Rp ${product.price.toLocaleString()}/bulan\n`;
                messageText += `   ⚡ CPU: ${product.cpu} Core\n`;
                messageText += `   💾 RAM: ${product.memory} MB\n`;
                messageText += `   💽 Disk: ${product.disk} GB\n`;
                messageText += `   🌍 Regions: ${product.regions.length} tersedia\n\n`;

                keyboard.push([{
                    text: `${index + 1}. ${product.name} - Rp ${product.price.toLocaleString()}`,
                    callback_data: `select_vps_rdp_${product.id}`
                }]);
            });

            keyboard.push([{ text: '« Kembali', callback_data: 'vps_menu' }]);

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: { inline_keyboard: keyboard }
            });

        } catch (error) {
            console.error('Error handling VPS RDP:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Terjadi kesalahan saat mengambil data produk VPS.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'vps_menu' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleSelectVPSRegular(bot, query, sessionManager) {
        const productId = parseInt(query.data.split('_')[3]);
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        try {
            const product = await VPSProductManager.getProductById(productId);
            if (!product) {
                await bot.answerCallbackQuery(query.id, {
                    text: '❌ Produk tidak ditemukan.',
                    show_alert: true
                });
                return;
            }

            // Check balance
            if (!isAdmin(chatId) && !await deductBalance(chatId, product.price)) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    `💰 Saldo tidak mencukupi untuk ${product.name} (Rp ${product.price.toLocaleString()}).\n\n` +
                    'Silakan deposit terlebih dahulu.',
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '💳 Deposit', callback_data: 'deposit' }],
                                [{ text: '« Kembali', callback_data: 'vps_regular' }]
                            ]
                        }
                    }
                );
                return;
            }

            // Show region selection
            await this.showRegionSelection(bot, chatId, messageId, product, 'regular', sessionManager);

        } catch (error) {
            console.error('Error selecting VPS regular:', error);
            await bot.answerCallbackQuery(query.id, {
                text: '❌ Terjadi kesalahan.',
                show_alert: true
            });
        }
    }

    static async handleSelectVPSRDP(bot, query, sessionManager) {
        const productId = parseInt(query.data.split('_')[3]);
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        try {
            const product = await VPSProductManager.getProductById(productId);
            if (!product) {
                await bot.answerCallbackQuery(query.id, {
                    text: '❌ Produk tidak ditemukan.',
                    show_alert: true
                });
                return;
            }

            // Check balance
            if (!isAdmin(chatId) && !await deductBalance(chatId, product.price)) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    `💰 Saldo tidak mencukupi untuk ${product.name} (Rp ${product.price.toLocaleString()}).\n\n` +
                    'Silakan deposit terlebih dahulu.',
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '💳 Deposit', callback_data: 'deposit' }],
                                [{ text: '« Kembali', callback_data: 'vps_rdp' }]
                            ]
                        }
                    }
                );
                return;
            }

            // Show region selection
            await this.showRegionSelection(bot, chatId, messageId, product, 'rdp', sessionManager);

        } catch (error) {
            console.error('Error selecting VPS RDP:', error);
            await bot.answerCallbackQuery(query.id, {
                text: '❌ Terjadi kesalahan.',
                show_alert: true
            });
        }
    }

    static async showRegionSelection(bot, chatId, messageId, product, type, sessionManager) {
        try {
            // Get admin token for this product
            const adminToken = await VPSProductManager.getDOToken(product.admin_id);
            if (!adminToken) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    '❌ Konfigurasi admin tidak lengkap. Hubungi admin.',
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '« Kembali', callback_data: type === 'rdp' ? 'vps_rdp' : 'vps_regular' }
                            ]]
                        }
                    }
                );
                return;
            }

            digitalOcean.setToken(product.admin_id, adminToken);
            const allRegions = await digitalOcean.getRegions(product.admin_id);
            
            // Filter regions available for this product
            const availableRegions = allRegions.filter(region => 
                product.regions.includes(region.slug)
            );

            let messageText = `🌍 **Pilih Region untuk ${product.name}**\n\n`;
            messageText += `💰 Harga: Rp ${product.price.toLocaleString()}/bulan\n`;
            messageText += `⚡ Spesifikasi: ${product.cpu}C/${product.memory}MB/${product.disk}GB\n\n`;

            const keyboard = [];
            availableRegions.forEach(region => {
                keyboard.push([{
                    text: `🌍 ${region.name}`,
                    callback_data: `select_region_${type}_${product.id}_${region.slug}`
                }]);
            });

            keyboard.push([{ text: '« Kembali', callback_data: type === 'rdp' ? 'vps_rdp' : 'vps_regular' }]);

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: { inline_keyboard: keyboard }
            });

            // Store session
            sessionManager.setUserSession(chatId, {
                step: 'region_selection',
                type: type,
                product: product,
                adminToken: adminToken
            });

        } catch (error) {
            console.error('Error showing region selection:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Terjadi kesalahan saat mengambil data region.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: type === 'rdp' ? 'vps_rdp' : 'vps_regular' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleSelectRegion(bot, query, sessionManager) {
        const [, , type, productId, regionSlug] = query.data.split('_');
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        const session = sessionManager.getUserSession(chatId);
        if (!session || session.step !== 'region_selection') {
            await bot.answerCallbackQuery(query.id, {
                text: '❌ Sesi tidak valid.',
                show_alert: true
            });
            return;
        }

        if (type === 'regular') {
            // For regular VPS, create droplet immediately
            await this.createRegularVPS(bot, chatId, messageId, session, regionSlug, sessionManager);
        } else {
            // For RDP VPS, show Windows version selection
            await this.showWindowsSelection(bot, chatId, messageId, session, regionSlug, sessionManager);
        }
    }

    static async createRegularVPS(bot, chatId, messageId, session, regionSlug, sessionManager) {
        try {
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '🚀 **Membuat VPS...**\n\n' +
                '⏳ Sedang membuat droplet di Digital Ocean...\n' +
                'Proses ini membutuhkan waktu 2-3 menit.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '❌ Batal', callback_data: 'cancel_vps_creation' }
                        ]]
                    }
                }
            );

            const product = session.product;
            digitalOcean.setToken(product.admin_id, session.adminToken);

            // Create order in database
            const orderId = await VPSProductManager.createOrder(chatId, product.id, regionSlug);

            // Create droplet
            const dropletConfig = {
                name: `vps-${chatId}-${Date.now()}`,
                region: regionSlug,
                size: product.do_size_slug,
                userId: chatId
            };

            const droplet = await digitalOcean.createDroplet(product.admin_id, dropletConfig);
            
            // Update order with droplet ID
            await VPSProductManager.updateOrder(orderId, {
                droplet_id: droplet.id,
                status: 'creating'
            });

            // Wait for droplet to be ready
            const readyDroplet = await digitalOcean.waitForDropletReady(product.admin_id, droplet.id);
            const publicIP = readyDroplet.networks.v4.find(net => net.type === 'public')?.ip_address;

            // Update order with IP
            await VPSProductManager.updateOrder(orderId, {
                status: 'completed',
                ip_address: publicIP,
                completed_at: new Date().toISOString()
            });

            await safeMessageEditor.editMessage(bot, chatId, messageId,
                `✅ **VPS Berhasil Dibuat!**\n\n` +
                `📦 **${product.name}**\n` +
                `🌍 Region: ${regionSlug}\n` +
                `🌐 IP Address: \`${publicIP}\`\n` +
                `💻 OS: Ubuntu 24.04 LTS\n` +
                `👤 Username: root\n` +
                `🔑 Password: Cek email atau panel DO\n\n` +
                `⚡ **Spesifikasi:**\n` +
                `• CPU: ${product.cpu} Core\n` +
                `• RAM: ${product.memory} MB\n` +
                `• Disk: ${product.disk} GB\n\n` +
                `🆔 Order ID: ${orderId}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📋 Pesanan Saya', callback_data: 'my_vps_orders' }],
                            [{ text: '🏠 Menu Utama', callback_data: 'back_to_menu' }]
                        ]
                    }
                }
            );

            sessionManager.clearUserSession(chatId);

        } catch (error) {
            console.error('Error creating regular VPS:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                `❌ **Gagal membuat VPS**\n\n` +
                `Error: ${error.message}\n\n` +
                'Saldo Anda akan dikembalikan.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔄 Coba Lagi', callback_data: 'vps_regular' }
                        ]]
                    }
                }
            );

            // Refund balance
            if (!isAdmin(chatId)) {
                const BalanceManager = require('../handlers/balanceHandler');
                await BalanceManager.updateBalance(chatId, session.product.price);
            }

            sessionManager.clearUserSession(chatId);
        }
    }

    static async showWindowsSelection(bot, chatId, messageId, session, regionSlug, sessionManager) {
        const keyboard = [];
        let messageText = `🪟 **Pilih OS Windows untuk RDP**\n\n`;
        
        messageText += '🏆 **STANDARD VERSIONS**\n';
        DEDICATED_OS_VERSIONS.filter(os => os.price === 3000 && !os.version.includes('lite') && !os.version.includes('uefi')).forEach(os => {
            messageText += `${os.id}. ${os.name}\n`;
            keyboard.push([{
                text: `${os.id}. ${os.name}`,
                callback_data: `vps_windows_${os.id}_${regionSlug}`
            }]);
        });

        messageText += '\n💎 **LITE VERSIONS** (Hemat Resource)\n';
        DEDICATED_OS_VERSIONS.filter(os => os.version.includes('lite')).forEach(os => {
            messageText += `${os.id}. ${os.name}\n`;
            keyboard.push([{
                text: `${os.id}. ${os.name} (Lite)`,
                callback_data: `vps_windows_${os.id}_${regionSlug}`
            }]);
        });

        keyboard.push([{ text: '« Kembali', callback_data: 'vps_rdp' }]);

        await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
            reply_markup: { inline_keyboard: keyboard }
        });

        // Update session
        session.step = 'windows_selection';
        session.regionSlug = regionSlug;
        sessionManager.setUserSession(chatId, session);
    }

    static async handleWindowsSelection(bot, query, sessionManager) {
        const [, , windowsId, regionSlug] = query.data.split('_');
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        const session = sessionManager.getUserSession(chatId);
        if (!session || session.step !== 'windows_selection') {
            await bot.answerCallbackQuery(query.id, {
                text: '❌ Sesi tidak valid.',
                show_alert: true
            });
            return;
        }

        const selectedOS = DEDICATED_OS_VERSIONS.find(os => os.id === parseInt(windowsId));
        if (!selectedOS) {
            await bot.answerCallbackQuery(query.id, {
                text: '❌ OS tidak valid.',
                show_alert: true
            });
            return;
        }

        await safeMessageEditor.editMessage(bot, chatId, messageId,
            `🔑 **Set Password RDP**\n\n` +
            `📦 VPS: ${session.product.name}\n` +
            `🌍 Region: ${regionSlug}\n` +
            `🪟 OS: ${selectedOS.name}\n\n` +
            `Masukkan password untuk RDP Windows:\n` +
            `(Min. 8 karakter, kombinasi huruf dan angka)`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« Kembali', callback_data: 'vps_rdp' }
                    ]]
                }
            }
        );

        // Update session
        session.step = 'rdp_password';
        session.selectedOS = selectedOS;
        sessionManager.setUserSession(chatId, session);
    }

    static async handleRDPPassword(bot, msg, sessionManager) {
        const chatId = msg.chat.id;
        const session = sessionManager.getUserSession(chatId);

        if (!session || session.step !== 'rdp_password') {
            await bot.sendMessage(chatId, '❌ Sesi tidak valid.');
            return;
        }

        try {
            await bot.deleteMessage(chatId, msg.message_id);
        } catch (error) {
            console.log('Failed to delete password message:', error.message);
        }

        const password = msg.text.trim();
        if (password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&+=]{8,}$/.test(password)) {
            await bot.sendMessage(chatId, '❌ Password tidak memenuhi syarat. Harus minimal 8 karakter dan mengandung huruf dan angka.');
            return;
        }

        // Start VPS + RDP creation process
        await this.createVPSWithRDP(bot, chatId, session, password, sessionManager);
    }

    static async createVPSWithRDP(bot, chatId, session, rdpPassword, sessionManager) {
        try {
            const sentMessage = await bot.sendMessage(chatId,
                '🚀 **Membuat VPS + RDP...**\n\n' +
                '⏳ Tahap 1: Membuat droplet di Digital Ocean...\n' +
                'Proses ini membutuhkan waktu 30-45 menit total.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '❌ Batal', callback_data: 'cancel_vps_creation' }
                        ]]
                    }
                }
            );

            const product = session.product;
            digitalOcean.setToken(product.admin_id, session.adminToken);

            // Create order in database
            const orderId = await VPSProductManager.createOrder(
                chatId, 
                product.id, 
                session.regionSlug, 
                session.selectedOS.version, 
                rdpPassword
            );

            // Create droplet
            const dropletConfig = {
                name: `vps-rdp-${chatId}-${Date.now()}`,
                region: session.regionSlug,
                size: product.do_size_slug,
                userId: chatId
            };

            const droplet = await digitalOcean.createDroplet(product.admin_id, dropletConfig);
            
            // Update order with droplet ID
            await VPSProductManager.updateOrder(orderId, {
                droplet_id: droplet.id,
                status: 'creating_vps'
            });

            await safeMessageEditor.editMessage(bot, chatId, sentMessage.message_id,
                '🚀 **Membuat VPS + RDP...**\n\n' +
                '⏳ Tahap 2: Menunggu VPS siap...\n' +
                'Droplet sedang dibuat di Digital Ocean...'
            );

            // Wait for droplet to be ready
            const readyDroplet = await digitalOcean.waitForDropletReady(product.admin_id, droplet.id);
            const publicIP = readyDroplet.networks.v4.find(net => net.type === 'public')?.ip_address;

            // Update order with IP
            await VPSProductManager.updateOrder(orderId, {
                status: 'installing_rdp',
                ip_address: publicIP
            });

            await safeMessageEditor.editMessage(bot, chatId, sentMessage.message_id,
                '🚀 **Membuat VPS + RDP...**\n\n' +
                '⏳ Tahap 3: Menginstall Windows RDP...\n' +
                `🌐 IP: ${publicIP}\n` +
                'Proses instalasi Windows sedang berjalan...'
            );

            // Wait a bit for SSH to be ready
            await new Promise(resolve => setTimeout(resolve, 60000));

            // Install RDP
            const installResult = await installDedicatedRDP(publicIP, 'root', 'defaultpassword', {
                osVersion: session.selectedOS.version,
                password: rdpPassword
            }, (logMessage) => {
                console.log(`[${publicIP}] ${logMessage}`);
            });

            // Monitor RDP readiness
            const monitor = new RDPMonitor(publicIP, 'root', 'defaultpassword', rdpPassword, 8765);
            const rdpResult = await monitor.waitForRDPReady(30 * 60 * 1000);
            monitor.disconnect();

            // Update order as completed
            await VPSProductManager.updateOrder(orderId, {
                status: 'completed',
                completed_at: new Date().toISOString()
            });

            const statusMessage = rdpResult.rdpReady ? 
                '✅ **VPS + RDP Siap Digunakan!**' : 
                '⚠️ **VPS Dibuat, RDP Sedang Finishing**';

            await safeMessageEditor.editMessage(bot, chatId, sentMessage.message_id,
                `${statusMessage}\n\n` +
                `📦 **${product.name}**\n` +
                `🌍 Region: ${session.regionSlug}\n` +
                `🪟 OS: ${session.selectedOS.name}\n` +
                `🌐 Server: ${publicIP}:8765\n` +
                `👤 Username: administrator\n` +
                `🔑 Password: ${rdpPassword}\n\n` +
                `⚡ **Spesifikasi:**\n` +
                `• CPU: ${product.cpu} Core\n` +
                `• RAM: ${product.memory} MB\n` +
                `• Disk: ${product.disk} GB\n\n` +
                `🆔 Order ID: ${orderId}\n` +
                `${rdpResult.rdpReady ? '🎉 RDP siap connect sekarang!' : '⏳ Tunggu 10-15 menit untuk RDP siap'}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📋 Copy Detail RDP', callback_data: `copy_vps_rdp_${publicIP}_${rdpPassword}` }],
                            [{ text: '📋 Pesanan Saya', callback_data: 'my_vps_orders' }],
                            [{ text: '🏠 Menu Utama', callback_data: 'back_to_menu' }]
                        ]
                    }
                }
            );

            sessionManager.clearUserSession(chatId);

        } catch (error) {
            console.error('Error creating VPS with RDP:', error);
            await bot.sendMessage(chatId,
                `❌ **Gagal membuat VPS + RDP**\n\n` +
                `Error: ${error.message}\n\n` +
                'Saldo Anda akan dikembalikan.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔄 Coba Lagi', callback_data: 'vps_rdp' }
                        ]]
                    }
                }
            );

            // Refund balance
            if (!isAdmin(chatId)) {
                const BalanceManager = require('../handlers/balanceHandler');
                await BalanceManager.updateBalance(chatId, session.product.price);
            }

            sessionManager.clearUserSession(chatId);
        }
    }

    static async handleMyVPSOrders(bot, chatId, messageId) {
        try {
            const orders = await VPSProductManager.getUserOrders(chatId);
            
            if (orders.length === 0) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    '📋 **Pesanan VPS Saya**\n\n' +
                    'Anda belum memiliki pesanan VPS.',
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🖥️ Pesan VPS', callback_data: 'vps_menu' }
                            ]]
                        }
                    }
                );
                return;
            }

            let messageText = `📋 **Pesanan VPS Saya**\n\n`;
            
            orders.forEach((order, index) => {
                const date = new Date(order.created_at).toLocaleDateString('id-ID');
                const status = order.status === 'completed' ? '✅' : 
                             order.status === 'creating' ? '⏳' : 
                             order.status === 'installing_rdp' ? '🔄' : '❓';
                
                messageText += `${index + 1}. ${status} **${order.product_name}**\n`;
                messageText += `   🆔 Order: ${order.id}\n`;
                messageText += `   🌍 Region: ${order.region}\n`;
                if (order.ip_address) {
                    messageText += `   🌐 IP: ${order.ip_address}\n`;
                }
                if (order.windows_version) {
                    messageText += `   🪟 OS: Windows\n`;
                    messageText += `   🔌 Port: 8765\n`;
                }
                messageText += `   📅 Tanggal: ${date}\n`;
                messageText += `   📊 Status: ${order.status}\n\n`;
            });

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Refresh', callback_data: 'my_vps_orders' }],
                        [{ text: '🖥️ Pesan VPS Lagi', callback_data: 'vps_menu' }],
                        [{ text: '« Kembali', callback_data: 'back_to_menu' }]
                    ]
                }
            });

        } catch (error) {
            console.error('Error getting VPS orders:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Terjadi kesalahan saat mengambil data pesanan.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'vps_menu' }
                        ]]
                    }
                }
            );
        }
    }
}

module.exports = VPSHandler;