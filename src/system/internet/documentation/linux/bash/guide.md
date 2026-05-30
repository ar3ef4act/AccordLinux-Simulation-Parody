# Terminal Commands & Bash Guide

## Overview

The Accord terminal provides 20+ bash-like commands for file operations, system management, and driver development.

# Command Categories

## File Operations

### ls — List Directory Contents

**Syntax:**
```bash
ls              # List current directory
ls <path>       # List specific directory
```

**Output:**
```
boot/
etc/
home/
var/
```

**Use Cases:**
- Explore file system
- See what files/directories exist
- Browse driver folders

---

### cd — Change Directory

**Syntax:**
```bash
cd <path>       # Change to absolute or relative path
cd ..           # Go up one level
cd              # Go to home (/home/player)
cd /etc/accord  # Jump to specific path
```

**Examples:**
```bash
cd /src/drivers
cd ..
cd /home/player
cd /etc/accord
```

---

### pwd — Print Working Directory

**Syntax:**
```bash
pwd             # Show current directory path
```

**Output:**
```
/home/player/projects
```

**Use Cases:**
- Verify your current location
- Copy full path to navigate elsewhere

---

### cat — Display File Contents

**Syntax:**
```bash
cat <file>              # Show single file
```

**Examples:**
```bash
cat /etc/accord/configuration.accord
cat driver.c
```

**Output:**
```
[contents of file]
```

---

### mkdir — Create Directories

**Syntax:**
```bash
mkdir <dir>             # Create single directory
mkdir -p <path>         # Create nested directories
```

**Examples:**
```bash
mkdir projects
mkdir -p /src/drivers/audio
mkdir -p /etc/ABAL/gpu
```

---

### touch — Create Empty Files

**Syntax:**
```bash
touch <file>            # Create empty file
```

**Examples:**
```bash
touch driver.c
touch myfile.txt
```

---

### echo — Print content of filoe

**Syntax:**
```bash
echo <text>             # Print text
```

**Examples:**
```bash
echo "Hello World"
```

---

### rm — Remove Files/Directories

**Syntax:**
```bash
rm <file>               # Remove file
```

**Examples:**
```bash
rm oldfile.txt
```

**⚠️ Warning:** Deleted files cannot be recovered!

---

### cp — Copy Files/Directories

**Syntax:**
```bash
cp <source> <dest>              # Copy file
```

**Examples:**
```bash
cp driver.c driver_backup.c
```

---

## mv — Move or Rename Files

**Syntax:**
```bash
mv <source> <dest>              # Move or rename
```

**Examples:**
```bash
mv oldname.txt newname.txt
mv speaker.elf /src/drivers/
```

---

## accord-system — System Rebuild & Status

**Syntax:**
```bash
accord-system                   # Show system status
accord-system rebuild           # Rebuild system
accord-system show              # Detailed information
```

**Alias:** `system-rebuild`

**What it does:**
1. Reads `/etc/accord/configuration.accord`
2. Validates all compiled drivers
3. Checks dependencies
4. Updates `/etc/accord/active.accord`
5. Sets `systemStatus`

**Examples:**
```bash
accord-system
system-rebuild
accord-system rebuild
```

**Output:**
```
Accord System Status:
GPU: ✓ Functional
Audio: ✓ Functional
Monitor: ✗ Not Functional
XLAND: ✓ Functional
Desktop Environment: ✓ Functional
```

---

---

## Network Commands

### ip — IP Configuration

**Syntax:**
```bash
ip addr show                            # Show all interfaces
ip addr add <addr>/<prefix> dev <iface> # Assign IP
ip addr del dev <iface>                 # Remove IP
ip link set <iface> up                  # Bring interface up
ip link set <iface> down                # Bring interface down
```

**Examples:**
```bash
ip addr show
ip addr add 192.168.10.5/24 dev eth0
ip link set eth0 up
ip addr del dev eth0
```

**Requirements for IP assignment:**
- IP must be in gateway subnet (default 192.168.10.0/24)
- Valid range: 192.168.10.2 - 192.168.10.254

---

### ping — Test Connectivity

**Syntax:**
```bash
ping <host>                 # Ping host or IP
```

**Special hosts:**
- `localhost` — Local machine (127.0.0.1)
- `gateway` — Router gateway (192.168.10.1)

**Examples:**
```bash
ping gateway
ping 192.168.10.1
ping localhost
```

**Requirements:**
- eth0 must be up
- eth0 must have an IP address

**Output:**
```
PING 192.168.10.1 (192.168.10.1): 56 data bytes
64 bytes from 192.168.10.1: icmp_seq=0 ttl=64 time=5 ms
64 bytes from 192.168.10.1: icmp_seq=1 ttl=64 time=4 ms
```

