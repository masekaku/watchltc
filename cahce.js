const cache = {};

async function driver_get(key) {
    return cache[key];
}

async function driver_set(key, value, ttl) {
    cache[key] = value;
}

module.exports = { driver_get, driver_set };