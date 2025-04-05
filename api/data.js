const { createClient } = require('@supabase/supabase-js');
const { getSettings, getReward, getToken } = require('./faucet');
const { microwallets, currencies } = require('./microwallets');
const { alert } = require('./utils');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY');
    throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const faucetID = 'watchltc';

module.exports = async (req, res) => {
    try {
        // Cek koneksi Supabase
        const { data: testConnection, error: testError } = await supabase.from('settings_watchltc').select('name').limit(1);
        if (testError) {
            console.error('Supabase connection error:', testError);
            throw new Error('Failed to connect to Supabase: ' + testError.message);
        }

        // Ambil pengaturan
        const settings = await getSettings();
        if (!settings) {
            throw new Error('Failed to load settings');
        }

        // Ambil atau buat sesi
        let { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('faucet_id', faucetID)
            .single();

        if (sessionError) {
            console.error('Session fetch error:', sessionError);
            throw new Error('Failed to fetch session: ' + sessionError.message);
        }

        if (!session) {
            session = {
                faucet_id: faucetID,
                status: 'login',
                user: null,
                message: '',
                hash: Math.random().toString(36).substr(2, 12)
            };
            const { error: insertError } = await supabase.from('sessions').insert(session);
            if (insertError) {
                console.error('Session insert error:', insertError);
                throw new Error('Failed to create session: ' + insertError.message);
            }
        }

        // Validasi pengaturan
        if (!settings.api_key || !settings.reward || !settings.timer) {
            session.message = alert('<i class="fas fa-exclamation-triangle"></i> A GR8 Faucet is being made, come back soon!', 'warning');
        } else if (settings.status === 'N') {
            session.message = alert('<i class="fas fa-exclamation-triangle"></i> Sorry our faucet is not active, please come back later.', 'danger');
        } else if (!session.user) {
            session.status = 'login';
        }

        // Update sesi
        const { error: updateError } = await supabase.from('sessions').upsert(session);
        if (updateError) {
            console.error('Session update error:', updateError);
            throw new Error('Failed to update session: ' + updateError.message);
        }

        // Ambil data lain
        const currencyName = currencies[settings.currency] || settings.currency;
        const navlinks = settings.navlinks ? settings.navlinks.replace(/<a/g, '<a class="nav-item nav-link"') : '';
        const rewardList = await getReward(settings.reward, 'list');
        const token = await getToken();

        // Ambil data payouts
        const { data: payouts, error: payoutsError } = await supabase
            .from(`payouts_${faucetID}`)
            .select('address, reward, timestamp')
            .eq('type', 'claim')
            .order('id', { ascending: false })
            .limit(10);

        if (payoutsError) {
            console.error('Payouts fetch error:', payoutsError);
            throw new Error('Failed to fetch payouts: ' + payoutsError.message);
        }

        // Kirim respons
        res.status(200).json({
            settings,
            session,
            currencyName,
            navlinks,
            rewardList,
            token,
            microwallet: microwallets[settings.microwallet] || microwallets.faucetpay,
            payouts: payouts || []
        });
    } catch (error) {
        console.error('API error:', error.message);
        res.status(500).json({
            error: 'Internal server error: ' + error.message,
            settings: { name: 'Error', currency: 'LTC', balance: 0 },
            session: { status: 'login', user: null, message: alert('Server error, please try again.', 'danger') }
        });
    }
};
