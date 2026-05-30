export function checkSyntax(content, syntaxRules) {
    const errors = [];

    // ── Rule-based pattern checks ─────────────────────────────────────────────
    for (const rule of syntaxRules) {
        const regex = new RegExp(rule.pattern);
        if (rule.required && !regex.test(content)) {
            errors.push(`Missing required element: '${rule.name}' (expected pattern: ${rule.pattern})`);
        }
    }

    // ── Brace balance ─────────────────────────────────────────────────────────
    const openBraces  = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
        errors.push(`Syntax Error: Unbalanced braces — found ${openBraces} '{' and ${closeBraces} '}'`);
    }

    // ── Parenthesis balance ───────────────────────────────────────────────────
    const openParens  = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        errors.push(`Syntax Error: Unbalanced parentheses — found ${openParens} '(' and ${closeParens} ')'`);
    }

    // ── Line-by-line semicolon check ──────────────────────────────────────────
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const isBlank        = trimmed === '';
        const isPreprocessor = trimmed.startsWith('#');
        const isComment      = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
        const isBlockOpen    = trimmed.endsWith('{');
        const isBlockClose   = /^\}/.test(trimmed);
        const isDesignated   = trimmed.startsWith('.');
        const isStructField  = /^(const\s+)?(char\s*\*|int|float|double|char)\s+[\w,\s]+\s*;$/.test(trimmed);
        const isFuncDecl     = /^(int|void|char|float|double)\s+\w+\s*\(/.test(trimmed) && trimmed.endsWith(')');

        if (!isBlank && !isPreprocessor && !isComment &&
            !isBlockOpen && !isBlockClose && !isDesignated &&
            !isStructField && !isFuncDecl) {
            if (!trimmed.endsWith(';') && !trimmed.endsWith(',')) {
                errors.push(`Syntax Warning: Line ${index + 1} may be missing a semicolon — "${trimmed}"`);
            }
        }
    });

    // ── Validate all struct fields are used in init_configuration() ──────────
    // Hanya berlaku untuk driver file (ada struct hardware/software)
    if (/struct\s+(hardware|software)\s+spec\s*=/.test(content)) {

        // Ambil semua field name dari designated initializer
        const fieldMatches = [...content.matchAll(/\.\s*([a-zA-Z0-9_]+)\s*=/g)];
        const declaredFields = fieldMatches.map(m => m[1]);

        // Ambil body init_configuration()
        const initMatch = content.match(/void\s+init_configuration\s*\(\s*\)\s*\{([\s\S]*?)\}/);
        const initBody  = initMatch ? initMatch[1] : '';

        // Cek setiap field — harus ada spec.<Field> di init_configuration
        for (const field of declaredFields) {
            // Case-insensitive: spec.Sample_Rate atau spec.sample_rate keduanya valid
            const used = new RegExp(`spec\\.${field}\\b`, 'i').test(initBody);
            if (!used) {
                errors.push(`Unused field: '.${field}' is declared in struct but never used in init_configuration()`);
            }
        }
    }

    return {
        success: errors.length === 0,
        errors
    };
}