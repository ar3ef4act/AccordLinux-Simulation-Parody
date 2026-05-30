# software-stack.md

# Accord OS — Software Stack Documentation

This document explains software-based system components used inside Accord OS.

Unlike hardware devices, software stack components are usually not visible directly from simulation rooms.
Most software layers operate internally as rendering systems, desktop services, or graphical abstraction bridges.

---

# 1. XLAND-Compositor

```text
Type : XLAND-Compositor
Icon : 🎨
```

XLAND-Compositor is the display server and compositor layer used by Accord OS.

It acts as the graphical bridge between:

* display hardware
* rendering backend
* desktop environment
* games
* Accord rendering system

---

## Description

```text
X11 / Wayland display server and compositor
```

XLAND supports:

* Wayland protocol
* X11 compatibility
* OpenGL rendering
* EGL compositor interface
* GPU acceleration
* Mesa backend integration

---

## Required Metadata Fields

### Base Fields

| Field    | Example          |
| -------- | ---------------- |
| SOFTWARE | XLAND-Compositor |
| DRIVER   | xland-driver     |
| VERSION  | 1.4              |
| PATCH    | 2.1              |

---

### Attribute Fields

| Field          | Example      |
| -------------- | ------------ |
| PROTOCOL       | Wayland      |
| RENDERER       | OpenGL       |
| COMPOSITOR_API | EGL          |
| API_VERSION    | 1.5          |
| ATTRIBUTE      | wayland      |
| ACCORDLIB      | accord_xland |

---

### Accord Added Fields

| Field           | Example |
| --------------- | ------- |
| GPU_ACCELERATOR | Enabled |
| GPU_BACKEND     | Mesa    |

---

## Field Descriptions

| Field           | Description              |
| --------------- | ------------------------ |
| SOFTWARE        | Software component name  |
| DRIVER          | Compositor driver name   |
| VERSION         | Major compositor version |
| PATCH           | Patch/build number       |
| PROTOCOL        | Display protocol         |
| RENDERER        | Rendering backend        |
| COMPOSITOR_API  | Compositor API           |
| API_VERSION     | Protocol API version     |
| GPU_ACCELERATOR | GPU acceleration state   |
| GPU_BACKEND     | GPU backend library      |

---

## Dependency Notes

```text
XLAND-Compositor requires GPU driver support to function properly.
```

Recommended hardware:

* Compute Machine
* External Monitor

---

# 2. Desktop-Environment

```text
Type : Desktop-Environment
Icon : 🖼️
```

Desktop-Environment is the user-facing graphical shell used by Accord OS.

It provides:

* application launcher
* desktop panels
* file manager integration
* graphical workspace
* game launcher support

---

## Description

```text
Window manager and desktop shell environment
```

Desktop-Environment operates above XLAND-Compositor.

---

## Required Metadata Fields

### Base Fields

| Field    | Example             |
| -------- | ------------------- |
| SOFTWARE | Desktop-Environment |
| DRIVER   | desktop-driver      |
| VERSION  | 3.0                 |
| PATCH    | 1.3                 |

---

### Attribute Fields

| Field            | Example        |
| ---------------- | -------------- |
| COMPOSITOR_API   | Wayland        |
| PANEL_ENABLED    | 1              |
| LAUNCHER_ENABLED | 1              |
| FILE_MANAGER     | accord-fm      |
| ATTRIBUTE        | xland          |
| ACCORDLIB        | accord_desktop |

---

### Accord Added Fields

| Field       | Example |
| ----------- | ------- |
| GRAPHIC_API | Vulkan  |

---

## Field Descriptions

| Field            | Description                 |
| ---------------- | --------------------------- |
| SOFTWARE         | Software component name     |
| DRIVER           | Desktop environment driver  |
| VERSION          | Desktop environment version |
| PATCH            | Patch/release number        |
| COMPOSITOR_API   | Compositor compatibility    |
| PANEL_ENABLED    | Enable task panel           |
| LAUNCHER_ENABLED | Enable application launcher |
| FILE_MANAGER     | File manager service        |
| GAMES_LAUNCHER   | Games launcher integration  |
| GRAPHIC_API      | Graphics API used           |

---

## Dependency Notes

```text
Desktop-Environment requires XLAND-Compositor to function correctly.
```

Recommended software stack:

```text
Desktop-Environment
        ↓
XLAND-Compositor
        ↓
Compute Machine
        ↓
External Monitor
```

---

# 3. Network Router

```text
Type : Network
Icon : 🌐
```

Router devices provide network infrastructure for Accord OS.

Unlike graphical software systems, routers are focused on connectivity and internet access.

---

## Description

```text
Network gateway and connectivity device
```

Routers provide:

* DHCP services
* internet gateway access
* local network routing
* online repository connectivity

---

## Field Descriptions

| Field   | Description                |
| ------- | -------------------------- |
| gateway | Default gateway IP address |
| mac     | Router MAC address         |

---

## Dependency Notes

```text
Network devices are required for internet access and repository downloads.
```

Without router connectivity:

* `curl` may fail
* repository access may be unavailable
* online packages cannot be downloaded

---

# Software Stack Relationship

```text
Desktop Environment
        ↓
XLAND-Compositor
        ↓
Compute Machine
        ↓
External Monitor
```

Optional:

```text
Router → Internet → Repository Access
```

---

# Notes

Software stack components are usually updated using:

```bash
accord-system update file.elf
```

Major changes may require:

```bash
accord-system rebuild
```

Improper software stack configuration can cause:

* graphical failure
* black screen
* missing renderer
* compositor startup failure
* unsupported API errors

---

# Final Notes

Software layers in Accord OS are abstraction-based.

The goal is not to emulate a real Linux desktop perfectly.

The goal is to simulate:

* dependency relationships
* rendering pipelines
* hardware abstraction
* compositor architecture
* runtime integration
