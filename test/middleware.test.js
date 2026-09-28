// Task 3 — logTo and cooldown, each tested on its own with a stand-in next.
import { test } from "node:test";
import assert from "node:assert/strict";
import { logTo, cooldown } from "../src/bot.js";

const say = (user, text, role = "member") => ({ user, role, text });

// A clock the test controls: tick(n) moves time forward n seconds.
function fakeClock(start = 100) {
  let t = start;
  return { now: () => t, tick: n => { t += n; } };
}

// A stand-in for the rest of the chain that counts its calls.
function counter(reply = "ok") {
  const next = m => { next.calls++; return reply; };
  next.calls = 0;
  return next;
}

test("logTo returns a middleware", () => {
  const mw = logTo([]);
  assert.equal(typeof mw, "function",
    `logTo(lines) should return a middleware, (msg, next) => reply. It returned ${typeof mw}.`);
});

test("logTo writes the message before the rest runs, and the reply after", () => {
  const lines = [];
  let seenWhileRunning = null;
  const reply = logTo(lines)(say("ada", "!add 2 3"), () => { seenWhileRunning = [...lines]; return "5"; });
  assert.deepEqual(seenWhileRunning, ["> ada: !add 2 3"],
    `When the rest of the chain ran, the log should already hold "> ada: !add 2 3". It held ${JSON.stringify(seenWhileRunning)}. Which line runs before next is called?`);
  assert.deepEqual(lines, ["> ada: !add 2 3", "< 5"],
    `Expected the log ["> ada: !add 2 3", "< 5"]; got ${JSON.stringify(lines)}.`);
  assert.equal(reply, "5", "logTo must hand back the reply it got from next, unchanged.");
});

test("logTo writes nothing for a null reply, and passes null back", () => {
  const lines = [];
  const reply = logTo(lines)(say("ada", "hello"), () => null);
  assert.deepEqual(lines, ["> ada: hello"],
    `A null reply means the bot says nothing, so only the incoming line belongs in the log. Got ${JSON.stringify(lines)}.`);
  assert.equal(reply, null, `logTo should pass the null reply back; it gave ${JSON.stringify(reply)}.`);
});

test("two logs made by logTo stay separate", () => {
  const a = [], b = [];
  logTo(a)(say("ada", "hi"), () => null);
  assert.equal(b.length, 0, "Writing through one logTo middleware changed a different log. Each should write only to the array it was given.");
  assert.equal(a.length, 1, "The log passed to logTo did not receive the line.");
});

test("cooldown returns a middleware and does not read the clock yet", () => {
  let reads = 0;
  const mw = cooldown(10, () => { reads++; return 0; });
  assert.equal(typeof mw, "function",
    `cooldown(seconds, now) should return a middleware; it returned ${typeof mw}.`);
  assert.equal(reads, 0,
    "cooldown read the clock while it was being made. now is a callback: the time that matters is when each message arrives.");
});

test("cooldown lets a user's first command through", () => {
  const clock = fakeClock();
  const next = counter("5");
  const reply = cooldown(10, clock.now)(say("ada", "!add 2 3"), next);
  assert.equal(next.calls, 1, "The first command from a user should reach the rest of the chain.");
  assert.equal(reply, "5", "cooldown should return the reply from next when it lets a command through.");
});

test("cooldown refuses a second command inside the window, and stops the chain", () => {
  const clock = fakeClock();
  const mw = cooldown(10, clock.now);
  const next = counter();
  mw(say("ada", "!add 2 3"), next);
  clock.tick(3);
  const reply = mw(say("ada", "!shout hi"), next);
  assert.equal(reply, "slow down, ada",
    `Three seconds later, inside a 10-second window, the reply should be "slow down, ada"; got ${JSON.stringify(reply)}.`);
  assert.equal(next.calls, 1,
    "The refused command still reached the rest of the chain. To stop a message, return without calling next.");
});

test("cooldown lets a command through once the window has passed", () => {
  const clock = fakeClock();
  const mw = cooldown(10, clock.now);
  const next = counter();
  mw(say("ada", "!add 2 3"), next);
  clock.tick(10);
  mw(say("ada", "!add 2 3"), next);
  assert.equal(next.calls, 2,
    "Exactly 10 seconds later the command should pass. If it was refused, check whether you read the clock each time a message arrives — calling now() once, early, freezes the time.");
});

test("a refused command does not restart the window", () => {
  const clock = fakeClock();
  const mw = cooldown(10, clock.now);
  const next = counter();
  mw(say("ada", "!a"), next);   // t = 100, passes
  clock.tick(6);
  mw(say("ada", "!b"), next);   // t = 106, refused
  clock.tick(4);
  mw(say("ada", "!c"), next);   // t = 110, 10 s after the last command that passed
  assert.equal(next.calls, 2,
    "A command 10 seconds after the last one that passed was refused. Only a command that gets through should reset the user's time.");
});

test("cooldown keeps a separate time for each user", () => {
  const clock = fakeClock();
  const mw = cooldown(10, clock.now);
  const next = counter();
  mw(say("ada", "!a"), next);
  mw(say("bo", "!a"), next);
  assert.equal(next.calls, 2, "bo's first command was refused because ada had just sent one. The window belongs to each user.");
});

test("ordinary chat is never slowed down, and does not start a window", () => {
  const clock = fakeClock();
  const mw = cooldown(10, clock.now);
  const next = counter(null);
  mw(say("ada", "hello"), next);
  mw(say("ada", "hello again"), next);
  mw(say("ada", "!add 1 1"), next);
  assert.equal(next.calls, 3,
    "Chat that is not a command should pass straight through and should not count as a command. parseCommand (in given.js) tells you which is which.");
});

test("two cooldowns have their own memory", () => {
  const clock = fakeClock();
  const first = cooldown(10, clock.now);
  const second = cooldown(10, clock.now);
  const next = counter();
  first(say("ada", "!a"), next);
  second(say("ada", "!a"), next);
  assert.equal(next.calls, 2,
    "A second cooldown refused ada because the first one had seen her. Where does your record of users live — inside each call to cooldown, or once for the whole file? (Closures keep their surroundings)");
});
