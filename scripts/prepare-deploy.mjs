import { rmSync } from "node:fs";

rmSync("dist/mdzs/.dev.vars", { force: true });
console.log("Removed local secrets from deploy bundle.");
