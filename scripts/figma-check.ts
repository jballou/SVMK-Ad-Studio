// Usage: FIGMA_TOKEN=... npm run figma:check -- "<figma url with node-id>" [--legacy]
import { getNodeTree, parseFigmaUrl } from "../src/lib/figma/client";
import { validateTemplate, type TemplateIssue } from "../src/lib/figma/validate-template";

const [url, ...flags] = process.argv.slice(2);
const token = process.env.FIGMA_TOKEN;
if (!url || !token) {
  console.error("Need a Figma URL (with node-id) and FIGMA_TOKEN in the environment");
  process.exit(1);
}
const { fileKey, nodeId } = parseFigmaUrl(url);
if (!nodeId) {
  console.error("The link needs a node-id: select the page's section or frame and copy its link");
  process.exit(1);
}

const report = validateTemplate(await getNodeTree(fileKey, nodeId, token), { allowLegacy: flags.includes("--legacy") });
const mark = { error: "ERROR", warn: "warn ", info: "info " } as const;
const line = (i: TemplateIssue, indent: string) => console.log(`${indent}${mark[i.severity]}  ${i.message}`);

for (const i of report.issues) line(i, "");
for (const c of report.concepts) {
  console.log(`\n${c.conceptKey}  (${c.sizes.length} size${c.sizes.length === 1 ? "" : "s"})`);
  for (const i of c.issues) line(i, "  ");
  for (const s of c.sizes) {
    console.log(`  ${s.width}x${s.height}  ${s.slots.map((x) => `#${x}`).join(" ") || "(no slots)"}`);
    for (const i of s.issues) line(i, "      ");
  }
}
console.log(`\n${report.counts.errors} errors, ${report.counts.warnings} warnings, ${report.counts.info} notes`);
process.exit(report.counts.errors ? 1 : 0);
