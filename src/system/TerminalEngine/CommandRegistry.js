import { lsCommand } from './bash/ls.js';
import { cdCommand } from './bash/cd.js';
import { clearCommand } from './bash/clear.js';
import { helpCommand } from './bash/help.js';
import { catCommand } from './bash/cat.js';
import { mkdirCommand } from './bash/mkdir.js';
import { rmCommand } from './bash/rm.js';
import { mvCommand } from './bash/mv.js';
import { cpCommand } from './bash/cp.js';
import { touchCommand } from './bash/touch.js';
import { echoCommand } from './bash/echo.js';
import { pwdCommand } from './bash/pwd.js';
import { viCommand } from './bash/vi.js';
import { gccCommand } from './bash/gcc.js';
import { ipCommand } from './bash/ip.js';
import { accordSystemCommand } from './bash/accord-system.js';
import { hwCommand } from './bash/hw.js';
import { pingCommand } from './bash/ping.js';
import { swCommand } from './bash/sw.js';
import { curlCommand } from './bash/curl.js';
import { runGamesCommand } from './bash/run-games.js';

export const commandRegistry = {
    ls: lsCommand,
    cd: cdCommand,
    clear: clearCommand,
    help: helpCommand,
    cat: catCommand,
    mkdir: mkdirCommand,
    rm: rmCommand,
    mv: mvCommand,
    cp: cpCommand,
    touch: touchCommand,
    echo: echoCommand,
    pwd: pwdCommand,
    vi: viCommand,
    gcc: gccCommand,
    ip: ipCommand,
    'accord-system': accordSystemCommand,
    'system-rebuild': (ctx) => accordSystemCommand({ ...ctx, args: ['rebuild'] }),
    'viconfac': (ctx) => viCommand({ ...ctx, args: ['/etc/accord/configuration.accord'] }),
    hw: hwCommand,
    sw: swCommand,
    ping: pingCommand,
    curl: curlCommand,
    'run-games': runGamesCommand,
};