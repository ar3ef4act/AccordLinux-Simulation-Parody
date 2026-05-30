export async function hwCommand({ system, args }) {
    const state = system.getState();
    const { hardwareState } = state;

    let output = "Hardware Connection Status (Physical Layer):\n";
    output += "─────────────────────────────────────────────\n";
    Object.entries(hardwareState).forEach(([device, info]) => {
        const connected = info.enable ? "● CONNECTED" : "○ DISCONNECTED";
        let extra = "";
        if (device === 'router' && info.gateway) {
            extra = `  gateway=${info.gateway}`;
        }
        output += `  ${device.padEnd(22)} ${connected}${extra}\n`;
    });
    return { type: 'output', content: output.trim() };
}
