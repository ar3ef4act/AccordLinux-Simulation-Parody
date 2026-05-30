export async function ipCommand({ system, args }) {
    const state = system.getState();
    const { interfaces, setInterfaceState, setInterfaceAddr } = state;

    if (args.length === 0) {
        return { type: 'error', content: 'Usage: ip [ addr | link ] [ show | set | add | del ]' };
    }

    const sub = args[0];

    // --- ip addr (a) ---
    if (sub === 'addr' || sub === 'a') {
        const action = args[1] || 'show';

        if (action === 'show' || action === 'sh' || args.length === 1) {
            let output = "";
            Object.entries(interfaces).forEach(([name, info], index) => {
                const status = info.up ? 'UP' : 'DOWN';
                output += `${index + 1}: ${name}: <BROADCAST,MULTICAST,${status}>\n`;
                output += `    link/ether ${info.mac} brd ff:ff:ff:ff:ff:ff\n`;
                if (info.addr) {
                    output += `    inet ${info.addr}/24 brd 255.255.255.255 scope global ${name}\n`;
                }
            });
            return { type: 'output', content: output.trim() };
        }

        if (action === 'add' || action === 'del') {
            const addr = args[2];
            const devIndex = args.indexOf('dev');
            const iface = devIndex !== -1 ? args[devIndex + 1] : null;

            if (!iface || !interfaces[iface]) {
                return { type: 'error', content: 'ip addr: missing or invalid device' };
            }

            if (action === 'add') {
                // Validate addr format: expect IPv4 with optional /prefix
                const m = typeof addr === 'string' ? addr.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})(?:\/(\d{1,2}))?$/) : null;
                if (!m) return { type: 'error', content: 'ip addr: invalid address format — use x.x.x.x[/prefix]' };

                const ipStr = m[1];
                const prefix = m[2] ? parseInt(m[2], 10) : 24;

                const ipToInt = (ip) => ip.split('.').reduce((acc, b) => (acc << 8) + Number(b), 0) >>> 0;
                const maskFromPrefix = (p) => p === 0 ? 0 : (~0 << (32 - p)) >>> 0;

                // If router gateway available, ensure provided IP is in same subnet
                const gateway = state.hardwareState?.router?.gateway;
                if (gateway) {
                    // basic validation of gateway format
                    const gm = gateway.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})$/);
                    if (gm) {
                        const ipInt = ipToInt(ipStr);
                        const gwInt = ipToInt(gm[1]);
                        const mask = maskFromPrefix(Math.min(Math.max(prefix, 0), 32));
                        const netIp = ipInt & mask;
                        const netGw = gwInt & mask;
                        if (netIp !== netGw) {
                            console.warn(`[WARNING] Address ${ipStr}/${prefix} is not in the same subnet as gateway ${gm[1]}/${prefix}.`)
                            return {
                                type: 'error',
                                content: `[WARNING] Address ${ipStr}/${prefix} is not in the same subnet as gateway ${gm[1]}/${prefix}.\n` +
                                    'Choose an address within the same network as the gateway.'
                            };
                        }
                        if (ipStr === gateway) {
                            return {
                                type: 'error',
                                content: `[WARNING] Address ${ipStr}/${prefix} is the same as gateway ${gm[1]}/${prefix}.\n` +
                                    'Choose an address within the same network as the gateway.'
                            };
                        }
                    }
                }

                // store address; if prefix provided, save both addr and prefix
                if (m[2]) {
                    // set addr and prefix together
                    state.setInterfaceNetwork(iface, ipStr, prefix);
                } else {
                    state.setInterfaceAddr(iface, ipStr);
                }
            } else {
                if (addr) {
                    const currentAddr = interfaces[iface].addr;
                    const providedIp = addr.split('/')[0];
                    if (currentAddr !== providedIp) {
                        return { type: 'error', content: `ip addr: cannot delete ${addr}, address does not match ${currentAddr || 'none'}` };
                    }
                }
                state.clearInterfaceAddr(iface);
            }
            return { type: 'output', content: '' };
        }
    }

    // --- ip link ---
    if (sub === 'link') {
        const action = args[1];
        if (action === 'set') {
            const iface = args[2];
            const statusCmd = args[3];

            if (!interfaces[iface]) {
                return { type: 'error', content: `ip link: device ${iface} not found` };
            }

            if (statusCmd === 'up') {
                const { systemStatus } = state;
                if (iface === 'eth0' && systemStatus.lan === false) {
                    let warn = "[WARNING] Physical connection issue detected.\n";
                    warn += "- LAN cable is NOT connected.\n";
                    warn += "Interface state will be set, but link may not be operational.";
                    setInterfaceState(iface, true);
                    return { type: 'output', content: warn };
                }
                setInterfaceState(iface, true);
            } else if (statusCmd === 'down') {
                setInterfaceState(iface, false);
                state.clearInterfaceAddr(iface);
            } else {
                return { type: 'error', content: `ip link: unknown status ${statusCmd}` };
            }
            return { type: 'output', content: '' };
        }
    }

    return { type: 'error', content: `ip: unknown subcommand or syntax error` };
}
