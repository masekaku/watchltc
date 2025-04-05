function getIP(req) {
    return req.headers['x-forwarded-for'] || 'unknown';
}

function alert(message, type) {
    return `<div class="alert alert-${type}">${message}</div>`;
}

function redirect(res, url) {
    res.setHeader('Location', url);
    res.status(302).end();
}

function randHash(length) {
    return Math.random().toString(36).substr(2, length);
}

module.exports = { getIP, alert, redirect, randHash };
