const dns = require('dns');
const net = require('net');

const hostname = 'db.usxhrysshvccnnklhiki.supabase.co';
const port = 5432;

console.log(`Resolving ${hostname}...`);

dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) {
        console.error('DNS lookup failed:', err);
        return;
    }
    console.log('Addresses:', addresses);

    addresses.forEach((addr) => {
        console.log(`Testing connection to ${addr.address}:${port}...`);
        const socket = new net.Socket();
        const start = Date.now();

        socket.setTimeout(5000);

        socket.on('connect', () => {
            console.log(`✅ Connected to ${addr.address} in ${Date.now() - start}ms`);
            socket.destroy();
        });

        socket.on('timeout', () => {
            console.log(`❌ Timeout connecting to ${addr.address}`);
            socket.destroy();
        });

        socket.on('error', (err) => {
            console.log(`❌ Error connecting to ${addr.address}: ${err.message}`);
        });

        socket.connect(port, addr.address);
    });
});
