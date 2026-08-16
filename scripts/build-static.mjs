import { cp, mkdir, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("frontend", "dist/frontend", { recursive: true });
await cp("rounds", "dist/rounds", { recursive: true });
await cp("frontend", "dist/tour2026", { recursive: true });
await cp("frontend", "dist/vuelta2026", { recursive: true });
console.log("Statische publicatiemap gebouwd: dist/");