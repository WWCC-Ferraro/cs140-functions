# Chat bot command pipeline

You are building the inside of a chat bot. People type messages like
`!add 2 3` or `!ban spammer`. Each message passes through a chain of small
steps — write it to a log, slow down anyone sending too fast, count it — and
then a command handler replies.

Every piece of that is a function handed to another function. The command
table holds functions. Each step in the chain is given a function, `next`, and
decides whether to call it. The guards you write take a handler and return a
new one. The chain itself is one function built from many. And one step is a
method, which has to keep its object when you hand it over.

## Getting started

1. Open **your repository**. It is made for you: private, and named for this
   homework, the term and your username — `<term>-cs140-functions-<you>`. On
   [this homework's page](https://wwcc.dev/#/lesson/functions-assignment), type your GitHub
   username and click **Open my Codespace**. On your own computer, clone it
   with GitHub Desktop (**Code**, then **Open with GitHub Desktop**) and check
   that `node --version` prints 22 or later. The lesson *How a homework works*
   walks through both.
2. Run the tests:

   ```
   npm test
   ```

   There is nothing to install. Almost every test fails at first — that is the
   starting point. The same tests run on every push, so you can see the result
   on GitHub too.

The files:

| File | What it is |
|---|---|
| `src/given.js` | Written by a teammate: `parseCommand`, `createRouter` and `createStats`. Read it; do not change it. |
| `src/bot.js` | Your work. Each function's contract is in the comment above it. |
| `src/commands.js` | The bot's commands. They work, and they repeat themselves. |
| `test/` | The tests. Read them — they are part of the spec. |
| `review/mute.js` | Code to review. See "The review" below. |
| `REVIEW.md` | Where your review goes. |

The `import` and `export` lines are written for you. Modules get their own
lessons later; for now, `export` makes a function visible to the tests.

Two shapes appear everywhere:

```js
// a handler: one command. Called by the router as handler(args, msg).
(args, msg) => "a reply"

// a middleware: one step every message passes through.
(msg, next) => {
  // ... before the rest runs
  const reply = next(msg);   // runs everything after this step
  // ... after it
  return reply;
}
```

A message is `{ user: "ada", role: "member", text: "!add 2 3" }`, and `role`
is `"member"` or `"mod"`. A reply is a string, or `null` for "say nothing".

## Using an AI assistant

`AGENTS.md` in this repository tells AI coding assistants how this course wants
them to help: as a tutor who explains errors, asks questions and gives hints,
not by writing your answers. Most assistants read it automatically. It is in
the open, so read it too. It says what good AI help looks like.

## The tasks

Do them in order. Each has its own test file, so you can see one task pass
before starting the next.

### Task 1 — Take out the repeated checks

Tests: `test/guards.test.js`

Look at `src/commands.js`. Every handler starts by checking its argument
count, and two of them also check the user's role. Only the usage text, the
count and the role change from one to the next.

Write two functions in `src/bot.js` that each take a handler and return a new
one:

- `withUsage(count, usage, handler)` — replies `"usage: " + usage` when the
  number of arguments is wrong, and otherwise calls `handler`.
- `onlyFor(role, handler)` — replies `"only a " + role + " can do that"` to
  anyone else, and otherwise calls `handler`.

```js
const add = withUsage(2, "!add <a> <b>", args => String(Number(args[0]) + Number(args[1])));

add(["2", "3"], msg);   // "5"
add(["2"], msg);        // "usage: !add <a> <b>"
```

Then rewrite `src/commands.js` so that no handler does its own checking. Each
one should be left with only the work that makes it different. The tests that
already pass must still pass. For `!ban` and `!clear`, a member is refused
before their arguments are looked at.

### Task 2 — Join the chain

Tests: `test/chain.test.js`

Write `runChain(middlewares, final)`. It returns one function, `msg => reply`,
that runs the message through each middleware in list order and then through
`final`.

You do not call the middleware one after another yourself. You give each one
a `next`, and it decides whether and when to call it. A middleware that
returns without calling `next` stops the message there.

```js
const shout = (msg, next) => next(msg) + "!";
const handle = runChain([shout, shout], msg => "hi");

handle({ user: "ada", role: "member", text: "" });   // "hi!!"
```

Build the chain once, when `runChain` is called. Nothing should run until a
message arrives.

### Task 3 — Two middleware factories

Tests: `test/middleware.test.js`

Write two functions that each return a middleware.

- `logTo(lines)` writes each message to the array `lines` before the rest of
  the chain runs, and the reply after it:

  ```
  > ada: !add 2 3
  < 5
  ```

- `cooldown(seconds, now)` refuses a user's command if their last accepted
  command was fewer than `seconds` ago. It replies `"slow down, ada"` and does
  not call `next`. `now` is a function that returns the current time in
  seconds. You are given it; your middleware decides when to call it.

The tests hand `cooldown` a clock they control, so they never wait.

### Task 4 — Assemble the bot

Tests: `test/bot.test.js`

Write `createBot({ commands, stats, now, log, seconds })`. It builds one
chain, in this order, and returns `{ handle }`:

1. `logTo(log)` — so refused commands are logged too
2. `cooldown(seconds, now)`
3. `stats.record` — counts only commands that got through
4. `createRouter(commands)` — finds the handler and runs it

Two things to know. `stats` comes from `createStats()` in `src/given.js`, and
`record` is one of its methods. And the chat connection will call your
`handle` on its own, as `handle(msg)`, with no object in front of it.

### Task 5 — Mods skip the cooldown

Also in `test/bot.test.js`.

A mod's commands are never slowed down. A member's still are.

There is more than one place this rule could live. Pick one, make the tests
pass, and defend your choice in the answers below.

## The review

`review/mute.js` was written by an AI assistant, asked for "a mute list mods
can manage, and a filter that stars out banned words, wired into the bot". It
has four defects. Three are about this module's ideas; one is about
an earlier module's.

Write your review in `REVIEW.md`. For each defect, give:

- the line or lines;
- what goes wrong, in a sentence or two;
- a concrete input or call that shows it;
- the fix.

Write it for the teammate who asked the assistant. They should be able to act
on it without asking you anything.

The tests do not read `REVIEW.md`. A person does.

## Your answers

Fill these in, here in this README.

**Task 4.** In one sentence: how does `stats.record` still have its `stats`
object when the chain calls it?

> *Your answer.*

**Task 5.** Where did you put the rule that mods skip the cooldown, and why
there? Then say what your choice costs when a second exception arrives — say,
the bot's own announcements must skip the cooldown too.

> *Your answer.*

## What "done" means

- `npm test` shows every test passing.
- `REVIEW.md` has a finding for each defect you found.
- Both answers above are filled in.
