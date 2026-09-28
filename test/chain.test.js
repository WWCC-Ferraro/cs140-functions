// Task 2 — runChain joins middleware into one function.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runChain } from "../src/bot.js";

const msg = { user: "ada", role: "member", text: "!add 2 3" };

// A middleware that writes its name to `log` on the way in and on the way out.
function marker(name, log) {
  return (m, next) => {
    log.push(name + " in");
    const reply = next(m);
    log.push(name + " out");
    return reply;
  };
}

test("runChain with no middleware behaves like final", () => {
  const handle = runChain([], m => "final saw " + m.user);
  assert.equal(typeof handle, "function",
    `runChain should return one function, msg => reply. It returned ${typeof handle}.`);
  assert.equal(handle(msg), "final saw ada",
    "With an empty list, the chain's reply should be final's reply for the same message.");
});

test("building the chain runs nothing", () => {
  let ran = 0;
  runChain([(m, next) => { ran++; return next(m); }], () => { ran++; return "x"; });
  assert.equal(ran, 0,
    "runChain called a middleware or final while it was only being built. It should return a function and run nothing until that function gets a message.");
});

test("middleware runs in list order, then final, then back out in reverse", () => {
  const log = [];
  const handle = runChain([marker("a", log), marker("b", log)], () => { log.push("final"); return "ok"; });
  const reply = handle(msg);
  assert.deepEqual(log, ["a in", "b in", "final", "b out", "a out"],
    `Expected the calls in the order a in, b in, final, b out, a out. Got: ${log.join(", ")}. If b ran first, the chain was built from the wrong end — which function does each middleware's next have to call?`);
  assert.equal(reply, "ok", "The reply from final should come all the way back out of the chain.");
});

test("each middleware is called with (msg, next), and next is a function", () => {
  const seen = [];
  const handle = runChain([(m, next) => { seen.push([m, typeof next]); return next(m); }], () => "ok");
  handle(msg);
  assert.equal(seen.length, 1, `The middleware should be called once per message; it was called ${seen.length} time(s).`);
  assert.equal(seen[0][0], msg, "The first middleware should receive the message handed to the chain.");
  assert.equal(seen[0][1], "function",
    `The middleware's second argument should be a function it can call to continue. It got a ${seen[0][1]}. Are you passing the next step itself, or the result of calling it? (Who calls a callback, and when)`);
});

test("a middleware that does not call next stops the chain, and its reply is the answer", () => {
  const log = [];
  const stop = () => "stopped";
  const handle = runChain([marker("a", log), stop, marker("c", log)], () => { log.push("final"); return "ok"; });
  assert.equal(handle(msg), "stopped",
    "The middleware returned \"stopped\" without calling next; that should be the chain's reply.");
  assert.deepEqual(log, ["a in", "a out"],
    `Nothing after the stopping middleware should run. Got: ${log.join(", ")}. Only the middleware decides whether next is called — the chain must not call the rest itself.`);
});

test("a middleware can hand a different message to next", () => {
  const rename = (m, next) => next({ ...m, user: "bo" });
  const handle = runChain([rename], m => m.user);
  assert.equal(handle(msg), "bo",
    "final should receive the message the middleware passed to next, not the original. Does your next pass along its own argument?");
});

test("a middleware can change the reply on its way back", () => {
  const exclaim = (m, next) => next(m) + "!";
  const handle = runChain([exclaim, exclaim], () => "hi");
  assert.equal(handle(msg), "hi!!",
    "Each middleware's return value is the reply its caller sees. Two exclaiming middlewares around \"hi\" should give \"hi!!\".");
});

test("one chain handles many messages", () => {
  const handle = runChain([(m, next) => next(m)], m => m.text);
  assert.equal(handle({ ...msg, text: "one" }), "one", "The first message should get its own reply.");
  assert.equal(handle({ ...msg, text: "two" }), "two",
    "A second message through the same chain got the wrong reply. The chain is built once and must work every time it is called.");
});
