import gccConfig from './gcc-c-js-order.json' with { type: 'json' };

/**
 * extractSpecBody
 * Mengambil isi dari: struct hardware spec = { ... };
 * menggunakan bracket counting supaya nested { } tidak memotong parsing.
 */
function extractSpecBody(content) {
    const start = content.search(/struct\s+(hardware|software)\s+spec\s*=/);
    if (start === -1) return null;
    const braceOpen = content.indexOf('{', start);
    if (braceOpen === -1) return null;

    let depth = 0, i = braceOpen;
    while (i < content.length) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
            depth--;
            if (depth === 0) return content.slice(braceOpen + 1, i);
        }
        i++;
    }
    return null;
}

/**
 * parseValue
 * Mengubah raw string dari designated initializer menjadi nilai JS.
 *   "string"   → string
 *   2.0f / 1   → number
 *   lainnya    → string apa adanya
 */
function parseValue(raw) {
    // strip trailing comma or semicolon
    raw = raw.trim().replace(/[;,]$/, '').trim();

    // quoted string
    const quoted = raw.match(/^"([\s\S]*)"$/s);
    if (quoted) return quoted[1];

    // float dengan suffix f  (2.0f, 1.5f)
    const floatF = raw.match(/^([0-9]*\.?[0-9]+)f$/);
    if (floatF) return Number(floatF[1]);

    // number biasa
    if (!isNaN(raw) && raw !== '') return Number(raw);

    // fallback: return trimmed raw (without trailing punctuation)
    return raw;
}

/**
 * findKeys
 * Membaca semua field wajib dari designated initializer secara dinamis sesuai tipe driver:
 *   struct hardware spec = { .Field = value, ... };
 */
export function findKeys(content) {
    const foundValues = {};
    const missing = [];

    const body = extractSpecBody(content);
    if (!body) {
        missing.push('struct hardware spec');
        return { foundValues, missing };
    }

    // 1. Parse all .Field = value initializers dynamically
    const rawParsed = {};
    const rx = /\.([a-zA-Z0-9_]+)\s*=\s*([^,\n]+)/g;
    let match;
    while ((match = rx.exec(body)) !== null) {
        const fieldName = match[1];
        rawParsed[fieldName] = parseValue(match[2]);
    }

    // Expose all parsed raw fields as fallback in foundValues (case-insensitive keys)
    for (const rk of Object.keys(rawParsed)) {
        foundValues[rk] = rawParsed[rk];
        foundValues[rk.toUpperCase()] = rawParsed[rk];
    }

    // 2. Identify driver category by looking for HARDWARE or SOFTWARE
    let typeVal = null;
    for (const key of Object.keys(rawParsed)) {
        if (key.toUpperCase() === 'HARDWARE' || key.toUpperCase() === 'SOFTWARE') {
            typeVal = rawParsed[key];
            break;
        }
    }

    if (!typeVal) {
        missing.push('HARDWARE or SOFTWARE');
        return { foundValues, missing };
    }

    const normalized = String(typeVal).trim().toUpperCase();
    let metadataKey = null;
    let isHardware = Object.keys(rawParsed).some(k => k.toUpperCase() === 'HARDWARE');

    if (normalized === 'SPEAKER') metadataKey = 'Speaker';
    else if (normalized === 'MONITOR' || normalized === 'EXTERNAL_MONITOR' || normalized === 'EXTERNAL MONITOR' || normalized === 'EXTERNAL-MONITOR') metadataKey = 'External_Monitor';
    else if (normalized === 'COMPUTE MACHINE' || normalized === 'COMPUTE_MACHINE') metadataKey = 'Compute_Machine';
    else if (normalized === 'XLAND_COMPOSITOR' || normalized === 'XLAND COMPOSITOR' || normalized === 'XLAND-COMPOSITOR' || normalized === 'COMPOSITOR') metadataKey = 'XLAND-Compositor';
    else if (normalized === 'DESKTOP_ENVIRONMENT' || normalized === 'DESKTOP ENVIRONMENT' || normalized === 'DESKTOP-ENVIRONMENT' || normalized === 'DESKTOPENVIRONMENT') metadataKey = 'Desktop-Environment';

    if (!metadataKey) {
        missing.push(`valid HARDWARE or SOFTWARE value (got '${typeVal}')`);
        return { foundValues, missing };
    }

    // 3. Get required fields for this metadata key from JSON config
    const baseConfig = gccConfig.metadata[isHardware ? 'HARDWARE' : 'SOFTWARE'] || [];
    const baseFields = baseConfig.filter(f => typeof f === 'string');
    
    const specificConfig = gccConfig.metadata[metadataKey] || {};
    const attrFields = specificConfig.attribute || [];
    const accordAddedFields = specificConfig.accord_added || [];

    const requiredFields = [...baseFields, ...attrFields, ...accordAddedFields];

    // 4. Map required fields case-insensitively with backward compatibility fallbacks
    for (const reqField of requiredFields) {
        let foundKey = null;
        for (const rawKey of Object.keys(rawParsed)) {
            if (rawKey.toUpperCase() === reqField.toUpperCase()) {
                foundKey = rawKey;
                break;
            }
        }

        // Backward compatibility mappings
        if (!foundKey && reqField === 'VERSION') {
            for (const rawKey of Object.keys(rawParsed)) {
                if (rawKey.toUpperCase() === 'DRIVERVERSION' || rawKey.toUpperCase() === 'VERSION' || rawKey.toUpperCase() === 'DRIVER_VERSION') {
                    foundKey = rawKey;
                    break;
                }
            }
        }

        if (foundKey !== null) {
            foundValues[reqField] = rawParsed[foundKey];
        } else {
            missing.push(reqField);
        }
    }

    // Embed metadata category
    foundValues._metadataKey = metadataKey;

    return { foundValues, missing };
}