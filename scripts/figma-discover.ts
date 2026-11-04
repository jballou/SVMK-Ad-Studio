// Usage: FIGMA_TOKEN=... npm run figma:discover -- "<figma url with node-id>" [--legacy]
import { planSync } from "../src/lib/figma/sync";

const [url, ...flags] = process.argv.slice(2);
const token = process.env.FIGMA_TOKEN;
if (!url || !token) {
  console.error("Need a Figma URL argument and FIGMA_TOKEN in the environment");
  process.exit(1);
}

const plan = await planSync(url, token, { allowLegacy: flags.includes("--legacy") });
for (const c of plan.concepts) {
  console.log(`${c.conceptKey}: ${c.sizes.map((s) => `${s.width}x${s.height}${s.legacy ? "*" : ""} (${s.slots.length} slots)`).join(", ")}`);
}
if (plan.unmatched.length) console.log(`\nUnmatched ad-like frames:\n${plan.unmatched.map((u) => `  ${u.nodeId} ${u.name}`).join("\n")}`);
console.log(`\n${plan.frames.length} frames, ${plan.concepts.length} concepts${plan.frames.some((f) => f.legacy) ? " (* = legacy name)" : ""}`);
