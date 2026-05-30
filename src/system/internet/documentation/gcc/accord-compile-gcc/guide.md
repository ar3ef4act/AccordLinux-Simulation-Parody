# GCC — compileDriver

## 1. Overview

`compileDriver` is the dedicated driver compiler used by the Accord ecosystem.

Unlike `compileLogic`, this compiler does not execute logic code.

Instead, `compileDriver` is responsible for:

* validating ABAL source files
* parsing driver metadata
* generating virtual ELF manifests
* generating runtime identity hashes
* preparing drivers for Accord System integration

The compiler acts as the bridge between:

* ABAL source code
* Accord runtime metadata
* virtual hardware/software modules

---

# 2. Compilation Flow

The compilation pipeline:

```text
ABAL Source
    ↓
checkSyntax()
    ↓
findKeys()
    ↓
compareLogic()
    ↓
Generate ELF
```

Each stage performs a different validation process.

---

# 3. ABAL Source

`compileDriver` expects a valid ABAL source file.

Example:

```c
// First include all relevant library
#include <driver.h>
#include <accord.h>
#include <audio.h>

// Initiate variabels on struct either Hardware or Software
struct hardware {
    const char* Hardware;
    const char* Model;
    const char* Chip;
    float Version;
    // And so on, based on driver requirment
};

// Fill variables with value on Hardware or Software requirment
struct hardware spec = {
    .Hardware = "Speaker",
    .Model = "HW-0xSPK1",
    .Chip = "ARM-v7",
    .Version = 2.0
    // And so on
};

// Initiating struct must use exactly format as shown above, if not, maybe not compile as intended.

// Initiate init_configuration() as void typedef
void init_configuration() {
    init_accord_env(spec.Chip, spec.Version);
    // For better explanation, see Accord Bridge Abstraction Layer guide
}

// Initiate main() as int typedef
int main() {
    init_configuration();
    return 0;
}
```

---

# 4. Syntax Validation

This validator checks:

* required includes
* struct definitions
* required functions
* brace balance
* parenthesis balance
* semicolon warnings

Example required components:

| Requirement            | Description            |
| ---------------------- | ---------------------- |
| `#include <driver.h>`  | Driver interface       |
| `#include <accord.h>`  | Accord integration     |
| `init_configuration()` | Runtime initialization |
| `main()`               | Entry point            |

---

# 5. Driver Categories

`compileDriver` supports two main categories:

| Category         | Struct            |
| ---------------- | ----------------- |
| Hardware Drivers | `struct hardware` |
| Software Drivers | `struct software` |

---

# 6. Supported Hardware Drivers

| Driver           | Required Library |
| ---------------- | ---------------- |
| Speaker          | `audio.h`        |
| External Monitor | `display.h`      |
| Compute Machine  | `multithread.h`  |

---

# 7. Supported Software Drivers

| Driver              | Required Library |
| ------------------- | ---------------- |
| XLAND-Compositor    | `graphic.h`      |
| Desktop-Environment | `graphic.h`      |

---

# 8. Metadata Extraction

This stage extracts metadata from:

```c
struct hardware spec = { ... }
```

or:

```c
struct software spec = { ... }
```

The extracted fields become runtime metadata.

---

# 9. Required Metadata

## Hardware Drivers

Required base fields:

```text
HARDWARE
MODEL
CHIP
VERSION
```

---

## Software Drivers

Required base fields:

```text
SOFTWARE
DRIVER
VERSION
PATCH
```

---

# 10. Driver-Specific Metadata

Different driver categories require additional fields.

Example:

| Driver              | Additional Fields                  |
| ------------------- | -----------------------------------|
| Speaker             | CHANNELS, OUTPUT, SAMPLE_RATE, etc |
| Monitor             | RESOLUTION, REFRESH_RATE, etc      |
| Compute Machine     | CORES, VRAM_MBIT, etc              |
| XLAND-Compositor    | PROTOCOL, RENDERER, etc            |
| Desktop-Environment | FILE_MANAGER, PANEL_ENABLED, etc   |

---

