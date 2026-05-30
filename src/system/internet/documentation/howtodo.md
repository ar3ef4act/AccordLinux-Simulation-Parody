# HOWTODO.md

# Accord OS — Beginner Progression Guide

Welcome to Accord OS Simulation.

This guide explains the recommended progression path for new players before creating advanced systems, drivers, and ABAL modules.

Accord OS is not a standard Linux environment.
It is a simulation-based operating system focused on hardware abstraction, software integration, and Accord Bridge development.

---

# 1. Start With `games`

The first thing players should learn is the `games` command.

```bash
games
```

This command shows installed games and simulation targets available in the current Accord environment.

Some games may not work immediately because the required hardware or software drivers are not installed yet.

---

# 2. Enable Internet Access

Before downloading drivers or development bundles, internet access must be enabled.

```bash
ip a
```

Without internet access:

* `curl` will not work
* repositories cannot be accessed
* driver bundles cannot be downloaded

---

# 3. Learn Repository Links and `curl`

Accord OS uses repository pointers instead of physical internet files.

Example:

```bash
curl http://repo.accord.org/bundle/speaker-dev
```

This downloads a development bundle into the current directory.

Some repositories contain:

* individual headers
* driver libraries
* bundled development kits
* Accord subsystem packages (Accor Games Launcher)

Example repositories:

```bash
http://repo.accord.org/bundle/speaker-dev
http://repo.accord.org/bundle/compute-dev
http://repo.accord.org/api/full-devkit
```

---

# 4. Run Games

After installing required components:

```bash
games
```

Some games may still fail if hardware requirements are missing.

---

# 5. Learn Game Requirements

Every game may require specific hardware or software.

Examples:

| Requirement         | Purpose                      |
| ------------------- | ---------------------------- |
| Speaker             | Audio output                 |
| External Monitor    | Display rendering            |
| XLAND-Compositor    | Rendering backend            |
| Desktop-Environment | UI environment               |
| Compute Machine     | Advanced graphics or compute |

Some rooms or game environments display these requirements directly.

---

# 6. Learn Hardware and Software Types

Accord OS contains two major driver categories:

## Hardware Drivers

Examples:

* Speaker
* External Monitor
* Compute Machine

Hardware drivers usually use:

```c
struct hardware
```

---

## Software Drivers

Examples:

* XLAND-Compositor
* Desktop-Environment

Software drivers usually use:

```c
struct software
```

## Hardware Specification Check

In technical requirements, descriptive terms such as chip in “chip ARM-V7” are not necessary to include in variable names.
The identifier should capture only the essential technical specification, for example ARM_V7.

This approach ensures clarity, consistency, and avoids redundancy in code or documentation.

---

# 7. Learn `accord-system`

`accord-system` is the core system manager of Accord OS.

It updates:

* active hardware
* software layers
* rendering systems
* Accord configuration state

Example:

```bash
accord-system update speaker.elf
```

This installs or updates a compiled ABAL driver into the active Accord environment.

---

# 8. Learn ABAL Structure

ABAL means:

```text
Accord Bridge Abstraction Layer
```

ABAL acts as a bridge between:

* Accord System
* Hardware drivers
* Software subsystems
* Runtime simulation

ABAL drivers are written using:

```c
#include <driver.h>
#include <accord.h>
```

and compiled using:

```bash
gcc driver.c -o driver.elf
```

ABAL files contain:

* metadata
* hardware/software identity
* Accord configuration
* subsystem initialization
* runtime bridge setup

---

# 9. Learn Hardware Requirements From Rooms

Some simulation rooms expose hardware requirements directly.

Example:

```text
Required:
- Speaker
- XLAND-Compositor
- Compute Machine
```

Players are expected to:

1. identify missing hardware
2. download correct repositories
3. compile ABAL drivers
4. install them using `accord-system`

---

# 10. Learn `accord-system rebuild`

After changing major drivers or software layers, rebuild the Accord environment.

```bash
accord-system rebuild
```

This refreshes:

* hardware mappings
* rendering systems
* Accord subsystem cache
* active bridge states

Rebuild is usually required after:

* changing compositor
* replacing compute hardware
* updating desktop environment
* modifying core ABAL drivers

---

# 11. Return to `games`

After the system is configured correctly:

```bash
games
```

Games that previously failed may now work correctly.

Some advanced games require:

* multiple hardware layers
* specific compositor versions
* compatible compute APIs
* proper Accord rebuild state

---

# Recommended Learning Order

| Step | Topic                   |
| ---- | ----------------------- |
| 1    | Linux Bash              |
| 2    | Internet & curl         |
| 3    | Repository structure    |
| 4    | Games                   |
| 5    | Hardware requirements   |
| 6    | accord-system           |
| 7    | GCC compileDriver       |
| 8    | ABAL structure          |
| 9    | accord-system rebuild   |
| 10   | Advanced driver systems |

---

# Final Notes

Accord OS is intentionally experimental.

Some systems are:

* partially simulated
* runtime dependent
* non-standard compared to real Linux
* heavily abstraction-oriented

The goal is not perfect realism.

The goal is learning system relationships through simulation.
