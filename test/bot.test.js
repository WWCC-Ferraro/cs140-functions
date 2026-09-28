// Tasks 4 and 5 — the assembled bot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBot } from "../src/bot.js";
import { createStats } from "../src/given.js";

const say = (user, text, role = "member") => ({ user, role, text });

// A small, fixed command table, so these tests do not depend on Task 1.
const commands = {
  add: args => String(Number(args[0]) + Number(args[1])),
  ping: () => "pong",
};

function setup() {
  let t = 0;
  const clock = { now: () => t, tick: n => { t += n; } };
  const stats = createStats();
  const log = [];
  const bot = createBot({ commands, stats, now: clock.now, log, seconds: 10 });
  return { bot, stats, log, clock };
}

// Runs fn; if it throws, fails with feedback instead of a bare stack trace.
function noThrow(fn, advice) {
  try {
    return fn();
  } catch (err) {
    if (err instanceof assert.AssertionError) throw err;
    assert.fail(`It threw "${err.message}". ${advice}`);
  }
}

const RECEIVER = "If the message mentions reading a property of undefined, a method was handed over without its object — find the one whose body uses `this` (How a method finds its object).";

test("createBot returns an object with a handle function", () => {
  const { bot } = setup();
  assert.equal(typeof bot?.handle, "function",
    "createBot should return { handle }, where handle is a function msg => reply.");
});

test("a command goes all the way through and gets its reply", () => {
  const { bot } = setup();
  const reply = noThrow(() => bot.handle(say("ada", "!add 2 3")), RECEIVER);
  assert.equal(reply, "5", `!add 2 3 should reply "5"; got ${JSON.stringify(reply)}.`);
  assert.equal(bot.handle(say("ada", "hello")), null, "Ordinary chat should get a null reply — the router says nothing.");
});

test("stats counts each command that gets through", () => {
  const { bot, stats, clock } = setup();
  noThrow(() => {
    bot.handle(say("ada", "!ping"));
    bot.handle(say("bo", "!ping"));
    clock.tick(10);
    bot.handle(say("ada", "!add 1 1"));
  }, RECEIVER);
  assert.deepEqual(stats.counts, { ping: 2, add: 1 },
    `After two !ping and one !add, stats.counts should be { ping: 2, add: 1 }; got ${JSON.stringify(stats.counts)}. Is stats.record in the chain, and is it counting on the stats object you were given?`);
});

test("handle still works when taken off the bot", () => {
  const { bot } = setup();
  const { handle } = bot;
  const reply = noThrow(() => handle(say("ada", "!ping")),
    "handle was called on its own, with no object in front of it — the way the chat connection will always call it. Does handle, or a method anywhere in its chain, depend on `this`? (How a method finds its object)");
  assert.equal(reply, "pong", `A detached handle should still reply "pong"; got ${JSON.stringify(reply)}.`);
});

test("handle can be handed straight to map", () => {
  const { bot } = setup();
  const replies = noThrow(() => [say("ada", "!ping"), say("bo", "!ping")].map(bot.handle),
    "map calls handle bare, with (msg, index, array). Does handle, or a method anywhere in its chain, depend on `this` — or on more than its first argument? (Who calls a callback, and when)");
  assert.deepEqual(replies, ["pong", "pong"], `Expected ["pong", "pong"]; got ${JSON.stringify(replies)}.`);
});

test("a member sending too fast is slowed down, and the refusal is logged but not counted", () => {
  const { bot, stats, log } = setup();
  noThrow(() => {
    bot.handle(say("ada", "!ping"));
    const reply = bot.handle(say("ada", "!ping"));
    assert.equal(reply, "slow down, ada", `A member's second command straight away should get "slow down, ada"; got ${JSON.stringify(reply)}.`);
  }, RECEIVER);
  assert.deepEqual(stats.counts, { ping: 1 },
    `Only the command that got through should be counted; got ${JSON.stringify(stats.counts)}. Check the order of the chain: stats comes after cooldown.`);
  assert.deepEqual(log, ["> ada: !ping", "< pong", "> ada: !ping", "< slow down, ada"],
    `The log should show both messages and both replies, the refusal included; got ${JSON.stringify(log)}. Check the order of the chain: logging comes first.`);
});

test("mods are never slowed down", () => {
  const { bot } = setup();
  const replies = noThrow(() => [1, 2, 3].map(() => bot.handle(say("bo", "!ping", "mod"))), RECEIVER);
  assert.deepEqual(replies, ["pong", "pong", "pong"],
    `A mod sending three commands at once should get three replies; got ${JSON.stringify(replies)}. This is Task 5.`);
});

test("a mod skipping the cooldown does not let members skip it", () => {
  const { bot } = setup();
  noThrow(() => {
    bot.handle(say("bo", "!ping", "mod"));
    bot.handle(say("ada", "!ping"));
    const reply = bot.handle(say("ada", "!ping"));
    assert.equal(reply, "slow down, ada",
      `A member's second command should still be slowed down after a mod has spoken; got ${JSON.stringify(reply)}.`);
  }, RECEIVER);
});

test("two bots do not share anything", () => {
  const one = setup(), two = setup();
  noThrow(() => {
    one.bot.handle(say("ada", "!ping"));
    const reply = two.bot.handle(say("ada", "!ping"));
    assert.equal(reply, "pong", "A second bot slowed ada down because the first bot had seen her. Each bot needs its own cooldown.");
  }, RECEIVER);
  assert.deepEqual(two.stats.counts, { ping: 1 }, "Each bot should count into its own stats object.");
  assert.equal(two.log.length, 2, "Each bot should write only to its own log.");
});
