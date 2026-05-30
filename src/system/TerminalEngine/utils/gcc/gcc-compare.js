import gccConfig from './gcc-c-js-order.json' with { type: 'json' };

/**
 * compareLogic
 *
 * SCCC hanya memastikan semua field wajib ada dan bisa dibaca secara dinamis.
 * Mismatch value (versi salah, hardware tidak cocok, dsb) adalah urusan
 * runtime simulator — bukan urusan compiler.
 */
export function compareLogic(foundValues) {
    const failures = [];

    const metadataKey = foundValues._metadataKey;
    if (!metadataKey) {
        failures.push(`SCCC: Could not identify driver metadata type`);
        return { valid: false, failures };
    }

    // Get base fields (string types from base config)
    const isHardware = foundValues.HARDWARE !== undefined;
    const baseConfig = gccConfig.metadata[isHardware ? 'HARDWARE' : 'SOFTWARE'] || [];
    const baseFields = baseConfig.filter(f => typeof f === 'string');
    
    // Get specific fields for this metadata key
    const specificConfig = gccConfig.metadata[metadataKey] || {};
    const attrFields = specificConfig.attribute || [];
    const accordAddedFields = specificConfig.accord_added || [];
    
    // Combine all required fields
    const required = [...baseFields, ...attrFields, ...accordAddedFields];

    for (const field of required) {
        if (foundValues[field] === undefined || foundValues[field] === null) {
            failures.push(`SCCC: field '${field}' is missing or could not be read`);
        }
    }

    // VERSION harus bisa dibaca sebagai angka jika ada
    if (foundValues.VERSION !== undefined) {
        const v = Number(foundValues.VERSION);
        if (isNaN(v)) {
            failures.push(`SCCC: VERSION '${foundValues.VERSION}' is not a valid number`);
        }
    }

    return {
        valid: failures.length === 0,
        failures
    };
}

/**
 * hashField
 * Menghasilkan SHA-256 hex (64 karakter) dari sebuah nilai,
 * digunakan untuk ACCORD dan ATTRIBUTE_FLAG di ELF.
 * Menggunakan Web Crypto API (browser-native, tidak butuh Node.js crypto).
 */
export async function hashField(value) {
    const str = Array.isArray(value) ? value.join(' ') : String(value);
    const encoded = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}