# 🤖 RDP Installation Bot

Bot Telegram untuk instalasi RDP Windows otomatis dengan integrasi Digital Ocean dan manajemen user lengkap.

## 📋 Fitur Utama

### 🖥️ Instalasi RDP
- **Docker RDP** - Instalasi cepat Windows di container Docker (Rp 1.000)
- **Dedicated RDP** - Windows langsung di VPS dengan performa optimal (Rp 3.000)
- **VPS + RDP** - Pembuatan VPS baru dengan instalasi Windows otomatis
- Support berbagai versi Windows (10, 11, Server 2019, 2022, dll)
- Port custom 8765 untuk keamanan ekstra
- Monitoring otomatis status RDP

### 🌊 Integrasi Digital Ocean
- **Token Management** - Admin dapat menambah token Digital Ocean
- **Droplet Scanning** - Scan otomatis semua droplet yang tersedia
- **Product Management** - Admin dapat menambah produk VPS dari DO
- **Region Selection** - User dapat memilih region server
- **Auto Deployment** - Pembuatan VPS otomatis dengan spesifikasi yang dipilih

### 🛍️ Sistem VPS
- **VPS Biasa** - VPS dengan Ubuntu 24.04 LTS siap pakai
- **VPS + RDP** - VPS dengan Windows RDP terinstall otomatis
- **Multi Region** - Support berbagai region Digital Ocean
- **Flexible Pricing** - Admin dapat set harga custom untuk setiap produk
- **Order Tracking** - User dapat melihat riwayat pesanan VPS

### 👥 Manajemen User (Admin)
- **View All Users** - Lihat semua user dengan pagination
- **User Search** - Cari user berdasarkan ID
- **Balance Management** - Tambah/kurangi saldo user
- **User Statistics** - Statistik lengkap user dan transaksi
- **Delete User** - Hapus user beserta semua data terkait
- **Transaction History** - Riwayat transaksi per user

### 💰 Sistem Pembayaran
- **QRIS Payment** - Pembayaran otomatis via QRIS
- **Auto Balance** - Saldo otomatis masuk setelah pembayaran
- **Payment Tracking** - Monitoring status pembayaran real-time
- **Deposit History** - Riwayat deposit dan transaksi

### 🔧 Fitur Admin Lanjutan
- **Digital Ocean Management** - Kelola token dan produk DO
- **User Management** - Kelola user secara menyeluruh
- **Database Backup** - Backup otomatis database mingguan
- **Broadcast Message** - Kirim pesan ke semua user
- **Statistics Dashboard** - Statistik lengkap bot dan user

## 🚀 Instalasi

### Prasyarat
- Node.js 16+ 
- NPM atau Yarn
- Token Bot Telegram
- API Key Atlantis (untuk pembayaran)
- Token Digital Ocean (untuk admin)

### Langkah Instalasi

1. **Clone Repository**
```bash
git clone <repository-url>
cd rdp-installation-bot
```

2. **Install Dependencies**
```bash
npm install
```

3. **Konfigurasi Environment**
Buat file `.env` dengan konfigurasi berikut:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ADMIN_ID=your_telegram_user_id
ATLANTIS_API_KEY=your_atlantis_api_key
```

4. **Jalankan Bot**
```bash
# Development
npm run dev

