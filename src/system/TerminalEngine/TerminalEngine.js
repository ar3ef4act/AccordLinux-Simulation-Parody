import { commandRegistry } from './CommandRegistry';
import { parseCommand } from './Parser';
import { resolvePath } from './utils/PathUtils.js';
import { runLogic } from './utils/gcc/gcc-logic.js';

export class TerminalEngine {
    constructor(system) {
        this.system = system;
    }

    async execute(input, onOutput, execOptions = {}) {
        const parsed = parseCommand(input);

        if (!parsed) {
            return {
                type: 'output',
                content: ''
            };
        }

        const { command, args } = parsed;

        // Support running executables/files directly (e.g. ./hello.elf, ./hello.c, or /bin/command)
        if (command.startsWith('./') || command.startsWith('/')) {
            const state = this.system.getState();
            const resolved = resolvePath(state.cwd, command);
            const file = state.vfs[resolved];

            if (!file) {
                return {
                    type: 'error',
                    content: `bash: ${command}: No such file or directory`
                };
            }

            if (file.type === 'dir') {
                return {
                    type: 'error',
                    content: `bash: ${command}: Is a directory`
                };
            }

            const content = file.content || '';

            // 1. ELF executable file
            if (content.startsWith('ELF_EXECUTABLE_MAGIC_FLAG')) {
                const lines = content.split('\n');
                const typeLine = lines.find(l => l.startsWith('TYPE='));
                const isLogic = typeLine ? typeLine.substring('TYPE='.length) === 'LOGIC' : false;

                if (isLogic) {
                    const startIndex = content.indexOf('STDOUT_LOG=');
                    const stdout = startIndex !== -1 ? content.substring(startIndex + 'STDOUT_LOG='.length) : '';
                    return {
                        type: 'output',
                        content: stdout
                    };
                } else {
                    const driverLine = lines.find(l => l.startsWith('DRIVER='));
                    const driverName = driverLine ? driverLine.substring('DRIVER='.length) : 'unknown';
                    return {
                        type: 'output',
                        content: `Driver '${driverName}' executed successfully (no stdout).`
                    };
                }
            }

            // 2. C source file (run on-the-fly)
            if (command.endsWith('.c') || file.extension === 'c') {
                const result = runLogic(content);
                if (!result.success) {
                    return {
                        type: 'error',
                        content: `bash: runtime error in ${command}:\n${result.error}`
                    };
                }
                const printLines = result.output.join('');
                return {
                    type: 'output',
                    content: printLines || '(no output)'
                };
            }

            return {
                type: 'error',
                content: `bash: ${command}: Permission denied (not an executable ELF or C source file)`
            };
        }

        const commandHandler = commandRegistry[command];
        if (!commandHandler) {
            return {
                type: 'error',
                content: `${command}: command not found`
            };
        }
        return await commandHandler({
            system: this.system,
            args,
            onOutput,
            execOptions
        });
    }
}