# 11. compareLogic()

This stage ensures:

* required fields exist
* VERSION is numeric
* metadata can be interpreted correctly

The compiler does not validate runtime compatibility.

Runtime compatibility is handled later by:

* Accord System
* Accord Runtime

---

# 12. ELF Generation

If compilation succeeds, `compileDriver` generates a virtual ELF manifest.

Example:

```text
ELF_EXECUTABLE_MAGIC_FLAG
HARDWARE=Speaker
MODEL=HW-0xSPK1
CHIP=ARM-v7
VERSION=2
CHANNELS=2
OUTPUT=Stereo
```

This ELF is:

* text-based
* metadata-oriented
* runtime-readable

It is not a native Linux ELF binary.

---

# 13. ELF Output Structure

A generated ELF typically contains:

| Field               | Purpose                  |
| ------------------- | ------------------------ |
| HARDWARE / SOFTWARE | Driver category          |
| MODEL / DRIVER      | Runtime identity         |
| VERSION             | Driver version           |
| ACCORD_FLAG         | Runtime integration hash |
| ATTRIBUTE_FLAG      | Driver attribute hash    |
| LICENCE_FLAG        | Driver identity hash     |
| SOURCE              | Original source file     |
| TARGET              | Generated ELF            |

---

# 14. ACCORD_FLAG

`ACCORD_FLAG` identifies:

* Accord integration compatibility
* runtime bridge identity
* accord-related configuration

Generated using:

* CHIP or DRIVER
* VERSION
* accord-added fields
* accord library identifiers

Example:

```text
ACCORD_FLAG=036ac82c2fea93f91f82092447b9ec8b48d47f4fe35cb1e2391f7e4f0a6f943c
```

---

# 15. ATTRIBUTE_FLAG

`ATTRIBUTE_FLAG` represents:

* driver attributes
* runtime capabilities
* hardware/software configuration

Generated from:

* driver-specific metadata fields
* attribute values

Example:

```text
ATTRIBUTE_FLAG=5d3dab6d83012ceaa2a7dde79ad8e4c430a566d4be88939367583103bed8299e
```

---

# 16. LICENCE_FLAG

`LICENCE_FLAG` identifies:

* hardware identity
* software ownership identity
* module uniqueness

Generated from:

* HARDWARE + MODEL
  or:
* SOFTWARE

Example:

```text
LICENCE_FLAG=de54afbc272ed0ecca6a3c9bfd9312fc664dd660932a5960baecf225e90a3963
```

---

# 17. Hash Generation

All hashes use:

```js
SHA-256
```

Generated through:

```js
crypto.subtle.digest()
```

The resulting hash:

* is deterministic
* always produces 64 hexadecimal characters
* uniquely represents runtime metadata

---

# 18. Runtime Relationship

The generated ELF is later used by:

```text
accord-system rebuild
```

The Accord System:

* loads the ELF
* validates runtime metadata
* activates modules
* mounts drivers into the runtime

---

# 19. Common Compilation Errors

| Error                          | Description                      |
| ------------------------------ | -------------------------------- |
| Missing required include       | Required runtime library missing |
| Missing variable               | Reruired variable missing        |
| Missing `main()`               | No entry point                   |
| Missing `init_configuration()` | Driver initialization missing    |
| Missing metadata field         | Required runtime field absent    |
| Invalid VERSION                | VERSION is not numeric           |

---

# 20. Important Notes

`compileDriver` is NOT:

* GCC
* Clang
* a native C compiler

Instead, it is:

* a metadata compiler
* a virtual driver compiler
* an Accord runtime preparation tool

The generated ELF contains:

* metadata
* runtime identity
* driver configuration

rather than executable machine code.

---

# 21. Summary

`compileDriver` is the core compiler responsible for transforming ABAL source files into runtime-readable ELF manifests.

The compiler performs:

* syntax validation
* metadata extraction
* runtime identity generation
* hash generation
* virtual ELF serialization

This allows Accord drivers to integrate with:

* Accord Runtime
* Accord System
* virtual hardware environments
