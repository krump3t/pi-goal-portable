import { readFileSync } from "node:fs";
import { join } from "node:path";

export const defaults = Object.freeze({
  animation: true, autoContinue: true, trustedGates: false,
  maxTurns: 100, maxRoleCalls: 60, maxHeals: 3,
  gateTimeoutSeconds: 120, roleTimeoutSeconds: 120,
  maxRoleTokens: 4096, maxReadCalls: 8, roles: {},
});
const bounds = {
  maxTurns: [1, 200], maxRoleCalls: [1, 200], maxHeals: [0, 10],
  gateTimeoutSeconds: [1, 900], roleTimeoutSeconds: [1, 900],
  maxRoleTokens: [256, 16384], maxReadCalls: [0, 16],
};
export function validateConfig(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Config must be an object");
  for (const key of Object.keys(input)) if (!Object.hasOwn(defaults, key)) throw new Error("Unknown config field: " + key);
  const config = { ...defaults, ...input };
  for (const key of ["animation", "autoContinue", "trustedGates"])
    if (typeof config[key] !== "boolean") throw new Error(key + " must be boolean");
  for (const [key, [min, max]] of Object.entries(bounds))
    if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max)
      throw new Error(key + " outside " + min + ".." + max);
  if (!config.roles || typeof config.roles !== "object" || Array.isArray(config.roles)) throw new Error("roles must be an object");
  for (const [role, value] of Object.entries(config.roles)) {
    if (!["navigator", "wizard", "priest", "scholar"].includes(role)) throw new Error("Unknown role: " + role);
    if (typeof value !== "string" || !/^[^/\s]+\/\S+$/.test(value)) throw new Error("Role model must be provider/model-id");
  }
  return config;
}
export function loadConfig(cwd) {
  let text;
  try { text = readFileSync(join(cwd, ".pi", "goal.config.json"), "utf8"); }
  catch (error) { if (error.code === "ENOENT") return validateConfig(); throw error; }
  if (text.length > 16384) throw new Error("Config exceeds 16 KiB");
  return validateConfig(JSON.parse(text));
}
