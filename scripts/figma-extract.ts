// Usage: npm run figma:extract -- "<figma url with node-id>"   (reads FIGMA_TOKEN from the environment)
// Prints the template spec Ad Studio would extract: elements, limits, spacing and issues per size.
import { getNodeTree, parseFigmaUrl } from "../src/lib/figma/client";
import { extractTemplateSpec } from "../src/lib/templates/extract";

async function main() {
  const [url] = process.argv.slice(2);
  const token = process.env.FIGMA_TOKEN;
  if (!url || !token) throw new Error("Need a Figma URL with node-id and FIGMA_TOKEN in the environment");
  const { fileKey, nodeId } = parseFigmaUrl(url);
  if (!nodeId) throw new Error("The link needs a node-id: select a frame, section or page and copy its link");
  const spec = extractTemplateSpec(await getNodeTree(fileKey, nodeId, token), { fileKey, nodeId });
  if (process.argv.includes("--json")) return void console.log(JSON.stringify(spec, null, 2));
  for (const f of spec.frames) {
    console.log(`\n${f.conceptKey} ${f.width}x${f.height}  bg=${f.background.color ?? "-"}${f.background.image ? "+image" : ""}  placements=${f.placements.join(",") || "none"}`);
    console.log(`  margins t${f.layout.margins.top} r${f.layout.margins.right} b${f.layout.margins.bottom} l${f.layout.margins.left}  text gaps ${f.layout.textGaps.join(",") || "-"}px  decoration=${f.decorationCount}`);
    for (const e of f.elements) {
      const t = e.text ? `  ${e.text.chars} chars (max ${e.text.maxChars}, fits ~${e.text.capacity}) ${e.text.font.size}px/${e.text.font.weight} ${e.text.align} ${e.text.color ?? ""}` : "";
      console.log(`  z${e.z} ${e.role.padEnd(16)} ${e.source.padEnd(8)} (${e.box.x},${e.box.y}) ${e.box.w}x${e.box.h}${t}${e.count ? ` x${e.count}` : ""}${e.cta ? ` "${e.cta.label}"` : ""}${e.logo ? ` ${e.logo.variant}` : ""}`);
    }
    for (const i of f.issues) console.log(`  ${i.severity.toUpperCase()} ${i.message}`);
  }
  console.log("\nlimits", spec.limits, "unmatched", spec.unmatched.length);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
