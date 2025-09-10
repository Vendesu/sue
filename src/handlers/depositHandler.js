const { handlePaymentStatus } = require('../utils/paymentStatus');
const { createPayment, checkPaymentStatus, isPaymentStatusSuccessful } = require('../utils/payment');
const BalanceManager = require('./balanceHandler');
const PaymentTracker = require('../utils/paymentTracker');
const { getUser } = require('../utils/userManager');
const QRCode = require('qrcode');

async function handleDeposit(bot, chatId, messageId) {
  const msg = await bot.editMessageText(
    'Deposit Saldo\n\n' +
    'Masukkan jumlah deposit:\n' +
    '(minimal Rp 500)',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '« Kembali', callback_data: 'back_to_menu' }
        ]]
      }
    }
  );

  const session = {
    step: 'waiting_amount',
    messageId: msg.message_id
  };
  return session;
}

async function handleDepositAmount(bot, msg, session) {
  const chatId = msg.chat.id;
  const amount = parseInt(msg.text.replace(/[^0-9]/g, ''));

  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    console.log('Failed to delete amount message:', error.message);
  }

  if (isNaN(amount) || amount < 500) {
    await bot.editMessageText(
      'Jumlah deposit tidak valid.\n\n' +
      'Deposit Saldo\n\n' +
      'Masukkan jumlah deposit:\n' +
      '(minimal Rp 500)',
      {
        chat_id: chatId,
        message_id: session.messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '« Kembali', callback_data: 'back_to_menu' }
          ]]
        }
      }
    );
    return;
  }

  await bot.editMessageText(
    'Membuat tagihan pembayaran QRIS...',
    {
      chat_id: chatId,
      message_id: session.messageId,
      parse_mode: 'Markdown'
    }
  );

  try {
    await getUser(chatId);
    const uniqueCode = `DEP${Date.now()}${chatId}`;

    console.log('Creating payment with:', {
      apiKey: process.env.ATLANTIS_API_KEY ? '***' : 'undefined',
      uniqueCode,
      amount
    });

    const payment = await createPayment(process.env.ATLANTIS_API_KEY, uniqueCode, amount);

    console.log('Payment creation result:', {
      success: payment.success,
      hasData: !!payment.data,
      error: payment.error
    });

    if (!payment.success) {
      throw new Error(payment.error || 'Gagal membuat pembayaran QRIS');
    }

    if (!payment.data || !payment.data.qr_string) {
      throw new Error('Data pembayaran tidak lengkap dari server');
    }

    const expiryTime = payment.data.expired_at ?
      new Date(payment.data.expired_at).getTime() :
      Date.now() + (30 * 60 * 1000);

    await PaymentTracker.addPendingPayment(
      chatId,
      payment.data.id,
      payment.data.reff_id,
      amount,
      expiryTime
    );

    const messageText = createAtlantisPaymentMessage(payment.data, amount);
    const qrImageBuffer = await generateQrCodeFromString(payment.data.qr_string);

    try {
      await bot.deleteMessage(chatId, session.messageId);
    } catch (deleteError) {
      console.log('Failed to delete loading message:', deleteError.message);
    }

    let sentMessage;
    if (qrImageBuffer) {
      sentMessage = await bot.sendPhoto(chatId, qrImageBuffer, {
        caption: messageText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Refresh Status', callback_data: 'refresh_payment' }],
            [{ text: 'Batalkan', callback_data: 'cancel_payment' }]
          ]
        }
      });
    } else {
      const qrImageUrl = payment.data.qr_image || '#';
      sentMessage = await bot.sendMessage(chatId,
        messageText + `\n\n[Klik untuk melihat QR Code](${qrImageUrl})`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Refresh Status', callback_data: 'refresh_payment' }],
              [{ text: 'Batalkan', callback_data: 'cancel_payment' }]
            ]
          }
        }
      );
    }

    await handlePaymentStatus(
      bot,
      chatId,
      sentMessage.message_id,
      payment.data.id,
      amount
    );

  } catch (error) {
    console.error('Payment creation error:', error);
    const errorMessage = error.message ? error.message.replace(/[_*`]/g, '\\$&') : 'Unknown error';

    await bot.editMessageText(
      'Gagal membuat pembayaran QRIS. Silakan coba lagi.\n\n' +
      `Error: ${errorMessage}\n\n` +
      `Tips: Pastikan koneksi internet stabil`,
      {
        chat_id: chatId,
        message_id: session.messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Coba Lagi', callback_data: 'deposit' }],
            [{ text: '« Kembali', callback_data: 'back_to_menu' }]
          ]
        }
      }
    );
  }
}

async function generateQrCodeFromString(qrString) {
  try {
    console.log('Generating QR code from string...');
    const qrBuffer = await QRCode.toBuffer(qrString, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('QR code generated successfully');
    return qrBuffer;
  } catch (error) {
    console.error('Failed to generate QR code:', error.message);
    return null;
  }
}

async function handlePendingPayment(bot, chatId, messageId) {
  try {
    const pendingPayment = await PaymentTracker.getPendingPayment(chatId);
    if (!pendingPayment) {
      await bot.editMessageText(
        'Tidak ada tagihan pembayaran yang tertunda.',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '« Kembali', callback_data: 'back_to_menu' }
            ]]
          }
        }
      );
      return;
    }

    const paymentStatus = await checkPaymentStatus(process.env.ATLANTIS_API_KEY, pendingPayment.transaction_id);

    if (!paymentStatus.success) {
      throw new Error(paymentStatus.error || 'Failed to get payment status');
    }

    const messageText = createAtlantisPendingPaymentMessage(pendingPayment);
    const qrImageUrl = paymentStatus.data?.qr_image || '#';

    await bot.editMessageText(
      messageText + `\n\n[Klik untuk melihat QR Code](${qrImageUrl})`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Refresh Status', callback_data: 'refresh_payment' }],
            [{ text: 'Batalkan', callback_data: 'cancel_payment' }]
          ]
        }
      }
    );

    await handlePaymentStatus(bot, chatId, messageId, pendingPayment.transaction_id, pendingPayment.amount);

  } catch (error) {
    console.error('Error handling pending payment:', error);
    await bot.editMessageText(
      'Terjadi kesalahan saat mengecek tagihan pembayaran.\n\n' +
      `Error: ${error.message}`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '« Kembali', callback_data: 'back_to_menu' }
          ]]
        }
      }
    );
  }
}

function createAtlantisPaymentMessage(paymentData, amount) {
  const expiredAt = paymentData.expired_at ? new Date(paymentData.expired_at) : new Date(Date.now() + 30 * 60 * 1000);
  const expiredTime = expiredAt.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const fee = paymentData.fee || 0;
  const tambahan = paymentData.tambahan || 0;
  const getBalance = paymentData.get_balance || amount;

  return `**💳 Scan QRIS untuk membayar**\n\n` +
    `🆔 **ID Transaksi:** ${paymentData.reff_id || paymentData.id}\n` +
    `💰 **Jumlah:** Rp ${amount.toLocaleString()}\n` +
    `📊 **Fee:** Rp ${fee.toLocaleString()}\n` +
    `🎁 **Bonus:** Rp ${tambahan.toLocaleString()}\n` +
    `💎 **Saldo Diterima:** Rp ${getBalance.toLocaleString()}\n\n` +
    `⏰ **Berlaku hingga:** ${expiredTime}\n\n` +
    `📱 **Cara Pembayaran:**\n` +
    `1️⃣ Scan QR Code di atas\n` +
    `2️⃣ Gunakan aplikasi e-wallet apapun\n` +
    `3️⃣ Konfirmasi pembayaran\n` +
    `4️⃣ Saldo otomatis masuk\n\n` +
    `⚠️ **Jangan tutup halaman ini sampai selesai!**`;
}

function createAtlantisPendingPaymentMessage(pendingPayment) {
  const expiredAt = new Date(pendingPayment.expiry_time);
  const expiredTime = expiredAt.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `**💳 QRIS Payment (Pending)**\n\n` +
    `🆔 **ID Transaksi:** ${pendingPayment.unique_code}\n` +
    `💰 **Jumlah:** Rp ${pendingPayment.amount.toLocaleString()}\n` +
    `⏰ **Berlaku hingga:** ${expiredTime}\n\n` +
    `📱 **Cara Pembayaran:**\n` +
    `1️⃣ Scan QR Code\n` +
    `2️⃣ Gunakan aplikasi e-wallet apapun\n` +
    `3️⃣ Konfirmasi pembayaran\n` +
    `4️⃣ Saldo otomatis masuk\n\n` +
    `📊 **Status:** Menunggu Pembayaran`;
}

module.exports = {
  handleDeposit,
  handleDepositAmount,
  handlePendingPayment
};