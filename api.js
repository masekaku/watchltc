const { createClient } = require('@supabase/supabase-js');
const { getSettings, getReward, getToken } = require('./faucet');
const { microwallets, currencies } = require('./microwallets');
const { alert } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const faucetID = 'watchltc';

module.exports = async (req, res) => {
    const settings = await getSettings();
    let { data: session } = await supabase.from('sessions').select('*').eq('faucet_id', faucetID).single();

    if (!session) {
        session = { faucet_id: faucetID, status: 'login', user: null, message: '', hash: '' };
        await supabase.from('sessions').insert(session);
    }

    if (!settings.api_key || !settings.reward || !settings.timer) {
        session.message = alert('<i class="fas fa-exclamation-triangle"></i> A GR8 Faucet is being made, come back soon!', 'warning');
    } else if (settings.status === 'N') {
        session.message = alert('<i class="fas fa-exclamation-triangle"></i> Sorry our faucet is not active, please come back later.', 'danger');
    } else if (!session.user) {
        session.status = 'login';
    }
    await supabase.from('sessions').upsert(session);

    const currencyName = currencies[settings.currency] || settings.currency;
    const navlinks = settings.navlinks ? settings.navlinks.replace(/<a/g, '<a class="nav-item nav-link"') : '';
    const rewardList = await getReward(settings.reward, 'list');
    const token = await getToken();

    const { data: payouts } = await supabase.from(`payouts_${faucetID}`)
        .select('address, reward, timestamp')
        .eq('type', 'claim')
        .order('id', { ascending: false })
        .limit(10);

    res.status(200).json({
        settings,
        session,
        currencyName,
        navlinks,
        rewardList,
        token,
        microwallet: microwallets[settings.microwallet] || {},
        payouts: payouts || []
    });
};