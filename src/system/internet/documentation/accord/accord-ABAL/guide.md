# ABAL — Accord Bridge Abstraction Layer

ABAL (Accord Bridge Abstraction Layer) is the bridge layer between
Accord System and hardware/software drivers.

ABAL is compiled using:

```bash
gcc source.c output.elf --inc lib.h
```

Unlike normal C compilation, ABAL does not generate machine code.

Instead, it generates a structured ELF metadata file used by
Accord System runtime.

---

# Purpose of ABAL

ABAL exists to:

* Describe hardware/software metadata
* Validate Accord bridge structures
* Connect drivers into Accord System
* Generate runtime-readable ELF metadata
* Create compatibility hashes
* Provide system abstraction

ABAL acts as a middle layer between:

```txt
Accord System
      ↓
ABAL
      ↓
Hardware / Software Drivers
```

---

# Compilation Flow

```txt
ABAL Source
    ↓
checkSyntax()
    ↓
findKeys()
    ↓
compareLogic()
    ↓
hashField()
    ↓
ELF Generation
```

---

# Required Includes

All ABAL files require:

```c
#include <driver.h>
#include <accord.h>
```

Additional includes depend on driver type.

---

# Driver Type Includes

| Driver Type         | Required Include |
| ------------------- | ---------------- |
| Speaker             | audio.h          |
| External Monitor    | display.h        |
| Compute Machine     | multithread.h    |
| XLAND-Compositor    | graphic.h        |
| Desktop-Environment | graphic.h        |

---

# Basic ABAL Structure

ABAL files contain:

1. Includes
2. Struct definition
3. Struct initialization
4. init_configuration()
5. main()

---

# Example Structure

```c
#include <driver.h>
#include <accord.h>
#include <audio.h>

struct hardware {
    const char* Hardware;
    const char* Model;
    const char* Chip;

    float Version;
};

struct hardware spec = {
    .Hardware = "Speaker",
    .Model = "HW-0xSPK1",
    .Chip = "ARM-v7",
    .Version = 2.0
};

void init_configuration() {
    init_accord_env(spec.Chip, spec.Version);
}

int main() {
    init_configuration();
    return 0;
}
```

---

# Syntax Validation

ABAL syntax validation uses:

```js
checkSyntax(content, syntaxRules)
```

Validation checks:

* Required includes
* Struct existence
* Struct initialization
* init_configuration()
* main()
* Brace balance
* Parenthesis balance
* Semicolon warnings

---

## HARDWARE Metadata

```json
"HARDWARE": [
  "HARDWARE",
  "MODEL",
  "CHIP",
  "VERSION",
  "ATTRIBUTE",
  "ACCORDLIB"
]
```

Used by:

* Speaker
* External Monitor
* Compute Machine

---

## SOFTWARE Metadata

```json
"SOFTWARE": [
  "SOFTWARE",
  "DRIVER",
  "VERSION",
  "PATCH",
  "ATTRIBUTE",
  "ACCORDLIB"
]
```

Used by:

* XLAND-Compositor
* Desktop-Environment

---

# Hardware Metadata

---

# Speaker Metadata

| Field       | Description           |
| ----------- | --------------------- |
| CHANNELS    | Audio channels        |
| OUTPUT      | Audio output          |
| SAMPLE_RATE | Audio sample rate     |
| PROTOCOL    | Accord audio protocol |

---

# External Monitor Metadata

| Field        | Description          |
| ------------ | -------------------- |
| RESOLUTION   | Screen resolution    |
| REFRESH_RATE | Display refresh rate |
| COLOR_FORMAT | Pixel format         |
| INTERFACE    | Display interface    |

---

# Compute Machine Metadata

| Field              | Description        |
| ------------------ | ------------------ |
| CORES              | Compute cores      |
| THREADS_PER_CORE   | Threads per core   |
| VRAM_MBIT          | Video memory       |
| MAIN_MEMORY_MBIT   | Shared memory      |
| CLOCK_SPEED        | GPU clock          |
| RAYTRACING_SUPPORT | Raytracing support |
| GRAPHIC_API        | Rendering API      |
| COMPUTE_API        | Compute API        |

---

# Software Metadata

---

## XLAND-Compositor Metadata

| Field           | Description       |
| --------------- | ----------------- |
| PROTOCOL        | Display protocol  |
| RENDERER        | Rendering backend |
| COMPOSITOR_API  | Compositor API    |
| API_VERSION     | API version       |
| GPU_ACCELERATOR | GPU acceleration  |
| GPU_BACKEND     | GPU backend       |

---

# Desktop-Environment Metadata

| Field            | Description        |
| ---------------- | ------------------ |
| COMPOSITOR_API   | Desktop compositor |
| PANEL_ENABLED    | Panel state        |
| LAUNCHER_ENABLED | Launcher state     |
| FILE_MANAGER     | File manager       |
| GRAPHIC_API      | Rendering API      |

---

# Field Extraction

ABAL dynamically parses fields from:

```c
struct hardware spec = {
    .Hardware = "Speaker",
    .Version = 2.0
};
```

The parser extracts:

```txt
.Hardware
.Version
.Model
.Protocol
.Graphic_API
```

and converts them into runtime metadata.

---

# Example Failure

```txt
SCCC: field 'GRAPHIC_API' is missing or could not be read
```

---

# Hash Generation

ABAL generates three hashes:

| Hash           | Purpose              |
| -------------- | -------------------- |
| ACCORD_FLAG    | Accord compatibility |
| ATTRIBUTE_FLAG | Driver attributes    |
| LICENCE_FLAG   | Driver identity      |

All hashes use:

```js
SHA-256
```

---

# ACCORD_FLAG

Generated from:

Hardware:

```txt
CHIP + VERSION + accord_added
```

Software:

```txt
DRIVER + VERSION + accord_added
```

---

## Example

```txt
ARM-v72.0RCA
```

↓

```txt
036ac82c2fea93f91f82092447b9ec8b48d47f4fe35cb1e2391f7e4f0a6f943c
```

---

# ATTRIBUTE_FLAG

Generated from:

```txt
attribute fields + attribute
```

Example:

```txt
244120Stereopipewire
```

↓

```txt
5d3dab6d83012ceaa2a7dde79ad8e4c430a566d4be88939367583103bed8299e
```

---

# LICENCE_FLAG

Generated from:

Hardware:

```txt
HARDWARE + MODEL
```

Software:

```txt
SOFTWARE
```

---

# Example

```txt
SpeakerHW-0xSPK1
```

↓

```txt
de54afbc272ed0ecca6a3c9bfd9312fc664dd660932a5960baecf225e90a3963
```

---

# ELF Generation

After validation and hashing, ABAL generates:

```txt
ELF_EXECUTABLE_MAGIC_FLAG
```

This ELF is metadata-based.

It does not contain native executable code.

---

# ELF Output Format

Example:

```txt
ELF_EXECUTABLE_MAGIC_FLAG
HARDWARE=Speaker
MODEL=HW-0xSPK1
CHIP=ARM-v7
VERSION=2
CHANNELS=2
OUTPUT=Stereo
SAMPLE_RATE=44120
PROTOCOL=RCA
ACCORD_FLAG=036ac82c2fea93f91f82092447b9ec8b48d47f4fe35cb1e2391f7e4f0a6f943c
ATTRIBUTE_FLAG=5d3dab6d83012ceaa2a7dde79ad8e4c430a566d4be88939367583103bed8299e
LICENCE_FLAG=de54afbc272ed0ecca6a3c9bfd9312fc664dd660932a5960baecf225e90a3963
SOURCE=spe.c
TARGET=spe.elf
```