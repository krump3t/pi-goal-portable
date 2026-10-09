import { readdirSync, readFileSync, lstatSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const headings = ["## Job", "## Conventions", "## Dependencies and permission boundaries", "## Entrypoints and map"];
const privateName = /^(?:\.env(?:\.|$)|auth\.json$|credentials(?:[.-]|$)|secrets(?:[.-]|$)|tokens(?:[.-]|$)|node_modules$|\.pi$)/i;
function links(text, owner) {
  return [...text.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)]
    .map((m) => m[1].split("#")[0])
    .filter((p) => p && !/^[a-z][a-z0-9+.-]*:/i.test(p))
    .map((p) => resolve(dirname(owner), decodeURIComponent(p)));
}
export function auditPackage(root) {
  root = resolve(root);
  const errors = [], files = [], dirs = [], texts = new Map();
  let policy, manifest;
  try {
    policy = JSON.parse(readFileSync(join(root, "00_system/scaffolding.json"), "utf8"));
    manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  } catch (error) { return { errors: ["Missing/invalid policy or manifest: " + error.message], files: [] }; }
  const allowed = new Set([...policy.rootFiles, ...policy.layers, ".git"]);
  for (const name of readdirSync(root)) if (!allowed.has(name)) errors.push("Root perimeter: " + name);
  for (const name of policy.rootFiles) if (!existsSync(join(root, name))) errors.push("Missing root metadata: " + name);
  for (const layer of policy.layers) if (!existsSync(join(root, layer, "README.md"))) errors.push("Missing required layer: " + layer);
  function visit(dir) {
    dirs.push(dir);
    for (const name of readdirSync(dir)) {
      const path = join(dir, name), info = lstatSync(path);
      if (name === ".git") { if (dir !== root) errors.push("Nested git boundary: " + relative(root, path)); continue; }
      if (info.isSymbolicLink()) { errors.push("Unsupported symlink: " + relative(root, path)); continue; }
      if (privateName.test(name)) { errors.push("Private/runtime material: " + relative(root, path)); continue; }
      if (info.isDirectory()) visit(path);
      else { files.push(path); texts.set(path, readFileSync(path, "utf8")); }
    }
  }
  visit(root);
  for (const dir of dirs) {
    const doc = join(dir, "README.md"), text = texts.get(doc);
    if (!text) { errors.push("Missing README: " + relative(root, doc)); continue; }
    const cap = dir === root ? 100 : 150;
    if (text.trimEnd().split("\n").length > cap) errors.push("README line cap: " + relative(root, doc));
    if (dir === root) {
      const targets = links(text, doc);
      for (const layer of policy.layers) if (!targets.includes(join(root, layer, "README.md"))) errors.push("Root hub missing roadsign: " + layer);
      continue;
    }
    for (const heading of headings) {
      const section = text.split(heading + "\n")[1]?.split(/\n## /)[0]?.trim();
      if (!section || section.length < 20) errors.push("Missing/empty roadsign section " + heading + ": " + relative(root, doc));
    }
    if (!/^Last updated: \d{4}-\d{2}-\d{2}$/m.test(text)) errors.push("Missing README date: " + relative(root, doc));
    const targets = links(text, doc);
    if (!targets.includes(join(dirname(dir), "README.md"))) errors.push("Missing parent exit: " + relative(root, doc));
    const map = text.split("## Entrypoints and map\n")[1]?.split(/\n## /)[0] ?? "";
    const mapped = links(map, doc);
    for (const child of readdirSync(dir)) {
      if (child === "README.md" || child === ".git" || privateName.test(child)) continue;
      const path = join(dir, child), info = lstatSync(path);
      const target = info.isDirectory() ? join(path, "README.md") : path;
      if (!mapped.includes(target)) errors.push("Unmapped component: " + relative(root, target));
    }
  }
  const agent = texts.get(join(root, "AGENTS.md"));
  if (!agent || agent.trimEnd().split("\n").length > 200) errors.push("Missing/oversized AGENTS.md");
  else {
    for (const heading of ["## Non-negotiable invariants", "## Authoritative navigation", "## Structure and change boundaries", "## Golden paths and validation hierarchy"])
      if (!agent.includes(heading + "\n")) errors.push("Missing agent contract section: " + heading);
    const targets = links(agent, join(root, "AGENTS.md"));
    for (const layer of policy.layers) if (!targets.includes(join(root, layer, "README.md"))) errors.push("Agent navigation missing layer: " + layer);
  }
  for (const [path, text] of texts) {
    if (path.endsWith(".md")) for (const target of links(text, path))
      if (!target.startsWith(root + sep) || !existsSync(target)) errors.push("Broken/outside link in " + relative(root, path) + ": " + relative(root, target));
    for (const literal of ["/" + "home/", "/" + "mnt/", "phi" + "-tran", "start_" + "qwen", "http://" + "localhost", "http://" + "127.0.0.1"])
      if (text.includes(literal)) errors.push("Host-specific content: " + relative(root, path));
    if (/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/.test(text)) errors.push("Private key content: " + relative(root, path));
  }
  for (const file of readdirSync(join(root, "02_app")).filter((p) => /\.(?:mjs|ts)$/.test(p))) {
    const path = join(root, "02_app", file), text = texts.get(path) ?? "";
    if (!Object.hasOwn(policy.runtimeImports, file)) { errors.push("Unregistered runtime module: " + file); continue; }
    const imports = [
      ...[...text.matchAll(/(?:^|\n)\s*(?:import|export)\s+[^;\n]*?\bfrom\s*["']([^"']+)["']/g)].map((m) => m[1]),
      ...[...text.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)].map((m) => m[1]),
    ];
    for (const target of imports) {
      if (target.startsWith("node:")) continue;
      if (target.startsWith(".")) {
        if (!policy.runtimeImports[file].includes(target) || !existsSync(resolve(dirname(path), target)))
          errors.push("Runtime import boundary: " + file + " -> " + target);
      } else if (!policy.runtimePeers.includes(target) || !Object.hasOwn(manifest.peerDependencies ?? {}, target))
        errors.push("Undeclared runtime peer: " + target);
    }
    if (/\bimport\s*\(|fetch\s*\(|node:child_process/.test(text)) errors.push("Runtime dynamic import/transport bypass: " + file);
  }
  for (const file of Object.keys(policy.runtimeImports))
    if (!files.includes(join(root, "02_app", file))) errors.push("Missing runtime module: " + file);
  for (const type of ["extensions", "skills"])
    for (const resource of manifest.pi?.[type] ?? []) {
      const target = resolve(root, resource);
      if (!target.startsWith(join(root, "02_app") + sep) || !existsSync(target)) errors.push("Pi resource boundary: " + resource);
    }
  const skill = texts.get(join(root, "02_app/skills/goal/SKILL.md")) ?? "";
  if (!/^---\nname: goal\ndescription: .+\n/.test(skill)) errors.push("Invalid skill frontmatter");
  return { errors, files };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const { errors, files } = auditPackage(root);
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else console.log("VERIFIED ACLSD roadsigns/links/perimeter/imports/portability: " + files.length + " files");
}
