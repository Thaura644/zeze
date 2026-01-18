const Redis = require('ioredis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const redisUrl = process.env.REDIS_URL;
console.log('Testing Redis connection to:', redisUrl ? 'URL provided' : 'localhost');

let redis;
if (redisUrl) {
    try {
        const url = new URL(redisUrl);
        const config = {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password,
            username: url.username || 'default',
            tls: url.protocol === 'rediss:' ? {} : false,
            connectTimeout: 10000
        };
        console.log('Parsed config:', { ...config, password: '****' });
        redis = new Redis(config);
    } catch (e) {
        console.error('Failed to parse URL:', e.message);
        process.exit(1);
    }
} else {
    redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 10000
    });
}

redis.on('connect', () => console.log('Connected!'));
redis.on('ready', () => {
    console.log('Ready!');
    redis.ping().then(res => {
        console.log('Ping response:', res);
        process.exit(0);
    }).catch(err => {
        console.error('Ping failed:', err.message);
        process.exit(1);
    });
});
redis.on('error', (err) => {
    console.error('Redis Error:', err.message);
    // process.exit(1); // Don't exit immediately, wait for timeout if it's ECONNREFUSED
});

setTimeout(() => {
    console.log('Timeout reached');
    process.exit(1);
}, 15000);
