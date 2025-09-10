const digitalOcean = require('../config/digitalOcean');
const VPSProductManager = require('../config/vpsProducts');
const { isAdmin } = require('../utils/userManager');
const safeMessageEditor = require('../utils/safeMessageEdit');

class DigitalOceanHandler {
    static async handleDOManagement(bot, chatId, messageId) {
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

        const hasToken = await VPSProductManager.getDOToken(chatId);
        
        await safeMessageEditor.editMessage(bot, chatId, messageId,
            '🌊 **Digital Ocean Management**\n\n' +
            `Status Token: ${hasToken ? '✅ Terkonfigurasi' : '❌ Belum dikonfigurasi'}\n\n` +
            'Pilih aksi yang ingin dilakukan:',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔑 Set DO Token', callback_data: 'set_do_token' },
                            { text: '📊 Lihat Droplets', callback_data: 'view_droplets' }
                        ],
                        [
                            { text: '🛍️ Kelola Produk VPS', callback_data: 'manage_vps_products' },
                            { text: '🌍 Lihat Regions', callback_data: 'view_regions' }
                        ],
                        [
                            { text: '📏 Lihat Sizes', callback_data: 'view_sizes' }
                        ],
                        [
                            { text: '« Kembali', callback_data: 'back_to_menu' }
                        ]
                    ]
                }
            }
        );
    }

    static async handleSetDOToken(bot, chatId, messageId) {
        await safeMessageEditor.editMessage(bot, chatId, messageId,
            '🔑 **Set Digital Ocean Token**\n\n' +
            'Masukkan Personal Access Token dari Digital Ocean:\n\n' +
            '📝 **Cara mendapatkan token:**\n' +
            '1. Login ke Digital Ocean\n' +
            '2. Pergi ke API → Tokens/Keys\n' +
            '3. Generate New Token\n' +
            '4. Copy dan paste di sini\n\n' +
            '⚠️ Token akan dihapus otomatis setelah dikirim',
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« Kembali', callback_data: 'do_management' }
                    ]]
                }
            }
        );
    }

    static async processDOToken(bot, msg, sessionManager) {
        const chatId = msg.chat.id;
        const token = msg.text.trim();

        try {
            await bot.deleteMessage(chatId, msg.message_id);
        } catch (error) {
            console.log('Failed to delete token message:', error.message);
        }

        if (!token.startsWith('dop_v1_')) {
            await bot.sendMessage(chatId, '❌ Format token tidak valid. Token harus dimulai dengan "dop_v1_"');
            return;
        }

        try {
            // Test token validity
            digitalOcean.setToken(chatId, token);
            await digitalOcean.getDroplets(chatId);

            // Save token to database
            await VPSProductManager.addDOToken(chatId, token);

            await bot.sendMessage(chatId,
                '✅ **Digital Ocean Token berhasil disimpan!**\n\n' +
                '🔐 Token telah diverifikasi dan dapat digunakan.\n' +
                'Sekarang Anda dapat mengelola droplets dan produk VPS.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🌊 Kembali ke DO Management', callback_data: 'do_management' }
                        ]]
                    }
                }
            );

        } catch (error) {
            console.error('Error setting DO token:', error);
            await bot.sendMessage(chatId,
                '❌ **Token tidak valid atau terjadi kesalahan**\n\n' +
                `Error: ${error.message}\n\n` +
                'Pastikan token benar dan memiliki akses yang diperlukan.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔄 Coba Lagi', callback_data: 'set_do_token' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleViewDroplets(bot, chatId, messageId) {
        try {
            const token = await VPSProductManager.getDOToken(chatId);
            if (!token) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    '❌ Token Digital Ocean belum dikonfigurasi.',
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🔑 Set Token', callback_data: 'set_do_token' }
                            ]]
                        }
                    }
                );
                return;
            }

            digitalOcean.setToken(chatId, token);
            const droplets = await digitalOcean.getDroplets(chatId);

            let messageText = `💧 **Digital Ocean Droplets**\n\n`;
            
            if (droplets.length === 0) {
                messageText += 'Tidak ada droplets ditemukan.';
            } else {
                droplets.forEach((droplet, index) => {
                    const status = droplet.status === 'active' ? '✅' : '⏳';
                    const ip = droplet.networks.v4.find(net => net.type === 'public')?.ip_address || 'N/A';
                    
                    messageText += `${index + 1}. ${status} **${droplet.name}**\n`;
                    messageText += `   🆔 ID: ${droplet.id}\n`;
                    messageText += `   🌐 IP: ${ip}\n`;
                    messageText += `   📏 Size: ${droplet.size.slug}\n`;
                    messageText += `   🌍 Region: ${droplet.region.name}\n`;
                    messageText += `   📊 Status: ${droplet.status}\n\n`;
                });
            }

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Refresh', callback_data: 'view_droplets' }],
                        [{ text: '« Kembali', callback_data: 'do_management' }]
                    ]
                }
            });

        } catch (error) {
            console.error('Error viewing droplets:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                `❌ Gagal mengambil data droplets.\n\nError: ${error.message}`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'do_management' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleManageVPSProducts(bot, chatId, messageId) {
        try {
            const products = await VPSProductManager.getProducts(chatId);
            
            let messageText = `🛍️ **Produk VPS Anda**\n\n`;
            
            if (products.length === 0) {
                messageText += 'Belum ada produk VPS yang ditambahkan.';
            } else {
                products.forEach((product, index) => {
                    messageText += `${index + 1}. **${product.name}**\n`;
                    messageText += `   💰 Harga: Rp ${product.price.toLocaleString()}\n`;
                    messageText += `   ⚡ CPU: ${product.cpu} Core\n`;
                    messageText += `   💾 RAM: ${product.memory} MB\n`;
                    messageText += `   💽 Disk: ${product.disk} GB\n`;
                    messageText += `   🌍 Regions: ${product.regions.length} tersedia\n\n`;
                });
            }

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '➕ Tambah Produk', callback_data: 'add_vps_product' },
                            { text: '🗑️ Hapus Produk', callback_data: 'delete_vps_product' }
                        ],
                        [
                            { text: '🔄 Refresh', callback_data: 'manage_vps_products' }
                        ],
                        [
                            { text: '« Kembali', callback_data: 'do_management' }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error('Error managing VPS products:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                '❌ Terjadi kesalahan saat mengambil data produk.',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'do_management' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleAddVPSProduct(bot, chatId, messageId) {
        try {
            const token = await VPSProductManager.getDOToken(chatId);
            if (!token) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    '❌ Token Digital Ocean belum dikonfigurasi.',
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🔑 Set Token', callback_data: 'set_do_token' }
                            ]]
                        }
                    }
                );
                return;
            }

            digitalOcean.setToken(chatId, token);
            const sizes = await digitalOcean.getSizes(chatId);
            const regions = await digitalOcean.getRegions(chatId);

            let messageText = `➕ **Tambah Produk VPS**\n\n`;
            messageText += `📏 **Available Sizes:**\n\n`;

            const keyboard = [];
            sizes.slice(0, 10).forEach((size, index) => {
                messageText += `${index + 1}. **${size.slug}**\n`;
                messageText += `   ⚡ CPU: ${size.vcpus} Core\n`;
                messageText += `   💾 RAM: ${size.memory} MB\n`;
                messageText += `   💽 Disk: ${size.disk} GB\n`;
                messageText += `   💰 $${size.price_monthly}/month\n\n`;

                keyboard.push([{
                    text: `${index + 1}. ${size.slug} ($${size.price_monthly}/mo)`,
                    callback_data: `select_size_${size.slug}`
                }]);
            });

            keyboard.push([{ text: '« Kembali', callback_data: 'manage_vps_products' }]);

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: { inline_keyboard: keyboard }
            });

        } catch (error) {
            console.error('Error adding VPS product:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                `❌ Gagal mengambil data sizes.\n\nError: ${error.message}`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'manage_vps_products' }
                        ]]
                    }
                }
            );
        }
    }

    static async handleSelectSize(bot, query, sessionManager) {
        const sizeSlug = query.data.split('_')[2];
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        try {
            const token = await VPSProductManager.getDOToken(chatId);
            digitalOcean.setToken(chatId, token);
            
            const sizes = await digitalOcean.getSizes(chatId);
            const regions = await digitalOcean.getRegions(chatId);
            
            const selectedSize = sizes.find(s => s.slug === sizeSlug);
            if (!selectedSize) {
                await bot.answerCallbackQuery(query.id, {
                    text: '❌ Size tidak ditemukan.',
                    show_alert: true
                });
                return;
            }

            await safeMessageEditor.editMessage(bot, chatId, messageId,
                `💰 **Set Harga untuk ${selectedSize.slug}**\n\n` +
                `📏 **Spesifikasi:**\n` +
                `• CPU: ${selectedSize.vcpus} Core\n` +
                `• RAM: ${selectedSize.memory} MB\n` +
                `• Disk: ${selectedSize.disk} GB\n` +
                `• Transfer: ${selectedSize.transfer} TB\n` +
                `• DO Price: $${selectedSize.price_monthly}/month\n\n` +
                `💵 **Masukkan harga jual dalam Rupiah:**\n` +
                `Format: 50000 (tanpa titik atau koma)`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'add_vps_product' }
                        ]]
                    }
                }
            );

            sessionManager.setAdminSession(chatId, {
                action: 'set_vps_price',
                selectedSize: selectedSize,
                availableRegions: regions
            });

        } catch (error) {
            console.error('Error selecting size:', error);
            await bot.answerCallbackQuery(query.id, {
                text: '❌ Terjadi kesalahan.',
                show_alert: true
            });
        }
    }

    static async processVPSPrice(bot, msg, sessionManager) {
        const chatId = msg.chat.id;
        const session = sessionManager.getAdminSession(chatId);

        if (!session || session.action !== 'set_vps_price') {
            await bot.sendMessage(chatId, '❌ Sesi tidak valid.');
            return;
        }

        try {
            await bot.deleteMessage(chatId, msg.message_id);
        } catch (error) {
            console.log('Failed to delete price message:', error.message);
        }

        const price = parseInt(msg.text.replace(/[^0-9]/g, ''));

        if (isNaN(price) || price <= 0) {
            await bot.sendMessage(chatId, '❌ Harga tidak valid. Masukkan angka yang benar.');
            return;
        }

        try {
            const size = session.selectedSize;
            const regions = session.availableRegions;

            // Add product to database
            const productId = await VPSProductManager.addProduct(chatId, {
                slug: size.slug,
                name: `VPS ${size.slug.toUpperCase()}`,
                price: price,
                vcpus: size.vcpus,
                memory: size.memory,
                disk: size.disk,
                transfer: size.transfer,
                price_hourly: size.price_hourly,
                price_monthly: size.price_monthly,
                regions: regions.map(r => r.slug)
            });

            await bot.sendMessage(chatId,
                `✅ **Produk VPS berhasil ditambahkan!**\n\n` +
                `📦 **${size.slug.toUpperCase()}**\n` +
                `💰 Harga: Rp ${price.toLocaleString()}\n` +
                `⚡ CPU: ${size.vcpus} Core\n` +
                `💾 RAM: ${size.memory} MB\n` +
                `💽 Disk: ${size.disk} GB\n` +
                `🌍 Regions: ${regions.length} tersedia\n\n` +
                `🆔 Product ID: ${productId}`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🛍️ Kelola Produk', callback_data: 'manage_vps_products' }
                        ]]
                    }
                }
            );

            sessionManager.clearAdminSession(chatId);

        } catch (error) {
            console.error('Error adding VPS product:', error);
            await bot.sendMessage(chatId, '❌ Terjadi kesalahan saat menambahkan produk.');
        }
    }

    static async handleViewRegions(bot, chatId, messageId) {
        try {
            const token = await VPSProductManager.getDOToken(chatId);
            if (!token) {
                await safeMessageEditor.editMessage(bot, chatId, messageId,
                    '❌ Token Digital Ocean belum dikonfigurasi.',
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🔑 Set Token', callback_data: 'set_do_token' }
                            ]]
                        }
                    }
                );
                return;
            }

            digitalOcean.setToken(chatId, token);
            const regions = await digitalOcean.getRegions(chatId);

            let messageText = `🌍 **Digital Ocean Regions**\n\n`;
            
            regions.forEach((region, index) => {
                messageText += `${index + 1}. **${region.name}**\n`;
                messageText += `   🏷️ Slug: ${region.slug}\n`;
                messageText += `   🌐 Features: ${region.features.join(', ')}\n\n`;
            });

            await safeMessageEditor.editMessage(bot, chatId, messageId, messageText, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« Kembali', callback_data: 'do_management' }
                    ]]
                }
            });

        } catch (error) {
            console.error('Error viewing regions:', error);
            await safeMessageEditor.editMessage(bot, chatId, messageId,
                `❌ Gagal mengambil data regions.\n\nError: ${error.message}`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« Kembali', callback_data: 'do_management' }
                        ]]
                    }
                }
            );
        }
    }
}

module.exports = DigitalOceanHandler;