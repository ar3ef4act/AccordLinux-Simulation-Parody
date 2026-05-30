// --- Tokenizer ---
function tokenize(src) {
    src = src
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');

    const tokens = [];
    // eslint-disable-next-line no-useless-escape
    const rx = /([0-9]*\.[0-9]+f?|[0-9]+f?|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[a-zA-Z_]\w*|\+\+|--|==|!=|<=|>=|&&|\|\||[+\-*\/%<>=!&|;,(){}\[\]])/g;
    let m;
    while ((m = rx.exec(src)) !== null) tokens.push(m[1]);
    return tokens;
}

// --- Interpreter ---
class Interpreter {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.output = [];
        this.vars = [{}];
        this.returnValue = null;
        this.returning = false;
    }

    peek(offset = 0) { return this.tokens[this.pos + offset]; }

    consume(expected) {
        const t = this.tokens[this.pos++];
        if (expected && t !== expected)
            throw new Error(`Expected '${expected}', got '${t ?? 'EOF'}'`);
        return t;
    }

    pushScope() { this.vars.push({}); }
    popScope() { this.vars.pop(); }

    getVar(name) {
        for (let i = this.vars.length - 1; i >= 0; i--)
            if (name in this.vars[i]) return this.vars[i][name];
        throw new Error(`Undefined variable: '${name}'`);
    }

    setVar(name, val) {
        for (let i = this.vars.length - 1; i >= 0; i--)
            if (name in this.vars[i]) { this.vars[i][name] = val; return; }
        this.vars[this.vars.length - 1][name] = val;
    }

    declareVar(name, val) {
        this.vars[this.vars.length - 1][name] = val;
    }

    // --- Expressions ---

    parsePrimary() {
        const t = this.peek();
        if (t === undefined) throw new Error('Unexpected end of input');

        if (t === '(') {
            this.pos++;
            const v = this.parseExpr();
            this.consume(')');
            return v;
        }

        // unary + (no-op)
        if (t === '+') { this.pos++; return this.parsePrimary(); }

        // number literal (int or float, strip f suffix)
        if (/^[0-9]/.test(t)) {
            this.pos++;
            return Number(t.replace(/f$/, ''));
        }

        // string literal
        if (t.startsWith('"')) {
            this.pos++;
            return t.slice(1, -1)
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
        }

        // char literal  'a' → char code
        if (t.startsWith("'")) { this.pos++; return t.charCodeAt(1); }

        // pre-increment / pre-decrement
        if (t === '++' || t === '--') {
            this.pos++;
            const name = this.consume();
            if (this.peek() === '[') {
                this.consume('[');
                const idx = this.parseExpr();
                this.consume(']');
                const arr = this.getVar(name);
                const old = arr[idx];
                const newVal = t === '++' ? old + 1 : old - 1;
                arr[idx] = newVal;
                return newVal;
            } else {
                const v = this.getVar(name);
                const newVal = t === '++' ? v + 1 : v - 1;
                this.setVar(name, newVal);
                return newVal;
            }
        }

        // identifier
        if (/^[a-zA-Z_]/.test(t)) {
            this.pos++;

            if (this.peek() === '[') {
                this.consume('[');
                const idx = this.parseExpr();
                this.consume(']');
                const arr = this.getVar(t);

                if (this.peek() === '++') { this.pos++; const old = arr[idx]; arr[idx] = old + 1; return old; }
                if (this.peek() === '--') { this.pos++; const old = arr[idx]; arr[idx] = old - 1; return old; }
                return arr[idx];
            }

            if (this.peek() === '++') { this.pos++; const old = this.getVar(t); this.setVar(t, old + 1); return old; }
            if (this.peek() === '--') { this.pos++; const old = this.getVar(t); this.setVar(t, old - 1); return old; }
            return this.getVar(t);
        }

        throw new Error(`Unexpected token in expression: '${t}'`);
    }

    parseUnary() {
        if (this.peek() === '!') { this.pos++; return this.parseUnary() ? 0 : 1; }
        if (this.peek() === '-') { this.pos++; return -this.parseUnary(); }
        return this.parsePrimary();
    }

    parseMul() {
        let l = this.parseUnary();
        while (['*', '/', '%'].includes(this.peek())) {
            const op = this.consume(); const r = this.parseUnary();
            if (op === '*') l *= r;
            else if (op === '/') l = Math.trunc(l / r);
            else l %= r;
        }
        return l;
    }

    parseAdd() {
        let l = this.parseMul();
        while (['+', '-'].includes(this.peek())) {
            const op = this.consume();
            l = op === '+' ? l + this.parseMul() : l - this.parseMul();
        }
        return l;
    }

    parseCmp() {
        let l = this.parseAdd();
        while (['<', '>', '<=', '>=', '==', '!='].includes(this.peek())) {
            const op = this.consume(); const r = this.parseAdd();
            if (op === '<') l = l < r ? 1 : 0;
            else if (op === '>') l = l > r ? 1 : 0;
            else if (op === '<=') l = l <= r ? 1 : 0;
            else if (op === '>=') l = l >= r ? 1 : 0;
            else if (op === '==') l = l === r ? 1 : 0;
            else l = l !== r ? 1 : 0;
        }
        return l;
    }

    parseAnd() {
        let l = this.parseCmp();
        while (this.peek() === '&&') {
            this.consume();
            const r = this.parseCmp();
            l = (l !== 0 && r !== 0) ? 1 : 0;
        }
        return l;
    }

    parseOr() {
        let l = this.parseAnd();
        while (this.peek() === '||') {
            this.consume();
            const r = this.parseAnd();
            l = (l !== 0 || r !== 0) ? 1 : 0;
        }
        return l;
    }

    parseExpr() { return this.parseOr(); }

    // --- printf ---
    parsePrintf() {
        this.consume('(');
        const fmt = this.parsePrimary();
        const args = [];
        while (this.peek() === ',') { this.consume(); args.push(this.parseExpr()); }
        this.consume(')');
        this.consume(';');

        let ai = 0;
        const out = String(fmt).replace(/%d|%i|%f|%s|%c/g, spec => {
            const a = args[ai++];
            if (spec === '%f') return typeof a === 'number' ? a.toFixed(6) : String(a);
            if (spec === '%c') return typeof a === 'number' ? String.fromCharCode(a) : String(a);
            return String(a ?? '');
        });
        this.output.push(out);
    }

    // --- Blocks & statements ---
    parseBlock() {
        this.consume('{');
        this.pushScope();
        while (this.peek() !== '}' && !this.returning) this.parseStatement();
        if (this.returning) {
            // drain remaining tokens in block
            let d = 1;
            while (d > 0) {
                const tk = this.tokens[this.pos++];
                if (!tk) break;
                if (tk === '{') d++;
                else if (tk === '}') d--;
            }
        } else {
            this.consume('}');
        }
        this.popScope();
    }

    skipBlock() {
        this.consume('{');
        let d = 1;
        while (d > 0) {
            const t = this.tokens[this.pos++];
            if (t === '{') d++;
            else if (t === '}') d--;
        }
    }

    skipToSemicolon() {
        while (this.peek() !== ';' && this.pos < this.tokens.length) this.pos++;
        if (this.peek() === ';') this.pos++;
    }

    parseStatement() {
        if (this.returning) return;
        const t = this.peek();
        if (!t) return;

        if (t === '{') { this.parseBlock(); return; }

        // --- variable declaration ---
        if (['int', 'float', 'double', 'char'].includes(t)) {
            this.pos++;
            const name = this.consume();

            // --- array declaration (e.g. data[] or data[5]) ---
            let isArray = false;
            let arraySize = null;
            if (this.peek() === '[') {
                this.consume('[');
                if (this.peek() !== ']') {
                    arraySize = this.parseExpr();
                }
                this.consume(']');
                isArray = true;
            }

            let val = isArray ? [] : 0;

            if (this.peek() === '=') {
                this.consume('=');
                if (isArray) {
                    // --- curly braces (e.g. = {5, 10, 3, 7, 0}) ---
                    if (this.peek() === '{') {
                        this.consume('{');
                        val = [];
                        if (this.peek() !== '}') {
                            val.push(this.parseExpr());
                            while (this.peek() === ',') {
                                this.consume(',');
                                val.push(this.parseExpr());
                            }
                        }
                        this.consume('}');
                    } else {
                        val = [this.parseExpr()];
                    }
                } else {
                    val = this.parseExpr();
                }
            }
            this.consume(';');

            if (isArray && val.length === 0 && arraySize !== null) {
                val = new Array(arraySize).fill(0);
            }

            this.declareVar(name, val);
            return;
        }

        // --- if-else ---
        if (t === 'if') {
            this.pos++;
            this.consume('(');
            const cond = this.parseExpr();
            this.consume(')');
            if (cond) {
                this.parseBlock();
                if (this.peek() === 'else') { this.pos++; this.skipBlock(); }
            } else {
                this.skipBlock();
                if (this.peek() === 'else') { this.pos++; this.parseBlock(); }
            }
            return;
        }

        // --- while ---
        if (t === 'while') {
            this.pos++;
            const condPos = this.pos;
            this.consume('(');
            let cond = this.parseExpr();
            this.consume(')');
            const bodyPos = this.pos;
            let limit = 0;
            while (cond && limit++ < 10000 && !this.returning) {
                this.parseBlock();
                this.pos = condPos;
                this.consume('(');
                cond = this.parseExpr();
                this.consume(')');
            }
            if (!cond) { this.pos = bodyPos; this.skipBlock(); }
            return;
        }

        // -- for ---
        if (t === 'for') {
            this.pos++;
            this.consume('(');
            this.pushScope();

            // init: [type] name = expr ;
            if (['int', 'float', 'char', 'double'].includes(this.peek())) this.pos++;
            const iname = this.consume();
            this.consume('=');
            this.declareVar(iname, this.parseExpr());
            this.consume(';');

            // --- condition ---
            const condPos = this.pos;
            let cond = this.parseExpr();
            this.consume(';');

            // --- update token range ---
            const updPos = this.pos;
            let depth = 1;
            while (depth > 0) {
                const tk = this.tokens[this.pos++];
                if (tk === '(') depth++;
                else if (tk === ')') depth--;
            }
            const afterParen = this.pos;

            let limit = 0;
            while (cond && limit++ < 10000 && !this.returning) {
                this.parseBlock();
                this.pos = updPos; this.parseExpr();
                this.pos = condPos; cond = this.parseExpr(); this.consume(';');
                this.pos = afterParen;
            }
            if (!cond) { this.pos = afterParen; this.skipBlock(); }
            this.popScope();
            return;
        }

        // --- printf ---
        if (t === 'printf') { this.pos++; this.parsePrintf(); return; }

        // --- return ---
        if (t === 'return') {
            this.pos++;
            if (this.peek() !== ';') this.returnValue = this.parseExpr();
            this.consume(';');
            this.returning = true;
            return;
        }

        // --- assignment / compound assignment / post-increment ---
        if (/^[a-zA-Z_]/.test(t)) {
            this.pos++;

            // Check if it is an array assignment, e.g. data[idx] = value
            let isArray = false;
            let idx = null;
            if (this.peek() === '[') {
                this.consume('[');
                idx = this.parseExpr();
                this.consume(']');
                isArray = true;
            }

            if (this.peek() === '=') {
                this.consume('='); const v = this.parseExpr(); this.consume(';');
                if (isArray) {
                    const arr = this.getVar(t);
                    arr[idx] = v;
                } else {
                    this.setVar(t, v);
                }
                return;
            }
            if (this.peek() === '++') {
                this.pos++;
                this.consume(';');
                if (isArray) {
                    const arr = this.getVar(t);
                    arr[idx]++;
                } else {
                    this.setVar(t, this.getVar(t) + 1);
                }
                return;
            }
            if (this.peek() === '--') {
                this.pos++;
                this.consume(';');
                if (isArray) {
                    const arr = this.getVar(t);
                    arr[idx]--;
                } else {
                    this.setVar(t, this.getVar(t) - 1);
                }
                return;
            }
            const compOps = ['+=', '-=', '*=', '/=', '%='];
            if (compOps.includes(this.peek())) {
                const op = this.consume(); const r = this.parseExpr(); this.consume(';');
                if (isArray) {
                    const arr = this.getVar(t);
                    const cur = arr[idx];
                    if (op === '+=') arr[idx] = cur + r;
                    else if (op === '-=') arr[idx] = cur - r;
                    else if (op === '*=') arr[idx] = cur * r;
                    else if (op === '/=') arr[idx] = Math.trunc(cur / r);
                    else arr[idx] = cur % r;
                } else {
                    const cur = this.getVar(t);
                    if (op === '+=') this.setVar(t, cur + r);
                    else if (op === '-=') this.setVar(t, cur - r);
                    else if (op === '*=') this.setVar(t, cur * r);
                    else if (op === '/=') this.setVar(t, Math.trunc(cur / r));
                    else this.setVar(t, cur % r);
                }
                return;
            }
        }

        // fallback: skip unknown statement
        this.skipToSemicolon();
    }

    run() {
        while (this.pos < this.tokens.length && this.peek() !== 'main') this.pos++;
        if (this.pos >= this.tokens.length) throw new Error('No main() found');
        this.pos++;
        this.consume('(');
        this.consume(')');
        this.parseBlock();
        return this.output;
    }
}

export function runLogic(content) {
    try {
        const tokens = tokenize(content);
        const interp = new Interpreter(tokens);
        const output = interp.run();
        return { success: true, output };
    } catch (e) {
        return { success: false, output: [], error: e.message };
    }
}