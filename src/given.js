// Written by a teammate. It works — read it, use it, and leave it as it is.
//
// A message is a plain object:
//   { user: "ada", role: "member", text: "!add 2 3" }
// role is "member" or "mod". A reply is a string, or null for "say nothing".

/**
 * Splits a command message into its name and arguments.
 * Text that does not start with "!" is ordinary chat, not a command.
 *
 *   parseCommand("!add 2 3")   -> { name: "add", args: ["2", "3"] }
 *   parseCommand("hello")      -> null
 *
 * @param {string} text
 * @returns {{ name: string, args: string[] } | null}
 */
export function parseCommand(text) {
  if (!text.startsWith("!")) return null;
  const [name, ...args] = text.slice(1).trim().split(/\s+/);
  return { name, args: args.filter(a => a !== "") };
}

/**
 * Builds the last step of every chain: it finds the command's handler in the
 * table and calls it as handler(args, msg).
 *
 *   ordinary chat   -> null
 *   unknown command -> "unknown command: !dance"
 *
 * @param {Object<string, function(string[], object): string>} commands
 * @returns {function(object): (string|null)}
 */
export function createRouter(commands) {
  return msg => {
    const command = parseCommand(msg.text);
    if (command === null) return null;
    const handler = commands[command.name];
    if (handler === undefined) return "unknown command: !" + command.name;
    return handler(command.args, msg);
  };
}

/**
 * Counts how many times each command is used.
 * record(msg, next) is shaped like a middleware (see src/bot.js): it counts
 * the command, then passes the message on.
 *
 *   const stats = createStats();
 *   stats.counts        -> { add: 2, shout: 1 } after some use
 */
export function createStats() {
  return {
    counts: {},

    record(msg, next) {
      const command = parseCommand(msg.text);
      if (command !== null) {
        this.counts[command.name] = (this.counts[command.name] ?? 0) + 1;
      }
      return next(msg);
    },
  };
}
