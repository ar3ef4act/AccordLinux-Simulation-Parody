function parseAccord(text) {
    const result = {};
    const stack = [result];
    let current = result;

    const tokens = text.match(/([a-zA-Z0-9_]+)|(=)|(\{)|(\})|(".*?")|('.*?')|(;)/g);
    if (!tokens) return result;

    let key = null;
    for (const token of tokens) {
        if (token === '=' || token === ';') continue;
        if (token === '{') {
            const newObj = {};
            if (key) { current[key] = newObj; stack.push(newObj); current = newObj; key = null; }
        } else if (token === '}') {
            stack.pop();
            current = stack[stack.length - 1];
        } else if (!key) {
            key = token;
        } else {
            let val = token.replace(/^["']|["']$/g, '');
            if (val === 'true') val = true;
            if (val === 'false') val = false;
            if (typeof val === 'string' && !isNaN(val) && val.trim() !== '') val = Number(val);
            current[key] = val;
            key = null;
        }
    }
    return result;
}

export async function accordSystemCommand({ system, args }) {
    const state = system.getState();
    const { generations, systemRebuild, switchGeneration, currentGeneration, vfs } = state;

    if (args.length === 0) {
        return {
            type: 'output',
            content: 'Usage: accord-system [ rebuild | list-generation | rebuild switch <n> ]',
        };
    }

    const sub = args[0];

    // ── rebuild ───────────────────────────────────────────────────────────────
    if (sub === 'rebuild') {

        if (args[1] === 'switch') {
            const genId = parseInt(args[2]);
            if (isNaN(genId) || genId < 1 || genId > generations.length) {
                return { type: 'error', content: `accord-system: invalid generation ID: ${args[2]}` };
            }
            switchGeneration(genId - 1);
            return { type: 'output', content: `accord-system: switched to generation ${genId}.` };
        }

        const configPath = '/etc/accord/configuration.accord';
        const configFile = vfs[configPath];
        if (!configFile) {
            return { type: 'error', content: `accord-system: fatal: ${configPath} not found` };
        }

        const configObj = parseAccord(configFile.content || '');
        const newGen = systemRebuild(configObj);
        const hwConfig = configObj.hardware || {};

        let output = `parsing ${configPath}...\n`;
        output += `building system derivation...\n`;

        // Path warning
        for (const [key, module] of Object.entries(hwConfig)) {
            if (module.src?.trim() && !module.src.startsWith('/src/ABAL')) {
                output += `[WARNING] '${key}': driver path '${module.src}' is outside recommended /src/ABAL/\n`;
            }
        }

        // Pisahkan log hardware (physical) dan software
        const hwLog  = newGen.rebuildLog.filter(e => e.isPhysical && e.key !== 'network');
        const swLog  = newGen.rebuildLog.filter(e => !e.isPhysical && e.key !== 'network');
        const netLog = newGen.rebuildLog.find(e => e.key === 'network');

        const formatEntry = (entry) => {
            const icon = entry.status ? '✓' : entry.hash?.warnings?.length ? '!' : '✗';
            let line = `  [${icon}] ${entry.key.padEnd(22)} ${entry.reason}\n`;
            if (entry.hash?.warnings?.length) {
                for (const w of entry.hash.warnings) {
                    line += `       └─ debug: ${w}\n`;
                }
            }
            return line;
        };

        if (hwLog.length) {
            output += `\nhardware (physical):\n`;
            for (const entry of hwLog) output += formatEntry(entry);
        }
        if (swLog.length) {
            output += `\nsoftware (driver):\n`;
            for (const entry of swLog) output += formatEntry(entry);
        }
        if (netLog) {
            output += `\nnetwork:\n`;
            output += formatEntry(netLog);
        }

        output += `\ngenerating /etc/accord/active.accord...\n`;
        output += `writing /var/log/accord/hardware.log...\n`;
        output += `\nsystem configured — Generation ${newGen.id} active.`;

        return { type: 'output', content: output };
    }

    // ── list-generation ───────────────────────────────────────────────────────
    if (sub === 'list-generation') {
        if (generations.length === 0) {
            return { type: 'output', content: 'accord-system: no generations recorded.' };
        }

        let output = 'System Generations:\n';
        output += 'ID  DATE/TIME              USER          ACTIVE\n';
        output += '--- ---------------------  ------------  ------\n';

        for (const gen of generations) {
            const cur = gen.id === currentGeneration ? '*' : ' ';
            const date = gen.timestamp.padEnd(21);
            const user = (gen.user || 'player').padEnd(12);
            const active = Object.values(gen.systemStatus).filter(Boolean).length;
            const total = Object.keys(gen.systemStatus).length;
            output += `${cur} ${String(gen.id).padEnd(2)} ${date}  ${user}  ${active}/${total}\n`;
        }

        return { type: 'output', content: output.trim() };
    }

    return { type: 'error', content: `accord-system: unknown subcommand '${sub}'` };
}