# Production
npm start
```

## 📁 Struktur Project

```
src/
├── config/
│   ├── buttons.js          # Konfigurasi tombol bot
│   ├── constants.js        # Konstanta aplikasi
│   ├── database.js         # Konfigurasi database SQLite
│   ├── digitalOcean.js     # Manager Digital Ocean API
│   ├── vps.js             # Konfigurasi VPS
│   ├── vpsProducts.js     # Manager produk VPS
│   └── windows.js         # Versi Windows tersedia
├── handlers/
│   ├── adminHandler.js           # Handler admin umum
│   ├── balanceHandler.js         # Manager saldo user
│   ├── dedicatedRdpHandler.js    # Handler RDP dedicated
│   ├── depositHandler.js         # Handler deposit
│   ├── digitalOceanHandler.js    # Handler Digital Ocean
│   ├── faqHandler.js            # Handler FAQ
│   ├── providerHandler.js       # Handler provider VPS
│   ├── rdpHandler.js            # Handler RDP Docker
│   ├── tutorialHandler.js       # Handler tutorial
│   ├── userManagementHandler.js # Handler manajemen user
│   └── vpsHandler.js            # Handler VPS services
├── utils/
│   ├── adminNotifications.js    # Notifikasi admin
│   ├── dbBackup.js             # Backup database
│   ├── dedicatedRdpInstaller.js # Installer RDP dedicated
│   ├── errorHandler.js         # Handler error
│   ├── keyboard.js             # Generator keyboard
│   ├── messageFormatter.js     # Format pesan
│   ├── payment.js              # Sistem pembayaran
│   ├── paymentStatus.js        # Monitor status pembayaran
│   ├── paymentTracker.js       # Tracker pembayaran
│   ├── rdpInstaller.js         # Installer RDP Docker
│   ├── rdpMonitor.js           # Monitor status RDP
│   ├── safeMessageEdit.js      # Editor pesan aman
│   ├── sessionManager.js       # Manager sesi user
│   ├── uptime.js               # Monitor uptime bot
│   ├── userManager.js          # Manager user
│   ├── validation.js           # Validasi input
│   ├── vpsChecker.js           # Checker VPS
│   └── vpsSpecs.js             # Detector spesifikasi VPS
├── scripts/
│   ├── rdp.sh                  # Script instalasi Docker RDP
│   └── tele.sh                 # Script instalasi Dedicated RDP
└── index.js                    # Entry point aplikasi
```

## 🎯 Cara Penggunaan

### Untuk User

1. **Mulai Bot**
   - Kirim `/start` ke bot
   - Bot akan menampilkan menu utama

2. **Deposit Saldo**
   - Klik "💰 Deposit"
   - Masukkan jumlah deposit
   - Scan QR Code QRIS
   - Saldo otomatis masuk

3. **Install RDP**
   - Klik "🖥️ Install RDPmu"
   - Pilih jenis instalasi (Docker/Dedicated)
   - Masukkan IP dan password VPS
   - Pilih versi Windows
   - Tunggu proses instalasi

4. **Pesan VPS**
   - Klik "🖥️ VPS Services"
   - Pilih "VPS Biasa" atau "VPS + RDP"
   - Pilih paket dan region
   - Untuk RDP: pilih OS Windows dan set password
   - VPS akan dibuat otomatis

### Untuk Admin

1. **Setup Digital Ocean**
   - Klik "🌊 Digital Ocean"
   - Set token Digital Ocean
   - Scan sizes dan regions
   - Tambah produk VPS dengan harga custom

2. **Kelola User**
   - Klik "👥 Kelola User"
   - Lihat semua user atau cari spesifik
   - Kelola saldo user
   - Lihat statistik lengkap
   - Hapus user jika diperlukan

3. **Monitor Sistem**
   - Lihat droplets Digital Ocean
   - Monitor pesanan VPS user
   - Backup database
   - Broadcast pesan ke user

## 🔧 Konfigurasi

### Database
Bot menggunakan SQLite dengan tabel:
- `users` - Data user dan saldo
- `transactions` - Riwayat transaksi
- `pending_payments` - Pembayaran pending
- `rdp_installations` - Instalasi RDP
- `vps_products` - Produk VPS
- `vps_orders` - Pesanan VPS
- `do_tokens` - Token Digital Ocean

### Payment Gateway
Menggunakan Atlantis Payment dengan support:
- QRIS (semua e-wallet)
- Monitoring otomatis
- Auto balance update

### VPS Requirements
- **Minimum**: 1 Core, 1GB RAM, 20GB Storage
- **OS**: Ubuntu 22.04/24.04 LTS fresh install
- **Network**: Public IP dengan SSH access
- **Provider**: Support KVM (recommended)

## 🛡️ Keamanan

- **Input Validation** - Semua input divalidasi
- **SQL Injection Protection** - Menggunakan prepared statements
- **Session Management** - Sesi otomatis expire
- **Password Security** - Password VPS dihapus otomatis
- **Admin Only Features** - Fitur admin terlindungi
- **Error Handling** - Comprehensive error handling

## 📊 Monitoring

- **Uptime Tracking** - Monitor uptime bot
- **Payment Monitoring** - Real-time payment status
- **RDP Status Check** - Monitor status RDP
- **Database Backup** - Backup otomatis mingguan
- **Error Logging** - Log semua error

## 🔄 Update Log

### v2.0.0 - Fitur Matang
- ✅ Integrasi Digital Ocean lengkap
- ✅ Manajemen user comprehensive
- ✅ Sistem VPS dengan auto deployment
- ✅ Multi-region support
- ✅ Enhanced admin features
- ✅ Improved error handling
- ✅ Better session management

### v1.0.0 - Release Awal
- ✅ Docker RDP installation
- ✅ Dedicated RDP installation
- ✅ QRIS payment system
- ✅ Basic admin features
- ✅ User balance management

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📝 Lisensi

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Untuk bantuan dan support:
- Telegram: @your_support_username
- Email: support@yourdomain.com
- Issues: GitHub Issues

## 🙏 Acknowledgments

- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [Digital Ocean API](https://docs.digitalocean.com/reference/api/)
- [SSH2](https://github.com/mscdex/ssh2)
- [SQLite3](https://github.com/TryGhost/node-sqlite3)