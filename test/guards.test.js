// Task 1 — withUsage, onlyFor, and the command table built from them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { withUsage, onlyFor } from "../src/bot.js";
import { commands } from "../src/commands.js";

const member = { user: "ada", role: "member", text: "" };
const mod = { user: "bo", role: "mod", text: "" };

// A handler that remembers every call it gets.
function spy(reply = "ran") {
  const calls = [];
  const handler = (args, msg) => {
    calls.push({ args, msg });
    return reply;
  };
  return { handler, calls };
}

test("withUsage returns a handler, and calls nothing yet", () => {
  const { handler, calls } = spy();
  const guarded = withUsage(1, "!x <thing>", handler);
  assert.equal(typeof guarded, "function",
    `withUsage(...) should hand back a new function — a handler the router can call later. It returned ${typeof guarded}. See "Returning functions" in Higher-order functions, built by hand.`);
  assert.equal(calls.length, 0,
    "Building the guarded handler called the original handler already. withUsage only wraps it; the router decides when it runs (Who calls a callback, and when).");
});

test("withUsage: the right number of arguments reaches the handler, with args and msg", () => {
  const { handler, calls } = spy("done");
  const reply = withUsage(2, "!x <a> <b>", handler)(["1", "2"], member);
  assert.equal(calls.length, 1,
    `The wrapped handler should run once when the count is right; it ran ${calls.length} time(s).`);
  assert.deepEqual(calls[0].args, ["1", "2"],
    "The wrapped handler did not receive the args it was called with. You are its caller now — pass along what you were given, in the same order.");
  assert.equal(calls[0].msg, member,
    "The wrapped handler did not receive the message. Handlers are called as handler(args, msg); keep that shape when you call it.");
  assert.equal(reply, "done",
    `The guarded handler should hand back whatever the wrapped handler returned ("done"); it gave ${JSON.stringify(reply)}. Is its answer being returned, or only computed?`);
});

test("withUsage: the wrong number of arguments gets the usage line, and the handler never runs", () => {
  const { handler, calls } = spy();
  const guarded = withUsage(2, "!x <a> <b>", handler);
  assert.equal(guarded(["1"], member), "usage: !x <a> <b>",
    "Too few arguments should reply with \"usage: \" followed by the usage text.");
  assert.equal(guarded(["1", "2", "3"], member), "usage: !x <a> <b>",
    "Too many arguments should get the usage line too — the count must match exactly.");
  assert.equal(calls.length, 0,
    "The wrapped handler ran even though the count was wrong. The guard decides whether to call it at all.");
});

test("withUsage: two guarded handlers keep their own count and usage", () => {
  const one = withUsage(1, "!one <a>", () => "one");
  const none = withUsage(0, "!none", () => "none");
  const got1 = one(["a"], member);
  assert.equal(got1, "one",
    `withUsage(1, ...) given one argument should reply "one"; it gave ${JSON.stringify(got1)}. Does each returned function remember its own count?`);
  const got0 = none([], member);
  assert.equal(got0, "none",
    `withUsage(0, ...) given no arguments should reply "none"; it gave ${JSON.stringify(got0)}. Check how each returned function remembers the count it was made with (Closures keep their surroundings).`);
  assert.equal(none(["a"], member), "usage: !none",
    "withUsage(0, \"!none\", ...) accepted an argument, or gave the wrong usage line.");
});

test("onlyFor: the right role reaches the handler; any other role is refused", () => {
  const { handler, calls } = spy("done");
  const guarded = onlyFor("mod", handler);
  assert.equal(typeof guarded, "function",
    `onlyFor(...) should return a new handler; it returned ${typeof guarded}.`);
  assert.equal(guarded(["x"], member), "only a mod can do that",
    "A member should be refused with \"only a mod can do that\".");
  assert.equal(calls.length, 0,
    "The wrapped handler ran for a member. onlyFor must refuse before calling it.");
  assert.equal(guarded(["x"], mod), "done",
    "A mod should get whatever the wrapped handler returns.");
  assert.deepEqual(calls[0], { args: ["x"], msg: mod },
    "The wrapped handler should be called with the same (args, msg) the guard received.");
});

test("onlyFor: the refusal names the role it was given", () => {
  const guarded = onlyFor("host", () => "ok");
  assert.equal(guarded([], member), "only a host can do that",
    "onlyFor(\"host\", ...) should refuse with \"only a host can do that\". Build the message from the role parameter, not a fixed word.");
});

test("commands: !add and !shout still work, and still check their arguments", () => {
  assert.equal(commands.add(["2", "3"], member), "5", "!add 2 3 should reply \"5\".");
  assert.equal(commands.add(["2"], member), "usage: !add <a> <b>", "!add with one argument should reply with its usage line.");
  assert.equal(commands.shout(["hey"], member), "HEY!", "!shout hey should reply \"HEY!\".");
  assert.equal(commands.shout([], member), "usage: !shout <word>", "!shout with no argument should reply with its usage line.");
});

test("commands: !ban and !clear are for mods, and the role is checked before the arguments", () => {
  assert.equal(commands.ban(["cy"], mod), "cy is banned", "A mod's !ban cy should reply \"cy is banned\".");
  assert.equal(commands.ban(["cy"], member), "only a mod can do that", "A member's !ban should be refused.");
  assert.equal(commands.ban([], member), "only a mod can do that",
    "A member typing !ban with no name got the usage line instead of a refusal. The role check has to run first — when one wrapper holds another, which one runs first? (Building functions from functions)");
  assert.equal(commands.ban([], mod), "usage: !ban <name>", "A mod's !ban with no name should get the usage line.");
  assert.equal(commands.clear([], mod), "chat cleared", "A mod's !clear should reply \"chat cleared\".");
  assert.equal(commands.clear(["now"], mod), "usage: !clear", "!clear takes no arguments; a mod giving one should get the usage line.");
  assert.equal(commands.clear([], member), "only a mod can do that", "A member's !clear should be refused.");
});
