// An AI assistant wrote this when asked for "a mute list mods can manage,
// and a filter that stars out banned words, wired into the bot".
// It is here to be reviewed. The tests do not load it, but once your own
// src/ works you can import from it to try an input.

import { runChain, logTo, cooldown } from "../src/bot.js";
import { createRouter } from "../src/given.js";
import { commands } from "../src/commands.js";

// A muted user's messages are dropped: the bot says nothing.
export function createMuteList() {
  return {
    muted: [],

    mute(name) {
      this.muted.push(name);
    },

    check(msg, next) {
      if (this.muted.includes(msg.user)) return null;
      return next;
    },
  };
}

// Replaces every banned word in the message with "***".
export function starOut(words) {
  return (msg, next) => {
    for (const word of words) {
      msg.text = msg.text.replaceAll(word, "***");
    }
    return next(msg);
  };
}

// Wiring it in.
const log = [];
const clock = () => Date.now() / 1000;
const mutes = createMuteList();
mutes.mute("spammer");

export const handle = runChain(
  [
    logTo(log),
    mutes.check,
    starOut(["darn", "heck"]),
    cooldown(10, clock()),
  ],
  createRouter(commands),
);
