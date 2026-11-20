#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const PRIORITIES = ["p1", "p2", "p3"];
const DEFAULT_PRIORITY = "p2";
const READY = "ready-for-agent";
const STALE_P1_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE = 50;

const QUERY = `query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, after: $after, states: OPEN) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title createdAt body url
        labels(first: ${PAGE}) { nodes { name } }
        parent { number repository { nameWithOwner } }
        blockedBy(first: ${PAGE}) { totalCount nodes { number state repository { nameWithOwner } } }
        timelineItems(itemTypes: LABELED_EVENT, last: ${PAGE}) {
          nodes { ... on LabeledEvent { createdAt label { name } } }
        }
      }
    }
  }
}`;

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function usage(message) {
  fail(`${message}\nusage: next-ticket.mjs [--repo owner/name] [--parent <issue>] [--json] [--input <file>]`, 2);
}

function parseArgs(argv) {
  const opts = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => argv[++i] ?? usage(`${arg} needs a value`);
    if (arg === "--repo") opts.repo = value();
    else if (arg === "--parent") {
      const raw = value().replace(/^#/, "");
      if (!/^\d+$/.test(raw)) usage("--parent takes an issue number");
      opts.parent = Number(raw);
    } else if (arg === "--input") opts.input = value();
    else if (arg === "--json") opts.json = true;
    else usage(`unknown argument ${arg}`);
  }
  if (opts.repo && !/^[\w.-]+\/[\w.-]+$/.test(opts.repo)) usage("--repo takes owner/name");
  return opts;
}

function gh(args) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    fail(`gh ${args[0]} ${args[1] ?? ""} failed: ${error.stderr?.trim() || error.message}`);
  }
}

function fetchOpenIssues(repo) {
  const [owner, name] = repo.split("/");
  const nodes = [];
  let after;
  do {
    const args = ["api", "graphql", "-f", `query=${QUERY}`, "-f", `owner=${owner}`, "-f", `name=${name}`];
    if (after) args.push("-f", `after=${after}`);
    const response = JSON.parse(gh(args));
    const issues = response.data?.repository?.issues;
    if (!issues) fail(`No issues readable for ${repo}: ${JSON.stringify(response.errors ?? response)}`);
    nodes.push(...issues.nodes);
    after = issues.pageInfo.hasNextPage ? issues.pageInfo.endCursor : undefined;
  } while (after);
  return nodes;
}

const REF = /\bhttps:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d+)|\b([\w.-]+\/[\w.-]+)#(\d+)|(?<![\w/])#(\d+)\b/g;

function sectionRefs(body, heading, repo) {
  const text = (body ?? "").replace(/\r\n/g, "\n");
  const section = new RegExp(`^##\\s*${heading}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, "im").exec(text);
  if (!section || /^\s*none\b/i.test(section[1])) return [];
  return [...section[1].matchAll(REF)].map((m) => ({
    repo: (m[1] ?? m[3] ?? repo).toLowerCase(),
    number: Number(m[2] ?? m[4] ?? m[5]),
  }));
}

const key = (repo, number) => `${repo.toLowerCase()}#${number}`;

function toTicket(node, repo) {
  const labels = node.labels.nodes.map((l) => l.name);
  const priority = PRIORITIES.find((p) => labels.includes(p));
  const labelled = (node.timelineItems?.nodes ?? []).filter((e) => e.label?.name === "p1").map((e) => e.createdAt);
  if (node.blockedBy.totalCount > node.blockedBy.nodes.length) {
    console.error(`warning: #${node.number} has more than ${PAGE} native blockers. Only the first ${PAGE} were read.`);
  }
  const nativeParent = node.parent && key(node.parent.repository?.nameWithOwner ?? repo, node.parent.number);
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    createdAt: node.createdAt,
    p1Since: labelled.at(-1) ?? node.createdAt,
    ready: labels.includes(READY),
    priority: priority ?? DEFAULT_PRIORITY,
    prioritized: priority !== undefined,
    parents: new Set([nativeParent, ...sectionRefs(node.body, "Parent", repo).map((r) => key(r.repo, r.number))].filter(Boolean)),
    nativeBlockers: node.blockedBy.nodes.filter((b) => b.state === "OPEN").map((b) => key(b.repository?.nameWithOwner ?? repo, b.number)),
    bodyBlockers: sectionRefs(node.body, "Blocked by", repo).filter((r) => r.repo === repo.toLowerCase()).map((r) => key(r.repo, r.number)),
  };
}

function rank(nodes, { repo, parent, now }) {
  const tickets = nodes.map((n) => toTicket(n, repo));
  const open = new Set(tickets.map((t) => key(repo, t.number)));
  const unblocks = new Map();
  for (const t of tickets) {
    const self = key(repo, t.number);
    t.blockers = [...new Set([...t.nativeBlockers, ...t.bodyBlockers.filter((k) => open.has(k))])].filter((k) => k !== self);
    for (const k of t.blockers) unblocks.set(k, (unblocks.get(k) ?? 0) + 1);
  }
  return tickets
    .filter((t) => t.ready && t.blockers.length === 0)
    .filter((t) => parent === undefined || t.parents.has(key(repo, parent)))
    .map((t) => {
      const p1Days = Math.floor((now - Date.parse(t.p1Since)) / DAY_MS);
      return {
        number: t.number,
        title: t.title,
        url: t.url,
        createdAt: t.createdAt,
        priority: t.priority,
        prioritized: t.prioritized,
        unblocks: unblocks.get(key(repo, t.number)) ?? 0,
        stale: t.priority === "p1" && p1Days > STALE_P1_DAYS ? p1Days : null,
      };
    })
    .sort(
      (a, b) =>
        PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) ||
        b.unblocks - a.unblocks ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
        a.number - b.number,
    );
}

function format(ranked, parent) {
  if (ranked.length === 0) {
    return parent === undefined
      ? "No unblocked ready-for-agent tickets."
      : `No unblocked ready-for-agent tickets under #${parent}. A ticket counts as under it through a native sub-issue link or a ## Parent section naming #${parent}.`;
  }
  const lines = ranked.map((t) => {
    const notes = [
      t.prioritized ? null : "no priority label, ranked as p2",
      t.unblocks ? `unblocks ${t.unblocks}` : null,
      t.stale ? `p1 for ${t.stale} days, re-triage` : null,
    ].filter(Boolean);
    return `#${t.number} ${t.priority} ${t.title}${notes.length ? ` (${notes.join("; ")})` : ""}`;
  });
  return [`Next: #${ranked[0].number} ${ranked[0].title}`, "", ...lines].join("\n");
}

const opts = parseArgs(process.argv.slice(2));
const repo = opts.repo ?? gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]).trim();
const nodes = opts.input ? JSON.parse(fs.readFileSync(opts.input, "utf8")) : fetchOpenIssues(repo);
const now = process.env.NEXT_TICKET_NOW ? Date.parse(process.env.NEXT_TICKET_NOW) : Date.now();
const ranked = rank(nodes, { repo, parent: opts.parent, now });
console.log(opts.json ? JSON.stringify(ranked, null, 2) : format(ranked, opts.parent));
