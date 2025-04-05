const microwallets = {
    faucetpay: {
        name: 'FaucetPay',
        currencies: ['BCH', 'BNB', 'BTC', 'DASH', 'DGB', 'DOGE', 'ETH', 'FEY', 'LTC', 'TRX', 'USDT', 'ZEC'],
        api_base: 'https://faucetpay.io/api/v1/',
        check: 'https://faucetpay.io/page/user-admin',
        url: 'https://gr8.cc/goto/faucetpay'
    }
};

const currencies = {
    LTC: 'Litecoin'
};

module.exports = { microwallets, currencies };
