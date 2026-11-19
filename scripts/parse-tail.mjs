import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) throw new Error("path required");
const text = readFileSync(path, "utf8");

const objects = [];
let depth = 0;
let start = -1;
let inString = false;
let escaped = false;

for (let index = 0; index < text.length; index += 1) {
  const char = text[index];
  if (inString) {
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (char === '"') inString = false;
    continue;
  }
  if (char === '"') {
    inString = true;
    continue;
  }
  if (char === "{") {
    if (depth === 0) start = index;
    depth += 1;
  } else if (char === "}") {
    depth -= 1;
    if (depth === 0 && start >= 0) {
      try {
        objects.push(JSON.parse(text.slice(start, index + 1)));
      } catch {
        // ignore non-JSON
      }
      start = -1;
    }
  }
}

const events = objects
  .filter((object) => object.event?.request?.url)
  .map((object) => {
    const url = new URL(object.event.request.url);
    return {
      method: object.event.request.method,
      path: url.pathname,
      query: url.search,
      cpu: object.cpuTime,
      wall: object.wallTime,
      status: object.event.response?.status,
    };
  });

function label(event) {
  if (event.path === "/api/health") return "health";
  if (event.path === "/api/auth/login") return "login";
  if (event.query === "?meta=1") return "project meta";
  if (event.path.includes("/documents/")) return "single document";
  if (event.path.endsWith("/documents") && event.method === "PUT") return "document PUT";
  if (event.method === "DELETE") return "project DELETE";
  return `${event.method} ${event.path}`;
}

const groups = new Map();
for (const event of events) {
  const key = label(event);
  const list = groups.get(key) ?? [];
  list.push(event);
  groups.set(key, list);
}

for (const [key, list] of groups) {
  const cpus = list.map((event) => event.cpu ?? 0);
  const max = Math.max(...cpus);
  const avg = cpus.reduce((sum, value) => sum + value, 0) / cpus.length;
  console.log(
    `${key}: n=${list.length} cpu=[${cpus.join(", ")}] max=${max}ms avg=${avg.toFixed(1)}ms`,
  );
}
