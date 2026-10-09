import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, isAbsolute, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = resolve(process.argv[2] ?? resolve(root, "..", "pi-goal-portable.zip"));
const rel = relative(root, output);
if (!rel.startsWith(".." + sep) && rel !== ".." && !isAbsolute(rel)) throw new Error("Write archives outside the source package");
if (!output.endsWith(".zip")) throw new Error("Output must end in .zip");
const audit = spawnSync(process.execPath, [resolve(root, "03_ops/audit.mjs")], { stdio: "inherit" });
if (audit.status !== 0) process.exit(audit.status ?? 1);
const suites = readdirSync(resolve(root, "03_ops")).filter((name) => name.endsWith(".test.mjs"))
  .map((name) => resolve(root, "03_ops", name));
const tests = spawnSync(process.execPath, ["--test", ...suites], { stdio: "inherit" });
if (tests.status !== 0) process.exit(tests.status ?? 1);
const code = [
  "import pathlib, sys, zipfile",
  "root=pathlib.Path(sys.argv[1]); output=pathlib.Path(sys.argv[2])",
  "allowed={'README.md','AGENTS.md','package.json','.gitignore','00_system','01_raw','02_app','03_ops','99_archive'}",
  "files=sorted(p for p in root.rglob('*') if p.is_file() and p.relative_to(root).parts[0] in allowed)",
  "with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED) as z:",
  " for p in files:",
  "  info=zipfile.ZipInfo('pi-goal-portable/'+p.relative_to(root).as_posix(), date_time=(2026,1,1,0,0,0))",
  "  info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=0o100644<<16",
  "  z.writestr(info,p.read_bytes())",
  "print(str(output))",
].join("\n");
const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const packed = spawnSync(python, ["-c", code, root, output], { stdio: "inherit" });
if (packed.error) throw packed.error;
process.exitCode = packed.status ?? 1;
