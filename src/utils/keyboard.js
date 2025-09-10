const { BUTTONS } = require('../config/buttons');

function createMainMenu(isAdmin = false, hasPendingPayment = false) {
    const keyboard = [
        [
            BUTTONS.INSTALL_RDP,
            BUTTONS.DEPOSIT
        ],
        [
            BUTTONS.TUTORIAL,
            BUTTONS.FAQ
        ],
        [
            BUTTONS.PROVIDERS
        ]
    ];

    if (hasPendingPayment) {
        keyboard.splice(1, 0, [
            BUTTONS.CHECK_PAYMENT
        ]);
    }

    if (isAdmin) {
        keyboard.splice(1, 0, [
            BUTTONS.ADD_BALANCE,
            BUTTONS.BROADCAST
        ], [
            BUTTONS.MANAGE_DB
        ]);
    }

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

module.exports = {
    createMainMenu
};
