export async function echoCommand({ args }) {
    return {
        type: "output",
        content: args.join(" ").replace(/^"|"$/g, "")
    };
}