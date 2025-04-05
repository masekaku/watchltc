const { createClient } = require('@supabase/supabase-js');
const { checkAddress, checkToken, isProxy, getShortlink } = require('./faucet');
const { getIP, alert, redirect } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const faucetID = 'watchltc';

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { address, 'session-token': token, 'h-captcha-response': hcaptcha } = req.body;
    let message = '';
    const settings = await getSettings();

    if (await isProxy(req)) {
        message = alert(`<i class="fas fa-exclamation-triangle"></i> Access Denied: ${getIP(req)} blocked by Proxy Detection`, 'danger');
    } else if (!checkToken(token)) {
        message = alert('<i class="fas fa-exclamation-triangle"></i> Session invalid, try again', 'danger');
    } else if (!await verifyHCaptcha(hcaptcha)) {
        message = alert('<i class="fas fa-exclamation-triangle"></i> Captcha was invalid, try again', 'danger');
    } else if (!await checkAddress(address, message)) {
        message = alert(`<i class="fas fa-exclamation-triangle"></i> ${message}`, 'danger');
    } else {
        const nextStatus = settings.shortlinks && settings.shortlinks !== 'null' ? 'shortlink' : 'payout-ready';
        await supabase.from('sessions').update({
            status: nextStatus,
            user: { address },
            message: ''
        }).eq('faucet_id', faucetID);
        if (nextStatus === 'shortlink') await getShortlink(req, res);
        return redirect(res, `/?status=${nextStatus}`);
    }

    await supabase.from('sessions').update({ message }).eq('faucet_id', faucetID);
    redirect(res, '/');
};

async function verifyHCaptcha(response) {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `response=${response}&secret=${process.env.HCAPTCHA_SECRET}`
    });
    const data = await res.json();
    return data.success;
}
