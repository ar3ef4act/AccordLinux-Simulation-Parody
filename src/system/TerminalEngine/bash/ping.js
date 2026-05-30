import { internetPointer } from '../../internet/pointer';

function randomLatency(base, jitter) {
    return (base + Math.random() * jitter).toFixed(3);
}

export function pingCommand({ system, args }) {
    const state = system.getState();
    const { interfaces, systemStatus, hardwareState } = state;

    let host = null;
    let count = 4;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-c' && args[i + 1]) {
            count = parseInt(args[i + 1]);
            if (isNaN(count) || count < 1) {
                return { type: 'error', content: 'ping: invalid count' };
            }
            i++;
        } else if (!args[i].startsWith('-')) {
            host = args[i];
        }
    }

    if (!host) {
        return { type: 'error', content: 'Usage: ping [-c count] <host>' };
    }

    const lo = interfaces.lo;
    const eth0 = interfaces.eth0;
    const lanConnected = systemStatus.lan && hardwareState.router.enable;
    const gateway = hardwareState.router.gateway ?? '192.168.10.1';
    const lanUp = !!lanConnected;

    // Build known external hosts from internet manifest (plus google.com)
    const externalHosts = new Set();
    try {
        Object.keys(internetPointer).forEach(u => {
            try {
                const h = new URL(u).hostname.replace(/^www\./, '');
                if (h) externalHosts.add(h);
            } catch (e) {
                // ignore
            }
        });
    } catch (e) {
        // ignore
    }
    externalHosts.add('google.com');

    // Resolusi host
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const isGateway = host === gateway || host === 'gateway';
    const isSelf = eth0.addr && host === eth0.addr;

    // Cek konektivitas
    let reachable = false;
    let resolvedIP = host;
    let via = 'eth0';
    let baseLatency = 10;

    // Output buffer (declare early to avoid TDZ when reporting unknown hosts)
    const lines = [];

    if (isLocalhost) {
        reachable = true;
        resolvedIP = '127.0.0.1';
        via = 'lo';
        baseLatency = 0.05;
    } else if (isSelf) {
        reachable = true;
        resolvedIP = eth0.addr;
        via = 'eth0';
        baseLatency = 0.1;
    } else if (isGateway) {
        reachable = lanUp && eth0.up && !!eth0.addr;
        resolvedIP = gateway;
        baseLatency = 1;
    } else {
        // only allow pinging known external hosts (from internetPointer or google.com)
        const normalized = host.replace(/^www\./, '');
        if (!externalHosts.has(normalized)) {
            lines.push(`ping: unknown host ${host}`);
            return { type: 'output', content: lines.join('\n') };
        }
        reachable = lanUp && eth0.up && !!eth0.addr;
        baseLatency = 12;
    }
    lines.push(`PING ${host} (${resolvedIP}): 56 data bytes sent`);

    if (!reachable) {
        // Tentukan pesan error yang tepat
        if (!lanUp) {
            lines.push(`ping: Network is unreachable — LAN cable not connected`);
        } else if (!eth0.up) {
            lines.push(`ping: Network is unreachable — eth0 is down`);
        } else if (!eth0.addr) {
            lines.push(`ping: Network is unreachable — no IP address on eth0`);
        } else {
            lines.push(`ping: No route to host`);
        }
        return { type: 'output', content: lines.join('\n') };
    }

    // Simulasi reply
    const rtts = [];
    for (let i = 0; i < count; i++) {
        const rtt = randomLatency(baseLatency, baseLatency * 0.3);
        rtts.push(parseFloat(rtt));
        lines.push(`64 bytes from ${resolvedIP}: icmp_seq=${i} ttl=64 time=${rtt} ms`);
    }

    // Statistik
    const min = Math.min(...rtts).toFixed(3);
    const max = Math.max(...rtts).toFixed(3);
    const avg = (rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(3);
    lines.push('');
    lines.push(`--- ${host} ping statistics ---`);
    lines.push(`${count} packets transmitted, ${count} received, 0% packet loss`);
    lines.push(`rtt min/avg/max = ${min}/${avg}/${max} ms`);

    return { type: 'output', content: lines.join('\n') };
}