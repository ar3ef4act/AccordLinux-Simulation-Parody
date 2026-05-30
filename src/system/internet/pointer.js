/**
 * pointer.js — Internet manifest untuk Accord OS simulasi
 *
 * Konten file disimpan langsung sebagai string di sini — tidak perlu file fisik.
 * Kalau player coba cat file hasil curl, akan muncul pesan restricted.
 *
 * Format file:
 *   {
 *     type:         'file',
 *     content:      string,
 *     extension:    'h' | 'c' | ...,
 *     restricted:   true,
 *     downloadTime: ms,
 *     size:         '512b',
 *   }
 *
 * Format folder:
 *   {
 *     type:         'dir',
 *     downloadTime: ms,
 *     size:         '3.4kb',
 *     children: { 'filename.ext': { content, extension, restricted? } }
 *   }
 */

// ── File contents ─────────────────────────────────────────────────────────────

// linux
const DRIVER_H = `// driver.h — Linux driver interface
#ifndef DRIVER_H
#define DRIVER_H
void init_driver(const char* hardware, const char* model);
void driver_conf(const char* attribute);
#endif`;

const DRIVER_C = `// driver.c — Linux driver interface implementation
#include "driver.h"`;

// accord
const ACCORD_H = `// accord.h — Accord OS integration
#ifndef ACCORD_H
#define ACCORD_H
void init_accord_env(const char* chip, float version);
void init_accord_system(const char* accordlib);
#endif`;

const ACCORD_C = `// accord.c — Accord OS integration implementation
#include "accord.h"`;

// c-devkit
const COMPONENT_H = `// component.h — Accord C DevKit
#ifndef COMPONENT_H
#define COMPONENT_H
typedef unsigned int  uint;
typedef unsigned char byte;
#define ACCORD_OK    0
#define ACCORD_ERR  -1
#endif`;

const COMPONENT_C = `// component.c — Accord C DevKit implementation
#include "component.h"`;

// audio — untuk Speaker driver
const AUDIO_H = `// audio.h — Accord audio subsystem
#ifndef AUDIO_H
#define AUDIO_H
void audio_set_channels(int channels);
void audio_set_output(const char* output);
void audio_set_protocol(const char* protocol);
void audio_set_sample_rate(int sample_rate);
#endif`;

const AUDIO_C = `// audio.c — Accord audio subsystem implementation
#include "audio.h"`;

// graphic — untuk XLAND-Compositor dan Desktop-Environment
const GRAPHIC_H = `// graphic.h — Accord graphics stack
#ifndef GRAPHIC_H
#define GRAPHIC_H
void xland_set_protocol(const char* protocol);
void xland_set_renderer(const char* renderer);
void xland_set_compositor_api(const char* api);
void xland_set_api_version(float version);
void xland_set_gpu_accelerator(const char* accelerator);
void xland_set_gpu_backend(const char* backend);
void desktop_set_compositor_api(const char* api);
void desktop_set_panel(int enabled);
void desktop_set_launcher(int enabled);
void desktop_set_file_manager(const char* fm);
void desktop_set_games_launcher(const char* launcher);
void desktop_set_graphic_api(const char* api);
#endif`;

const GRAPHIC_C = `// graphic.c — Accord graphics stack implementation
#include "graphic.h"`;

// display — untuk External Monitor driver
const DISPLAY_H = `// display.h — Accord display interface
#ifndef DISPLAY_H
#define DISPLAY_H
void display_set_resolution(const char* resolution);
void display_set_refresh_rate(int rate);
void display_set_color_format(const char* format);
void display_set_interface(const char* iface);
#endif`;

const DISPLAY_C = `// display.c — Accord display interface implementation
#include "display.h"`;

// multithread — untuk Compute Machine driver
const MULTITHREAD_H = `// multithread.h — Accord compute/multithread interface
#ifndef MULTITHREAD_H
#define MULTITHREAD_H
void compute_set_cores(int cores);
void compute_set_threads(int threads_per_core);
void compute_set_vram(int vram_mbit);
void compute_set_memory(int memory_mbit);
void compute_set_clock(float clock_speed);
void compute_set_raytracing(const char* support);
void compute_set_graphic_api(const char* api);
void compute_set_compute_api(const char* api);
#endif`;

const MULTITHREAD_C = `// multithread.c — Accord compute/multithread implementation
#include "multithread.h"`;

// ── Restricted file wrapper ───────────────────────────────────────────────────
const r = (content, extension) => ({ content, extension, restricted: true });