---

### curl — Download Files

**Syntax:**
```bash
curl <url> -o <destination>         # Download file
curl <url> --output <destination>   # Alternative syntax
```

**Examples:**
```bash
curl http://repo.accord.org/api/full-devkit -o ./
curl http://repo.accord.org/api/full-devkit -o /home/player/devkit
```

**Requirements:**
- Router must be connected: `hw connect router`
- eth0 must be up: `ip link set eth0 up`
- eth0 must have IP: `ip addr add 192.168.10.5/24 dev eth0`

**Output:**
```
Connecting to repo.accord.org... (via 192.168.10.5)
  [████████████████████] 100%  6.2MB
Saved to '/home/player/' (6 files, 6.2MB)
```

---

## Compilation & Development

### gcc — C Compiler for Drivers

**Syntax:**
```bash
gcc <source.c> -o <output.elf>      # Compile with output name
gcc <source.c>                      # Compile to a.elf (default)
```

**What it does:**
- Parses C source code
- Validates driver struct format
- Generates ABAL metadata
- Calculates hashes (ACCORD_FLAG, ATTRIBUTE_FLAG)
- Creates ELF executable

**Examples:**
```bash
gcc speaker.c -o speaker.elf
gcc gpu.c -o gpu_driver.elf
gcc monitor.c
```

**Output (Success):**
```
GCC Accord v1.0 — Custom C→ELF Compiler
Parsing speaker.c...
Validating struct...
Compiling...
✓ Compilation successful!
Output: speaker.elf (1024 bytes)
```

**Output (Failure):**
```
✗ Compilation failed!
SCCC: field 'CHANNELS' is missing or could not be read
```

---

### vi — Text Editor

**Syntax:**
```bash
vi <file>                           # Open file to edit
```

**Controls:**
- Type to edit
- `Esc` to exit edit mode
- After `Esc`, options appear:
  - `Save` — Save changes
  - `Quit` — Exit without saving
  - `SaveAndQuit` — Save and exit

**Examples:**
```bash
vi speaker.c
vi /etc/accord/configuration.accord
viconfac
```

---

## Display & Games

### clear — Clear Screen

**Syntax:**
```bash
clear       # Clear terminal output
```

---

### gui — Enter Desktop Mode

**Syntax:**
```bash
gui         # Launch desktop environment
```

**Requirements:**
- XLAND Compositor must be enabled
- Desktop Environment must be enabled

**What happens:**
- Terminal disappears
- Desktop environment launches
- Can use GUI applications
- Type `exit` to return to CLI

---

### games — List and Launch Games

**Syntax:**
```bash
games                   # Show available games
run-games <number|name> # Launch specific game
```

**Games:**
1. Snake — Terminal-based (no hardware needed)
2. PixelAdventure — Requires Compositor + Desktop + Audio (Optional)
3. Labyrinth of Confuse — Requires GPU + Compositor + Desktop
4. Pixel Game — Requires Compositor + Desktop

**Examples:**
```bash
games
run-games
```

---

### exit — Return to Room

**Syntax:**
```bash
exit        # Exit CLI back to room
```

---

## Workflow Examples

## Setting Up Network

```bash
# Bring up network interface
ip link set eth0 up

# Assign IP (must be in 192.168.10.0/24 subne
t)
ip addr add 192.168.10.10/24 dev eth0

# Verify configuration
ip addr show

# Test connectivity
ping gateway
```

## Developing and Deploying a Driver

```bash
# 1. Create driver code
vi speaker.c

# 2. Compile to ELF
gcc speaker.c -o speaker.elf

# 3. Deploy driver
mv speaker.elf /src/drivers/

# 4. Rebuild system
system-rebuild

```

## Downloading Files from Internet

```bash
# 1. Set up network
ip link set eth0 up
ip addr add 192.168.10.5/24 dev eth0

# 2. Test connectivity
ping gateway

# 3. Download file
curl http://repo.accord.org/api/full-devkit -o ./

# 5. Verify download
ls
```

## Creating Project Directory

```bash
# Create project structure
mkdir -p /home/player/projects/myapp/src
mkdir -p /home/player/projects/myapp/drivers

# Navigate to project
cd /home/player/projects/myapp

# Create initial files
touch src/main.c
touch drivers/driver1.c
touch drivers/driver2.c

# Verify structure
ls -a
```

---

## Command Aliases

Some commands have shortcuts:

| Alias | Full Command |
|-------|------|
| `system-rebuild` | `accord-system rebuild` |
| `viconfac` | `vi /etc/accord/configuration.accord` |
| `a` | `cd` (shortcut, may not be available) |

---

**Next:** [Driver Structures & Repository](../repository/guide.md)
