const { createClient } = require('@supabase/supabase-js');
const { sendPayout, checkLastClaim } = require('./faucet');
const { alert, redirect } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const faucetID = 'watchltc';

module.exports = async (req, res) => {
    const { data: session } = await supabase.from('sessions').select('*').eq('faucet_id', faucetID).single();
    let message = '';

    if (session.status === 'payout-ready') {
        if (!await sendPayout(req, message)) {
            message = alert(`<i class="fas fa-exclamation-triangle"></i> ${message}`, 'danger');
            await supabase.from('sessions').update({ message }).eq('faucet_id', faucetID);
            return redirect(res, '/');
        } else {
            message = alert(`Payout successful! ${session.user.address} received ${Math.floor(Math.random() * 1000)} satoshi.`, 'success');
            await supabase.from('sessions').update({ status: 'paid', message }).eq('faucet_id', faucetID);
            return redirect(res, '/?status=paid');
        }
    } else if (session.status === 'paid') {
        if (session.message) {
            message = session.message;
            await supabase.from('sessions').update({ message: '' }).eq('faucet_id', faucetID);
        } else {
            const mins = await checkLastClaim(req);
            if (!mins) {
                message = alert(`<i class="fas fa-exclamation-triangle"></i> You have to wait ${mins > 1 ? `${mins} minutes` : `${mins} minute`}`, 'danger');
            } else {
                await supabase.from('sessions').update({ status: 'login', message: '' }).eq('faucet_id', faucetID);
                return redirect(res, '/');
            }
        }
    }

    await supabase.from('sessions').update({ message }).eq('faucet_id', faucetID);
    redirect(res, '/?status=paid');
};