export const MODEL_ROLES_PATH = "skills/go-mode/references/model-roles.md";
export const MODEL_VALUES_PATH = "skills/go-mode/references/model-values.json";

const isSeparatorRow = (line) => /^\|[\s:|-]+\|$/.test(line);

export function tableRows(text, after) {
  let lines = text.split("\n");
  let offset = 0;
  if (after) {
    offset = Math.max(0, lines.findIndex((l) => after.test(l)));
    lines = lines.slice(offset);
  }
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("|")) continue;
    if (isSeparatorRow(lines[i]) || isSeparatorRow(lines[i + 1] ?? "")) continue;
    rows.push({ line: offset + i + 1, cells: lines[i].split("|").slice(1, -1).map((c) => c.trim()) });
  }
  return rows;
}

const roleName = (cell) => cell.match(/^`([^`]+)`$/)?.[1];

export function parseRoles(text) {
  const roles = new Map();
  const problems = [];
  for (const { line, cells } of tableRows(text, /^## Roles\s*$/)) {
    const name = roleName(cells[0]);
    if (!name || !["one", "list"].includes(cells[1]) || !["yes", "no"].includes(cells[2])) {
      problems.push({ line, message: 'role row needs a `role`, an Entries of "one" or "list", and a Can drop of "yes" or "no"' });
      continue;
    }
    roles.set(name, cells[1]);
  }
  if (!roles.size) problems.push({ line: null, message: 'no roles found under "## Roles"' });
  return { roles, problems };
}

export function checkModelRows(text, roles, { models = [], efforts = [] }) {
  const problems = [];
  const counts = new Map();
  for (const { line, cells } of tableRows(text)) {
    const [cell, model, effort] = cells;
    const name = roleName(cell ?? "");
    if (!name) {
      problems.push({ line, message: "first cell must be a `role`" });
      continue;
    }
    if (!roles.has(name)) problems.push({ line, message: `unknown role "${name}" (not in ${MODEL_ROLES_PATH})` });
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (model === "inherit-parent") {
      if (effort !== "-") problems.push({ line, message: `inherit-parent takes effort "-", got "${effort}"` });
    } else {
      if (models.length && !models.includes(model)) problems.push({ line, message: `model "${model}" is not one of ${models.join(", ")}, inherit-parent` });
      if (efforts.length && !efforts.includes(effort)) problems.push({ line, message: `effort "${effort}" is not one of ${efforts.join(", ")}` });
    }
  }
  for (const [name, n] of counts) {
    if (roles.get(name) === "one" && n > 1) problems.push({ line: null, message: `role "${name}" takes one entry, has ${n}` });
  }
  return { problems, counts };
}
