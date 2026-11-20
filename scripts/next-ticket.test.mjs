import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(REPO, "skills/to-tickets/scripts/next-ticket.mjs");
const NOW = "2026-11-20T00:00:00Z";

function issue(
  number,
  { labels = ["ready-for-agent"], createdAt = "2026-11-10T00:00:00Z", body = "", parent, blockedBy = [], labelledAt = [] } = {},
) {
  return {
    number,
    title: `ticket ${number}`,
    url: `https://github.com/o/r/issues/${number}`,
    createdAt,
    body,
    labels: { nodes: labels.map((name) => ({ name })) },
    parent: parent ? { number: parent, repository: { nameWithOwner: "o/r" } } : null,
    blockedBy: {
      totalCount: blockedBy.length,
      nodes: blockedBy.map(([n, state, repo = "o/r"]) => ({ number: n, state, repository: { nameWithOwner: repo } })),
    },
    timelineItems: { nodes: labelledAt.map(([name, at]) => ({ createdAt: at, label: { name } })) },
  };
}

function run(t, issues, ...args) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "next-ticket-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const input = path.join(dir, "issues.json");
  fs.writeFileSync(input, JSON.stringify(issues));
  const out = spawnSync("node", [SCRIPT, "--input", input, "--repo", "o/r", ...args], {
    encoding: "utf8",
    env: { ...process.env, NEXT_TICKET_NOW: NOW },
  });
  assert.equal(out.status, 0, out.stderr);
  return out.stdout;
}

const order = (t, issues, ...args) => JSON.parse(run(t, issues, "--json", ...args)).map((x) => x.number);

test("priority beats age", (t) => {
  const issues = [
    issue(1, { labels: ["ready-for-agent", "p3"], createdAt: "2026-11-01T00:00:00Z" }),
    issue(2, { labels: ["ready-for-agent", "p1"], createdAt: "2026-11-15T00:00:00Z" }),
    issue(3, { labels: ["ready-for-agent", "p2"], createdAt: "2026-11-05T00:00:00Z" }),
  ];
  assert.deepEqual(order(t, issues), [2, 3, 1]);
});

test("an unlabelled ticket ranks as p2 and says so", (t) => {
  const issues = [
    issue(1, { labels: ["ready-for-agent", "p3"], createdAt: "2026-11-01T00:00:00Z" }),
    issue(2, { createdAt: "2026-11-15T00:00:00Z" }),
  ];
  assert.deepEqual(order(t, issues), [2, 1]);
  assert.match(run(t, issues), /#2 p2 ticket 2 \(no priority label, ranked as p2\)/);
});

test("only ready-for-agent tickets with no open blocker are on the frontier", (t) => {
  const issues = [
    issue(1, { labels: ["needs-triage", "p1"] }),
    issue(2, { labels: ["ready-for-human", "p1"] }),
    issue(3, { blockedBy: [[4, "OPEN"]] }),
    issue(4, { labels: ["ready-for-agent", "p3"] }),
    issue(5, { blockedBy: [[99, "CLOSED"]] }),
    issue(6, { body: "## What to build\n\nx\n\n## Blocked by\n\n- #4\n" }),
    issue(7, { body: "## Blocked by\n\n- #98 (closed)\n" }),
    issue(8, { body: "## Blocked by\r\n\r\n- https://github.com/o/r/issues/4\r\n" }),
  ];
  assert.deepEqual(order(t, issues).sort(), [4, 5, 7]);
});

test("an open native blocker in another repo blocks the ticket", (t) => {
  const issues = [issue(1, { blockedBy: [[500, "OPEN", "x/other"]] }), issue(2, { blockedBy: [[2, "OPEN", "x/other"]] }), issue(3)];
  assert.deepEqual(order(t, issues), [3]);
  assert.equal(JSON.parse(run(t, issues, "--json"))[0].unblocks, 0);
});

test("references that are not local blockers are ignored", (t) => {
  const issues = [
    issue(1, { body: "Found during #2.\n\n## Acceptance criteria\n\n- [ ] works" }),
    issue(2, { labels: ["p3"] }),
    issue(3, { body: "## Blocked by\n\nNone. Easier once #2 exists." }),
    issue(4, { body: "## Blocked by\n\n- other/repo#2\n- https://github.com/other/repo/issues/2" }),
  ];
  assert.deepEqual(order(t, issues).sort(), [1, 3, 4]);
});

test("within a priority, the ticket that unblocks more goes first, then the oldest", (t) => {
  const issues = [
    issue(1, { createdAt: "2026-11-01T00:00:00Z" }),
    issue(2, { createdAt: "2026-11-09T00:00:00Z" }),
    issue(3, { createdAt: "2026-11-08T00:00:00Z" }),
    issue(10, { blockedBy: [[2, "OPEN"]] }),
    issue(11, { body: "## Blocked by\n\n#2" }),
    issue(12, { blockedBy: [[3, "OPEN"]] }),
  ];
  assert.deepEqual(order(t, issues), [2, 3, 1]);
  assert.match(run(t, issues), /^Next: #2 ticket 2$/m);
});

test("--parent matches native sub-issues and a Parent section", (t) => {
  const issues = [
    issue(1, { labels: ["ready-for-agent", "p1"] }),
    issue(2, { labels: ["ready-for-agent", "p3"], parent: 9 }),
    issue(3, { labels: ["ready-for-agent", "p2"], body: "## Parent\n\n#9\n\n## What to build\n\nx" }),
  ];
  assert.deepEqual(order(t, issues, "--parent", "#9"), [3, 2]);
  assert.match(run(t, issues, "--parent", "7"), /No unblocked ready-for-agent tickets under #7/);
});

test("a p1 is stale after 14 days with the p1 label, not 14 days since it opened", (t) => {
  const issues = [
    issue(1, { labels: ["ready-for-agent", "p1"], createdAt: "2026-11-01T00:00:00Z" }),
    issue(2, { labels: ["ready-for-agent", "p1"], createdAt: "2025-01-01T00:00:00Z", labelledAt: [["p1", "2026-11-18T00:00:00Z"]] }),
  ];
  const text = run(t, issues);
  assert.match(text, /#1 p1 ticket 1 \(p1 for 19 days, re-triage\)/);
  assert.doesNotMatch(text, /#2 .*re-triage/);
});

test("an empty frontier says so", (t) => {
  assert.equal(run(t, [issue(1, { labels: ["needs-triage"] })]).trim(), "No unblocked ready-for-agent tickets.");
});

test("a bad --parent is a usage error", () => {
  const out = spawnSync("node", [SCRIPT, "--parent", ""], { encoding: "utf8" });
  assert.equal(out.status, 2);
  assert.match(out.stderr, /--parent takes an issue number/);
});
