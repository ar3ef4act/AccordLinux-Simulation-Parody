import { resolvePath } from "../utils/PathUtils.js";

export async function pwdCommand({ system, args }) {
    const state = system.getState();
    const { cwd } = state;
    const target = args[0] ? resolvePath(cwd, args[0]) : cwd;

    if (!state.vfs[target]) {
        return { type: 'error', content: `pwd: cannot access '${args[0]}': No such file or directory` };
    }

    return { type: 'output', content: target };
}