// Your work goes here. Every function below has its contract in the comment
// above it; the tests in test/ check exactly those contracts.
//
// Two words used throughout:
//
//   handler     (args, msg) => reply            — one command, e.g. !add
//   middleware  (msg, next) => reply            — one step every message
//                                                 passes through on its way
//                                                 to the handlers
//
// A middleware decides whether the rest of the chain runs. Calling next(msg)
// runs everything after it and hands back the reply; returning without
// calling next stops the message there.

import { parseCommand, createRouter } from "./given.js";

// ─── Task 1 ────────────────────────────────────────────────────────────────

/**
 * Returns a new handler that checks the argument count before calling
 * `handler`.
 *
 *   wrong number of args -> "usage: " + usage, and `handler` is never called
 *   right number         -> whatever handler(args, msg) returns
 *
 * @param {number} count
 * @param {string} usage   e.g. "!add <a> <b>"
 * @param {function(string[], object): string} handler
 * @returns {function(string[], object): string}
 */
export function withUsage(count, usage, handler) {
  throw new Error("not implemented");
}

/**
 * Returns a new handler that only lets messages from `role` through.
 *
 *   msg.role !== role -> "only a " + role + " can do that", `handler` not called
 *   msg.role === role -> whatever handler(args, msg) returns
 *
 * @param {string} role
 * @param {function(string[], object): string} handler
 * @returns {function(string[], object): string}
 */
export function onlyFor(role, handler) {
  throw new Error("not implemented");
}

// ─── Task 2 ────────────────────────────────────────────────────────────────

/**
 * Joins a list of middleware and a final function into ONE function,
 * msg => reply.
 *
 * The first middleware is called with (msg, next). Its `next` calls the
 * second middleware with (msg, next), and so on. The last middleware's
 * `next` calls final(msg). Each middleware's return value is the reply.
 *
 *   runChain([], final)        behaves exactly like final
 *   runChain([a, b], final)    a runs first, then b, then final
 *
 * The chain is built once and can handle any number of messages.
 *
 * @param {Array<function(object, function): (string|null)>} middlewares
 * @param {function(object): (string|null)} final
 * @returns {function(object): (string|null)}
 */
export function runChain(middlewares, final) {
  throw new Error("not implemented");
}

// ─── Task 3 ────────────────────────────────────────────────────────────────

/**
 * Returns a middleware that writes each message and its reply to `lines`.
 *
 *   before the rest of the chain runs: push "> " + msg.user + ": " + msg.text
 *   after it returns a reply:          push "< " + reply
 *   if the reply is null:              push nothing more
 *
 * It passes the reply back unchanged.
 *
 * @param {string[]} lines
 * @returns {function(object, function): (string|null)}
 */
export function logTo(lines) {
  throw new Error("not implemented");
}

/**
 * Returns a middleware that stops a user sending commands too fast.
 *
 * `now` is a function you are given: now() returns the current time in
 * seconds. Ordinary chat (not a command) always passes straight through.
 *
 *   a user's first command                 -> passes on; remember when
 *   same user, fewer than `seconds` later  -> "slow down, " + msg.user,
 *                                             and the chain stops here
 *   same user, `seconds` or more later     -> passes on; remember when
 *
 * Only commands that pass on reset a user's time. Each call to cooldown()
 * makes a cooldown with its own memory.
 *
 * @param {number} seconds
 * @param {function(): number} now
 * @returns {function(object, function): (string|null)}
 */
export function cooldown(seconds, now) {
  throw new Error("not implemented");
}

// ─── Tasks 4 and 5 ─────────────────────────────────────────────────────────

/**
 * Assembles the bot. Every message passes through, in this order:
 *
 *   1. logTo(log)                — so refused commands are logged too
 *   2. cooldown(seconds, now)    — mods are never slowed down (Task 5)
 *   3. stats.record              — counts only commands that got through
 *   4. createRouter(commands)    — finds the handler and runs it
 *
 * Returns { handle }, where handle(msg) returns the reply. `handle` must
 * keep working when it is taken off the object and called on its own —
 * the chat connection will do exactly that.
 *
 * @param {{ commands: object, stats: object, now: function(): number,
 *           log: string[], seconds: number }} options
 * @returns {{ handle: function(object): (string|null) }}
 */
export function createBot({ commands, stats, now, log, seconds }) {
  throw new Error("not implemented");
}