// ── Manifest ──────────────────────────────────────────────────────────────────
export const internetPointer = {

    // ── Individual files ──────────────────────────────────────────────────────

    // linux
    'https://common.linux.org/x86_64/driver.h': {
        type: 'file', downloadTime: 600, size: '512b', ...r(DRIVER_H, 'h'),
    },
    'https://common.linux.org/x86_64/driver.c': {
        type: 'file', downloadTime: 600, size: '256b', ...r(DRIVER_C, 'c'),
    },

    // accord
    'https://repo.accord.org/lib/accord.h': {
        type: 'file', downloadTime: 600, size: '512b', ...r(ACCORD_H, 'h'),
    },
    'https://repo.accord.org/lib/accord.c': {
        type: 'file', downloadTime: 600, size: '256b', ...r(ACCORD_C, 'c'),
    },

    // audio
    'https://common.linux.org/x86_64/audio.h': {
        type: 'file', downloadTime: 600, size: '512b', ...r(AUDIO_H, 'h'),
    },
    'https://common.linux.org/x86_64/audio.c': {
        type: 'file', downloadTime: 600, size: '256b', ...r(AUDIO_C, 'c'),
    },

    // graphic
    'https://common.linux.org/x86_64/graphic.h': {
        type: 'file', downloadTime: 600, size: '768b', ...r(GRAPHIC_H, 'h'),
    },
    'https://common.linux.org/x86_64/graphic.c': {
        type: 'file', downloadTime: 600, size: '256b', ...r(GRAPHIC_C, 'c'),
    },

    // display
    'https://common.linux.org/x86_64/display.h': {
        type: 'file', downloadTime: 600, size: '512b', ...r(DISPLAY_H, 'h'),
    },
    'https://common.linux.org/x86_64/display.c': {
        type: 'file', downloadTime: 600, size: '256b', ...r(DISPLAY_C, 'c'),
    },

    // multithread
    'https://common.linux.org/x86_64/multithread.h': {
        type: 'file', downloadTime: 600, size: '640b', ...r(MULTITHREAD_H, 'h'),
    },
    'https://common.linux.org/x86_64/multithread.c': {
        type: 'file', downloadTime: 600, size: '256b', ...r(MULTITHREAD_C, 'c'),
    },

    // Bundle per driver type
    'https://repo.accord.org/bundle/audio-dev': {
        type: 'dir', downloadTime: 2000, size: '2.8kb',
        children: {
            'driver.h': r(DRIVER_H, 'h'),
            'driver.c': r(DRIVER_C, 'c'),
            'accord.h': r(ACCORD_H, 'h'),
            'accord.c': r(ACCORD_C, 'c'),
            'audio.h': r(AUDIO_H, 'h'),
            'audio.c': r(AUDIO_C, 'c'),
        },
    },
    'https://repo.accord.org/bundle/display-dev': {
        type: 'dir', downloadTime: 2000, size: '2.8kb',
        children: {
            'driver.h': r(DRIVER_H, 'h'),
            'driver.c': r(DRIVER_C, 'c'),
            'accord.h': r(ACCORD_H, 'h'),
            'accord.c': r(ACCORD_C, 'c'),
            'display.h': r(DISPLAY_H, 'h'),
            'display.c': r(DISPLAY_C, 'c'),
        },
    },
    'https://repo.accord.org/bundle/multithread-dev': {
        type: 'dir', downloadTime: 2500, size: '3.2kb',
        children: {
            'driver.h': r(DRIVER_H, 'h'),
            'driver.c': r(DRIVER_C, 'c'),
            'accord.h': r(ACCORD_H, 'h'),
            'accord.c': r(ACCORD_C, 'c'),
            'multithread.h': r(MULTITHREAD_H, 'h'),
            'multithread.c': r(MULTITHREAD_C, 'c'),
        },
    },
    'https://repo.accord.org/bundle/graphic-dev': {
        type: 'dir', downloadTime: 2000, size: '2.8kb',
        children: {
            'driver.h': r(DRIVER_H, 'h'),
            'driver.c': r(DRIVER_C, 'c'),
            'accord.h': r(ACCORD_H, 'h'),
            'accord.c': r(ACCORD_C, 'c'),
            'graphic.h': r(GRAPHIC_H, 'h'),
            'graphic.c': r(GRAPHIC_C, 'c'),
        },
    },

    // Full devkit — semua sekaligus
    'https://repo.accord.org/bundle/full-devkit': {
        type: 'dir', downloadTime: 4000, size: '9.6kb',
        children: {
            'driver.h': r(DRIVER_H, 'h'),
            'driver.c': r(DRIVER_C, 'c'),
            'accord.h': r(ACCORD_H, 'h'),
            'accord.c': r(ACCORD_C, 'c'),
            'component.h': r(COMPONENT_H, 'h'),
            'component.c': r(COMPONENT_C, 'c'),
            'audio.h': r(AUDIO_H, 'h'),
            'audio.c': r(AUDIO_C, 'c'),
            'graphic.h': r(GRAPHIC_H, 'h'),
            'graphic.c': r(GRAPHIC_C, 'c'),
            'display.h': r(DISPLAY_H, 'h'),
            'display.c': r(DISPLAY_C, 'c'),
            'multithread.h': r(MULTITHREAD_H, 'h'),
            'multithread.c': r(MULTITHREAD_C, 'c'),
        },
    },

    'https://repo.accord.org/lib/accord-games': {
        type: 'dir', downloadTime: 1800, size: '1.1kb',
        children: {
            'accord-games.pkg': {
                type: 'file',
                extension: 'pkg',
                content: 'Move this package to /src/ABAL, Accord Games package installed successfully.',
            },
        },
    },
};