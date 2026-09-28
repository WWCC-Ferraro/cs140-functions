// The bot's commands. Each handler is called as handler(args, msg) and
// returns the bot's reply. They all work — and four of them repeat the same
// checks. Task 1 asks you to remove that repetition.

import { withUsage, onlyFor } from "./bot.js";

function add(args, msg) {
  if (args.length !== 2) return "usage: !add <a> <b>";
  return String(Number(args[0]) + Number(args[1]));
}

function shout(args, msg) {
  if (args.length !== 1) return "usage: !shout <word>";
  return args[0].toUpperCase() + "!";
}

function ban(args, msg) {
  if (msg.role !== "mod") return "only a mod can do that";
  if (args.length !== 1) return "usage: !ban <name>";
  return args[0] + " is banned";
}

function clear(args, msg) {
  if (msg.role !== "mod") return "only a mod can do that";
  if (args.length !== 0) return "usage: !clear";
  return "chat cleared";
}

export const commands = { add, shout, ban, clear };
