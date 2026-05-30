export async function swCommand({ system, args }) {
    const state = system.getState();
    const { systemStatus, interfaces } = state;

    let output = "System Software Status (systemStatus):\n";
    output += "─────────────────────────────────────────────\n";
    Object.entries(systemStatus).forEach(([key, value]) => {
        const icon = value ? "✓" : "✗";
        const label = value ? "ACTIVE" : "INACTIVE";
        output += `  [${icon}] ${key.padEnd(22)} ${label}\n`;
    });
    output += "─────────────────────────────────────────────\n";

    // Also show network interface state for quick reference
    output += "\nNetwork Interfaces:\n";
    Object.entries(interfaces).forEach(([name, info]) => {
        const status = info.up ? "UP" : "DOWN";
        const addr = info.addr || "no address";
        output += `  ${name.padEnd(8)} ${status.padEnd(6)} ${addr}\n`;
    });

    return { type: 'output', content: output.trim() };
}
