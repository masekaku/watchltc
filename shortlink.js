const { createClient } = require('@supabase/supabase-js');
const { getShortlink, checkShortlink, IPchange } = require('./faucet');
const { alert, redirect, randHash } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const faucetID = 'watchltc';

module.exports = async (req, res) => {
    const { hash } = req.query;
    const { data: session } = await supabase.from('sessions').select('*').eq('faucet_id', faucetID).single();
    let message = '';

    if (session.status !== 'shortlink') return redirect(res, '/');

    if (!await IPchange(req, message)) {
        message = alert(`<i class="fas fa-exclamation-triangle"></i> ${message}`, 'danger');
    } else if (!await checkShortlink(req)) {
        message = alert('<i class="fas fa-exclamation-triangle"></i> Sponsored link verification failed, please try again.', 'danger');
    } else if (hash && session.hash === hash) {
        if (!await getShortlink(req, res)) {
            message = alert('<i class="fas fa-exclamation-triangle"></i> Failed to get a Sponsor\'s link, please try again.', 'danger');
        } else {
            await supabase.from('sessions').update({ status: 'payout-ready', message: '' }).eq('faucet_id', faucetID);
            return redirect(res, '/?status=payout-ready');
        }
    } else {
        const newHash = randHash(12);
        await supabase.from('sessions').update({ hash: newHash }).eq('faucet_id', faucetID);
        return redirect(res, `/api/shortlink?hash=${newHash}`);
    }

    await supabase.from('sessions').update({ message }).eq('faucet_id', faucetID);
    redirect(res, '/?status=shortlink');
};