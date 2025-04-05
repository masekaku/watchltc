const { createClient } = require('@supabase/supabase-js');
const { getCURL } = require('./utils');
const cache = require('./cache');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const faucetID = 'watchltc';

async function getSettings() {
    const { data } = await supabase.from(`settings_${faucetID}`).select('name, value').then(res => ({
        data: Object.fromEntries(res.data.map(row => [row.name, row.value]))
    }));
    return {
        name: 'WatchLTC',
        domain: process.env.VERCEL_URL || 'https://watchltc.vercel.app',
        currency: 'LTC',
        reward: '100-1000',
        timer: 5,
        api_key: process.env.API_KEY || 'your-api-key',
        status: 'Y',
        shortlinks: 'Y',
        referral: 10,
        balance: 1000000000, // 10 LTC dalam satoshi
        disable_balance: false,
        hcaptcha_sitekey: process.env.HCAPTCHA_SITEKEY || 'your-hcaptcha-sitekey',
        microwallet: 'faucetpay',
        top_ads: '',
        middle_ads: '',
        left_ads: '',
        right_ads: '',
        bottom_ads: '',
        paid_box: '',
        css: '',
        navlinks: '<a href="/about">About</a>',
        ...data
    };
}

async function getReward(reward, type) {
    const [min, max] = reward.split('-').map(Number);
    if (type === 'list') return `${min}-${max} satoshi`;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getToken() {
    return Math.random().toString(36).substr(2, 12);
}

function checkToken(token) {
    return !!token; // Validasi sederhana, tambahkan logika lebih ketat jika perlu
}

async function checkAddress(address, message) {
    if (!address || address.length < 11 || address.length > 110 || !/^[a-zA-Z0-9- ]+$/.test(address)) {
        message = 'Invalid address format';
        return false;
    }
    return true; // Tambahkan validasi API microwallet jika diperlukan
}

async function getShortlink(req, res) {
    const settings = await getSettings();
    const sldata = await getShortlinks();
    const link = sldata.data[Math.floor(Math.random() * Object.keys(sldata.data).length)];
    await supabase.from('sessions').update({ shortlink: { link: link.apilink.replace('{apikey}', settings.api_key).replace('{url}', settings.domain) } }).eq('faucet_id', faucetID);
    return true;
}

async function checkShortlink(req) {
    const { data: session } = await supabase.from('sessions').select('shortlink').eq('faucet_id', faucetID).single();
    return !!session.shortlink; // Validasi sederhana, tambahkan logika lebih ketat jika perlu
}

async function sendPayout(req, message) {
    const { data: session } = await supabase.from('sessions').select('user').eq('faucet_id', faucetID).single();
    const settings = await getSettings();
    const amount = await getReward(settings.reward, 'single');
    
    // Simulasi pengiriman ke microwallet
    const response = { success: true }; // Ganti dengan panggilan API microwallet
    if (response.success) {
        await supabase.from(`payouts_${faucetID}`).insert({
            address: session.user.address,
            reward: amount,
            timestamp: new Date().toISOString(),
            type: 'claim'
        });
        return true;
    }
    message = 'Payout failed';
    return false;
}

async function checkLastClaim(req) {
    const { data } = await supabase.from(`payouts_${faucetID}`).select('timestamp').eq('type', 'claim').order('timestamp', { ascending: false }).limit(1);
    if (!data.length) return true;
    const last = new Date(data[0].timestamp);
    const now = new Date();
    const diff = (now - last) / 60000; // Menit
    const timer = (await getSettings()).timer;
    return diff >= timer ? true : Math.ceil(timer - diff);
}

async function IPchange(req, message) {
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    const { data: session } = await supabase.from('sessions').select('ip').eq('faucet_id', faucetID).single();
    if (!session.ip) {
        await supabase.from('sessions').update({ ip }).eq('faucet_id', faucetID);
        return true;
    }
    if (session.ip !== ip) {
        message = 'IP address changed';
        return false;
    }
    return true;
}

async function isProxy(req) {
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    return false; // Tambahkan logika deteksi proxy jika diperlukan
}

async function getShortlinks() {
    let sldata = await cache.driver_get('sldata');
    if (!sldata || sldata.updated < Date.now() / 1000 - 7200) {
        sldata = { data: { '10000': { id: '10000', name: 'Example', apilink: 'https://example.com/api?api={apikey}&url={url}', views: '1', cpm: '11.00', status: 'Y' } }, updated: Date.now() / 1000 };
        await cache.driver_set('sldata', sldata, 86400);
    }
    return sldata;
}

module.exports = { getSettings, getReward, getToken, checkToken, checkAddress, getShortlink, checkShortlink, sendPayout, checkLastClaim, IPchange, isProxy, getShortlinks };