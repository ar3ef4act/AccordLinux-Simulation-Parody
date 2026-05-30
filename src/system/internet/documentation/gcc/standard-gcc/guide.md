# Accord GCC Logic Compiler (`compileLogic`) Guide

## Overview

`compileLogic()` is the primary logic compiler used inside the Accord OS simulation environment.

Unlike a real GCC implementation, Accord GCC is a lightweight interpreted compiler designed for:

* gameplay scripting
* terminal simulation
* educational runtime behavior
* pseudo-C execution
* virtual executable generation

The compiler interprets source code directly and serializes the execution result into a virtual ELF-like executable format.

---

# Compilation Pipeline

The logic compiler follows this execution flow:

```text
Source Code
    ↓
Syntax Validation
    ↓
Tokenizer
    ↓
Recursive Descent Interpreter
    ↓
Runtime Output Capture
    ↓
Virtual ELF Serialization
```

Unlike traditional compilers, Accord GCC does not generate machine code.

Instead, it executes the source immediately during compilation.

---

# Main Compiler Function

```js
compileLogic(inputFilename, outputFilename, content, state)
```

## Parameters

| Parameter        | Description                      |
| ---------------- | -------------------------------- |
| `inputFilename`  | Source file name                 |
| `outputFilename` | Output executable file           |
| `content`        | Raw C-like source code           |
| `state`          | Virtual filesystem/runtime state |

---

# Compilation Stages

The compiler operates in two stages.

---

# Stage 1 — Syntax Validation

```text
gcc: [1/2] Checking syntax...
```

The compiler performs lightweight syntax checking before execution.

## Current Syntax Checks

### Brace Balance

```c
{
}
```

The number of opening and closing braces must match.

---

### Parenthesis Balance

```c
(
)
```

The number of opening and closing parentheses must match.

---

### Required `main()` Function

The compiler requires:

```c
int main()
```

Programs without a valid `main()` function are rejected.

---

# Syntax Error Example

```text
gcc: [1/2] Syntax errors found:
main.c: Missing required: 'main_function'
compilation terminated.
```

---

# Stage 2 — Runtime Interpretation

```text
gcc: [2/2] Compiling and running...
```

After validation, the source code is interpreted directly.

The compiler uses:

* tokenization
* recursive descent parsing
* immediate execution

to simulate a lightweight C runtime.

---

# Tokenizer System

The tokenizer converts raw source code into executable tokens.

## Supported Token Types

### Numeric Literals

```c
123
3.14
2.0f
```

---

### String Literals

```c
"Hello World"
```

Supports escape sequences:

```c
"\n"
"\t"
"\\"
"\""
```

---

### Character Literals

```c
'A'
```

Characters are internally converted into ASCII integer values.

---

### Operators

Supported operators include:

```text
+
-
*
/
%
==
!=
<
>
<=
>=
&&
||
++
--
```

---

# Parser Architecture

Accord GCC uses a recursive descent parser.

## Expression Hierarchy

The parser evaluates expressions using operator precedence.

### Parsing Order

```text
Primary
Unary
Multiply/Divide
Addition/Subtraction
Comparison
Logical AND
Logical OR
```

Example:

```c
2 + 3 * 4
```

Correctly evaluates as:

```text
2 + (3 * 4)
```

---

# Runtime Environment

The interpreter contains:

* scoped variables
* block execution
* loop execution
* arrays
* printf output buffer
* return handling

---

# Scope System

Variables are stored using nested scope layers.

Example:

```c
{
    int x = 5;
}
```

Variables inside blocks are destroyed when the block exits.

---

# Supported Data Types

Current supported pseudo-types:

```c
int
float
double
char
```

Note:

All values are internally stored as JavaScript numbers.

Accord GCC does not currently implement:

* true memory sizes
* overflow behavior
* pointer arithmetic
* native C type casting

---

# Variable Declaration

Example:

```c
int score = 10;
float speed = 2.5f;
char c = 'A';
```

---

# Array Support

## Fixed Arrays

```c
int data[5];
```

---

## Initialized Arrays

```c
int data[] = {1, 2, 3};
```

---

## Array Access

```c
data[0] = 5;
printf("%d", data[0]);
```

---

# Supported Statements

---

# Assignment

```c
x = 10;
```

---

# Increment / Decrement

```c
x++;
x--;
++x;
--x;
```

---

# Compound Assignment

Supported internally:

```c
+=
-=
*=
/=
%=
```

Note:

Some compound operators may behave inconsistently depending on tokenizer configuration.

---

# Conditional Statements

```c
if (x > 5) {
    printf("OK");
}
else {
    printf("FAIL");
}
```

---

# While Loop

```c
while (x < 10) {
    x++;
}
```

## Safety Limiter

Loops are automatically limited to prevent infinite execution.

Current limit:

```text
10000 iterations
```

---

# For Loop

Example:

```c
for (int i = 0; i < 5; i++) {
    printf("%d", i);
}
```

---

# Return Statement

```c
return 0;
```

The interpreter stores the return value internally.

---

# `printf()` Support

Accord GCC supports a simplified `printf()` implementation.

## Supported Format Specifiers

| Specifier | Description |
| --------- | ----------- |
| `%d`      | Integer     |
| `%i`      | Integer     |
| `%f`      | Float       |
| `%s`      | String      |
| `%c`      | Character   |

---

# Example

```c
printf("Score: %d", 10);
```

Output:

```text
Score: 10
```

---

# Virtual ELF Output

Successful compilation generates a virtual executable file.

Example:

```text
ELF_EXECUTABLE_MAGIC_FLAG
TYPE=LOGIC
SOURCE=main.c
TARGET=main.elf
STDOUT_LOG=Hello World
```

---

# Virtual ELF Fields

| Field        | Description             |
| ------------ | ----------------------- |
| `TYPE`       | Executable category     |
| `SOURCE`     | Source filename         |
| `TARGET`     | Output executable       |
| `STDOUT_LOG` | Captured runtime output |

---

# Runtime Errors

Runtime failures stop compilation immediately.

Example:

```text
gcc: [2/2] Runtime error:
main.c: Undefined variable: 'x'
compilation terminated.
```

---

# Important Limitations

Accord GCC is intentionally simplified.

## Unsupported Features

The following C features are not currently implemented:

* pointers
* memory addresses
* structs
* function pointers
* user-defined functions
* recursion
* header includes
* dynamic memory allocation
* switch statements
* break / continue
* native preprocessing

---

# Design Philosophy

Accord GCC is not intended to behave exactly like a real GCC compiler.

Instead, it is designed as:

* a simulation runtime
* a pseudo-C educational environment
* a lightweight interpreted compiler
* a gameplay scripting system

This allows Accord OS simulations to remain:

* lightweight
* immersive
* deterministic
* easy to extend

---

# Example Program

```c
int main() {
    int total = 0;

    for (int i = 0; i < 5; i++) {
        total += i;
    }

    printf("Result: %d\n", total);

    return 0;
}
```

---

# Example Compilation Output

```text
gcc: [1/2] Syntax OK
gcc: [2/2] Compiled OK
gcc: Linking...
gcc: Successfully generated 'main.elf'
Reminder: Even the code is true in Standard Compiler...
it doesn't mean it will compiled as intended on this parody compiler!!
```

---

# Summary

`compileLogic()` is a lightweight interpreted pseudo-C compiler designed specifically for the Accord OS simulation ecosystem.

It combines:

* tokenization
* recursive descent parsing
* immediate execution
* virtual executable serialization

into a simplified compiler runtime suitable for:

* operating system simulation
* terminal gameplay
* scripting systems
* educational compiler experimentation
