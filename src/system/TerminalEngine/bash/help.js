export async function helpCommand({ system, args }) {
    return {
        type: 'output',
        content: [
            "Some available commands:",
            "  ls [path]                       — list directory contents",
            "  cd [path]                       — change directory",
            "  clear                           — clear the terminal",
            "  games                           — open the CLI games list",
            "  ip                              — set IP Address",
            "  curl [url]                      — get something from URL",
            "  ping [url]                      — check connection status",
            "  vi [file]                       — edit a file",
            "  cat [file]                      — display a file",
            "  gcc [input.c] -o [output.elf]   — compile C code",
            "  accord-system                   — system configuration",
            "  exit                            — exit to 'room'"
        ].join('\n')
    };
}
