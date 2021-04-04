const redis = require('../config/redis').getConnection();
const { EXPIRED_TIME_REDIS } = require('../settings');

/**
 * Use method hgetall, get value of key
 * @param {String} key key for finding value.
 */
exports.hgetallCache = async (key) => {
    const reply = await redis.hgetall(key);
    if(reply !== null){
        const data = reply['data'];
        return JSON.parse(data);
    }
    else
        return null;
};

/**
 * Use method hset, cache key-value
 * @param {String} key key to cache value.
 * @param {Object} value value to cache, will be stringify in this function.
 * @param {Number} expired time to live, default is 300s, expired -1 means won't be expired.
 */
exports.hsetCache = async (key, value, expired) => {
    await redis.hset(key, 'data', JSON.stringify(value));
    if(expired !== -1){
        await redis.expire(key, expired || EXPIRED_TIME_REDIS);
    }
};