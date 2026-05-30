import { resolvePath } from '../utils/PathUtils.js';
import gccConfig from '../utils/gcc/gcc-c-js-order.json' with { type: 'json' };
import { checkSyntax } from '../utils/gcc/gcc-check-syntax.js';
import { findKeys } from '../utils/gcc/gcc-key-find.js';
import { compareLogic, hashField } from '../utils/gcc/gcc-compare.js';
import { runLogic } from '../utils/gcc/gcc-logic.js';

// Deteksi apakah file adalah driver (mengandung struct, init_configuration, dan main)
function isDriverFile(content) {
    const hasStruct = /struct\s+(hardware|software)/.test(content);
    const hasInitConfig = /init_configuration/.test(content);
    const hasMain = /int\s+main\s*\(/.test(content) || /main\s*\(/.test(content);
    return hasStruct && hasInitConfig && hasMain;
}

// ── Official headers set ───────────────────────────────────────────────────────
// Build the set of all "official" system headers the compiler knows about.
// Any --inc header NOT in this set is treated as a "linking header".

function getOfficialHeaders() {
    const officials = new Set(['stdio.h', 'driver.h', 'accord.h']);
    // Add headers from required_includes (audio.h, graphic.h, multithread.h, etc.)
    const includeRules = gccConfig.required_includes || {};
    for (const header of Object.values(includeRules)) {
        officials.add(header);
    }
    return officials;
}

// ── Linking header resolution ──────────────────────────────────────────────────
// If a --inc header is not an official header, we treat it as a "linking header".
// We read its content from the VFS, parse its #include directives, and resolve
// each referenced header transitively. This allows players to do:
//   gcc driver.c -o driver.elf --inc ./merge.h
// instead of:
//   gcc driver.c -o driver.elf --inc ./driver.h --inc ./accord.h --inc ./graphic.h

function resolveLinkingHeaders(incPaths, state) {
    const officialHeaders = getOfficialHeaders();
    const resolvedPaths = [];
    const errors = [];

    for (const incFile of incPaths) {
        const basename = incFile.split('/').pop();

        if (officialHeaders.has(basename)) {
            // Official header — pass through as-is
            resolvedPaths.push(incFile);
            continue;
        }

        // Not official — treat as linking header
        const resolvedInc = resolvePath(state.cwd, incFile);
        const incNode = state.vfs[resolvedInc];

        if (!incNode) {
            errors.push(`${incFile}: No such file or directory (linking header)`);
            continue;
        }

        const linkContent = incNode.content || '';

        // Parse #include directives from the linking header
        const linkedIncludes = [...linkContent.matchAll(/#include\s*[<"]([^>"]+)[>"]/g)]
            .map(m => m[1]);

        if (linkedIncludes.length === 0) {
            errors.push(
                `${incFile}: linking header contains no #include directives.\n` +
                `  A linking header must reference at least one official header.`
            );
            continue;
        }

        // Resolve each linked include — look for files matching the basename in the VFS
        for (const linkedHeader of linkedIncludes) {
            // Find the file in VFS by scanning for a matching basename
            const parentDir = resolvedInc.substring(0, resolvedInc.lastIndexOf('/'));
            const candidatePath = parentDir + '/' + linkedHeader;

            if (state.vfs[candidatePath]) {
                resolvedPaths.push(candidatePath);
            } else {
                // Also try resolving relative to cwd
                const cwdCandidate = resolvePath(state.cwd, linkedHeader);
                if (state.vfs[cwdCandidate]) {
                    resolvedPaths.push(cwdCandidate);
                } else {
                    errors.push(
                        `${incFile}: linking resolution failed — referenced header '${linkedHeader}' not found in VFS.\n` +
                        `  Searched: ${candidatePath}\n` +
                        `  Searched: ${cwdCandidate}`
                    );
                }
            }
        }
    }

    return { resolvedPaths, errors };
}

// ── Compile driver ─────────────────────────────────────────────────────────────

async function compileDriver(inputFilename, outputFilename, content, state, incPaths = []) {
    const resolvedOutput = resolvePath(state.cwd, outputFilename);

    // ── Linking header resolution ────────────────────────────────────────────
    // Resolve any linking headers (non-official) into their constituent includes.
    const linkResult = resolveLinkingHeaders(incPaths, state);
    if (linkResult.errors.length > 0) {
        return {
            type: 'error',
            content:
                `gcc: linking header resolution error:\n` +
                linkResult.errors.map(e => `  ${e}`).join('\n') +
                `\ncompilation terminated.`,
        };
    }

    // Use the resolved paths (linking headers expanded into official headers)
    const effectiveIncPaths = linkResult.resolvedPaths;

    // ── --inc validation ─────────────────────────────────────────────────────
    // 1. Cek semua #include di kode (kecuali stdio.h) harus ada di --inc
    // 2. Cek semua --inc file ada di VFS

    // Kumpulkan semua #include dari kode, kecuali stdio.h
    const codeIncludes = [...content.matchAll(/#include\s*[<"]([^>"]+)[>"]/g)]
        .map(m => m[1])
        .filter(h => h !== 'stdio.h');

    // Basename dari incPaths — now includes resolved linking headers
    const incBasenames = effectiveIncPaths.map(p => p.split('/').pop());

    // Cek setiap #include di kode ada di --inc
    const missingInc = codeIncludes.filter(h => !incBasenames.includes(h));
    if (missingInc.length > 0) {
        return {
            type: 'error',
            content:
                `gcc: error: missing --inc for included headers:\n` +
                missingInc.map(h => `  ${inputFilename}: #include <${h}> — pass with: --inc <path/to/${h}>`).join('\n') +
                `\ncompilation terminated.`,
        };
    }

    // Cek semua --inc file ada di VFS
    const incErrors = [];
    for (const incFile of effectiveIncPaths) {
        const resolvedInc = resolvePath(state.cwd, incFile);
        const incNode     = state.vfs[resolvedInc];
        if (!incNode) {
            incErrors.push(`${incFile}: No such file or directory`);
        }
    }
    if (incErrors.length > 0) {
        return {
            type: 'error',
            content:
                `gcc: --inc error: file not found:\n` +
                incErrors.map(e => `  ${e}`).join('\n') +
                `\ncompilation terminated.`,
        };
    }

    // [1/3] Syntax check
    console.log(`gcc: [1/3] Checking syntax of '${inputFilename}'...`);
    const syntaxResult = checkSyntax(content, gccConfig.syntax_rules);
    if (!syntaxResult.success) {
        return {
            type: 'error',
            content:
                `gcc: [1/3] Syntax errors found:\n` +
                syntaxResult.errors.map(e => `${inputFilename}: ${e}`).join('\n') +
                `\ncompilation terminated.`
        };
    }

    // [2/3] Extract struct fields
    console.log(`gcc: [2/3] Extracting struct hardware fields...`);
    const keyResult = findKeys(content);
    if (keyResult.missing.length > 0) {
        return {
            type: 'error',
            content:
                `gcc: [2/3] Missing required fields:\n` +
                keyResult.missing.map(f => `${inputFilename}: undefined required field '${f}'`).join('\n') +
                `\ncompilation terminated.`
        };
    }

    // [3/3] SCCC
    console.log(`gcc: [3/3] Running System-Compile-Compatibility-Checker (SCCC)...`);
    const fv = keyResult.foundValues;
    const hwName = fv.HARDWARE || fv.SOFTWARE;
    let requiredHeader = null;
    let hasHeader = false;

    const includeRules = gccConfig.required_includes || {};
    if (includeRules[hwName]) {
        requiredHeader = includeRules[hwName];
        const escaped = requiredHeader.replace(/\./g, '\\.');
        // Check if the required header is directly in the source code
        hasHeader = new RegExp(`#include\\s*[<"]${escaped}[>"]`).test(content);
        // Also check if it was resolved transitively via a linking header
        if (!hasHeader) {
            hasHeader = incBasenames.includes(requiredHeader);
        }
    }
    if (requiredHeader && !hasHeader) {
        return {
            type: 'error',
            content:
                `gcc: [3/3] SCCC: FAILED\n` +
                `${inputFilename}: missing required header file <${requiredHeader}> for '${hwName}' driver.\n` +
                `compilation terminated.`
        };
    }

    const compareResult = compareLogic(keyResult.foundValues);
    if (!compareResult.valid) {
        return {
            type: 'error',
            content:
                `gcc: [3/3] SCCC: FAILED\n` +
                compareResult.failures.join('\n') +
                `\ncompilation terminated.`
        };
    }

    // Build ELF dynamically based on metadata requirements
    const metadataKey = fv._metadataKey;
    const isHardware = fv.HARDWARE !== undefined;
    
    const baseConfig = gccConfig.metadata[isHardware ? 'HARDWARE' : 'SOFTWARE'] || [];
    const baseFields = baseConfig.filter(f => typeof f === 'string');
    
    const specificConfig = gccConfig.metadata[metadataKey] || {};
    const attrFields = specificConfig.attribute || [];
    const accordAddedFields = specificConfig.accord_added || [];

    const elfLines = [`ELF_EXECUTABLE_MAGIC_FLAG`];

    // Append regular fields
    const allFields = [...baseFields, ...attrFields, ...accordAddedFields];
    for (const field of allFields) {
        elfLines.push(`${field}=${fv[field]}`);
    }

    // Generate ACCORD_FLAG: hardware[CHIP, VERSION] or software[DRIVER, VERSION] plus accord_added
    let accordStr = '';
    if (isHardware) {
        accordStr += String(fv.CHIP || '') + String(fv.VERSION || '');
    } else {
        accordStr += String(fv.DRIVER || '') + String(fv.VERSION || '');
    }
    for (const f of accordAddedFields) {
        accordStr += String(fv[f] || '');
    }
    // Fallbacks: include common alternate names that authors may use
    if (!accordStr.includes(String(fv.ACCORD || ''))) {
        const altAccord = fv.ACCORD || fv.accord || fv.accordlib || fv.Accordlib || fv.Accord || fv.accord_lib;
        if (altAccord) accordStr += String(altAccord);
    }
    const accordHash = await hashField(accordStr);
    elfLines.push(`ACCORD_FLAG=${accordHash}`);

    // Generate ATTRIBUTE_FLAG: using components.attribute
    let attrStr = '';
    for (const f of attrFields) {
        attrStr += String(fv[f] || '');
    }
    // Also accept a loosely-named 'Attribute' field in source (backwards compatibility)
    const altAttr = fv.ATTRIBUTE || fv.Attribute || fv.attribute || fv['Attribute'];
    if (altAttr) {
        attrStr += String(altAttr);
    }
    const attrHash = await hashField(attrStr);
    elfLines.push(`ATTRIBUTE_FLAG=${attrHash}`);

    // Generate LICENCE_FLAG: hardware[HARDWARE, MODEL] and software[SOFTWARE]
    let licenceStr = '';
    if (isHardware) {
        licenceStr += String(fv.HARDWARE || '') + String(fv.MODEL || '');
    } else {
        licenceStr += String(fv.SOFTWARE || '');
    }
    // Fallback: include 'model' / alternate casing
    if (isHardware && !licenceStr.includes(String(fv.MODEL || ''))) {
        const altModel = fv.MODEL || fv.model || fv.Model;
        if (altModel) licenceStr += String(altModel);
    }
    const licenceHash = await hashField(licenceStr);
    elfLines.push(`LICENCE_FLAG=${licenceHash}`);

    elfLines.push(`SOURCE=${inputFilename}`);
    elfLines.push(`TARGET=${outputFilename}`);

    const elfContent = elfLines.join('\n');

    state.writeFile(resolvedOutput, elfContent, 'elf');

    return {
        type: 'output',
        content:
            `gcc: [1/3] Syntax OK\n` +
            `gcc: [2/3] Struct fields found: ${Object.keys(fv).join(', ')}\n` +
            `gcc: [3/3] SCCC: All required libraries are valid\n` +
            `gcc: Linking...\n` +
            `gcc: Successfully generated '${outputFilename}'\n` +
            `Reminder: Even the code is true in Standard Compiler, but this is a parody compiler\n` +
            `so if the code has the same logic/result but different syntax it will still couldn't be compiled successfully!!\n`
    };
}

function compileLogic(inputFilename, outputFilename, content, state) {
    const resolvedOutput = resolvePath(state.cwd, outputFilename);

    // [1/2] Syntax check — hanya brace & parenthesis balance untuk logic file
    console.log(`gcc: [1/2] Checking syntax of '${inputFilename}'...`);
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    const syntaxErrors = [];
    if (openBraces !== closeBraces)
        syntaxErrors.push(`Unbalanced braces — found ${openBraces} '{' and ${closeBraces} '}'`);
    if (openParens !== closeParens)
        syntaxErrors.push(`Unbalanced parentheses — found ${openParens} '(' and ${closeParens} ')'`);
    if (!/int\s+main\s*\(\s*\)/.test(content))
        syntaxErrors.push(`Missing required: 'main_function'`);

    if (syntaxErrors.length > 0) {
        return {
            type: 'error',
            content:
                `gcc: [1/2] Syntax errors found:\n` +
                syntaxErrors.map(e => `${inputFilename}: ${e}`).join('\n') +
                `\ncompilation terminated.`
        };
    }

    // [2/2] Run interpreter, tangkap output printf
    console.log(`gcc: [2/2] Compiling and running '${inputFilename}'...`);
    const result = runLogic(content);

    if (!result.success) {
        return {
            type: 'error',
            content:
                `gcc: [2/2] Runtime error:\n` +
                `${inputFilename}: ${result.error}\n` +
                `compilation terminated.\n` +
                `Reminder: This is C Interpreter provide to help Accord Simulation, not a C Standard.\n` +
                `Any C code/syntax/logic may not be interpreted correctly!\n`

        };
    }

    // Tulis ELF — output printf disimpan sebagai STDOUT_LOG
    const stdoutLog = result.output.join('').trim();
    const elfContent = [
        `ELF_EXECUTABLE_MAGIC_FLAG`,
        `TYPE=LOGIC`,
        `SOURCE=${inputFilename}`,
        `TARGET=${outputFilename}`,
        `STDOUT_LOG=${stdoutLog || '(no output)'}`,
    ].join('\n');

    state.writeFile(resolvedOutput, elfContent, 'elf');

    const printLines = result.output.join('');
    return {
        type: 'output',
        content:
            `gcc: [1/2] Syntax OK\n` +
            `gcc: [2/2] Compiled OK\n` +
            `gcc: Linking...\n` +
            `gcc: Successfully generated '${outputFilename}'\n` +
            `Reminder: Even the code is true in Standard Compiler...\n` +
            `it doesn't mean it will compiled as intended on this parody compiler!!\n`
    };
}

// ── Entry point ────────────────────────────────────────────────────────────────

export async function gccCommand({ system, args }) {
    let outputFilename = 'a.elf';
    let inputFilename  = '';
    const incPaths     = []; // file paths dari --inc

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-o' && args[i + 1]) {
            outputFilename = args[i + 1];
            i++;
        } else if (args[i] === '--inc' && args[i + 1]) {
            incPaths.push(args[++i]);
        } else if (!args[i].startsWith('-')) {
            inputFilename = args[i];
        }
    }

    if (!inputFilename) {
        return {
            type: 'error',
            content: 'gcc: fatal error: no input files\ncompilation terminated.'
        };
    }

    const state = system.getState();
    const resolvedInput = resolvePath(state.cwd, inputFilename);

    const file = state.vfs[resolvedInput];
    if (!file) {
        return {
            type: 'error',
            content: `gcc: error: ${inputFilename}: No such file or directory\ncompilation terminated.`
        };
    }

    const content = file.content || '';

    if (isDriverFile(content)) {
        return await compileDriver(inputFilename, outputFilename, content, state, incPaths);
    }

    return compileLogic(inputFilename, outputFilename, content, state);
}