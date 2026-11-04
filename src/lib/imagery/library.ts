// Pre-approved imagery. These are generated placeholder illustrations standing in for the brand's licensed
// photography and product renders; swap `svg()` for real files when the DAM is connected.
export type ImageryKind = "photo" | "product";

export interface ImageryAsset {
  id: string;
  kind: ImageryKind;
  name: string;
  tags: string[];
  naturalW: number;
  naturalH: number;
  license: string;
  svg: () => string;
}

const wrap = (w: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Helvetica, Arial, sans-serif">${inner}</svg>`;

interface Palette { bgA: string; bgB: string; wall: string; accent: string; skin: string[]; tops: string[] }

const PEOPLE_SKIN = ["#F1C9A5", "#C98B5E", "#8D5A3B", "#E8B98F", "#6B4328"];

function person(cx: number, base: number, s: number, skin: string, top: string, hair: string) {
  const r = 46 * s;
  return `<g>
    <path d="M ${cx - 90 * s} ${base} C ${cx - 90 * s} ${base - 110 * s}, ${cx - 50 * s} ${base - 150 * s}, ${cx} ${base - 150 * s} C ${cx + 50 * s} ${base - 150 * s}, ${cx + 90 * s} ${base - 110 * s}, ${cx + 90 * s} ${base} Z" fill="${top}"/>
    <rect x="${cx - 14 * s}" y="${base - 175 * s}" width="${28 * s}" height="${34 * s}" rx="${10 * s}" fill="${skin}"/>
    <circle cx="${cx}" cy="${base - 205 * s}" r="${r}" fill="${skin}"/>
    <path d="M ${cx - r} ${base - 212 * s} C ${cx - r} ${base - 262 * s}, ${cx + r} ${base - 262 * s}, ${cx + r} ${base - 212 * s} C ${cx + r * 0.4} ${base - 232 * s}, ${cx - r * 0.5} ${base - 232 * s}, ${cx - r} ${base - 212 * s} Z" fill="${hair}"/>
  </g>`;
}

function photo(id: string, name: string, tags: string[], w: number, h: number, p: Palette, scene: "meeting" | "call" | "standing" | "desk"): ImageryAsset {
  return {
    id, kind: "photo", name, tags, naturalW: w, naturalH: h, license: "Licensed stock, brand-approved through Jun 2027",
    svg: () => {
      const hairs = ["#2B2118", "#4A3426", "#1E1E1E", "#8A5A2B", "#C8A15A"];
      let body = "";
      if (scene === "meeting") {
        body = `<rect x="0" y="${h * 0.66}" width="${w}" height="${h * 0.34}" fill="${p.accent}" opacity="0.9"/>
          ${[0.2, 0.5, 0.8].map((f, i) => person(w * f, h * 0.7, 1.15, PEOPLE_SKIN[i % 5], p.tops[i % p.tops.length], hairs[i])).join("")}
          <rect x="${w * 0.08}" y="${h * 0.68}" width="${w * 0.84}" height="${h * 0.05}" rx="12" fill="#fff" opacity="0.85"/>`;
      } else if (scene === "call") {
        body = `${person(w * 0.5, h * 0.92, 2.1, PEOPLE_SKIN[1], p.tops[0], hairs[1])}
          <path d="M ${w * 0.36} ${h * 0.4} C ${w * 0.36} ${h * 0.22}, ${w * 0.64} ${h * 0.22}, ${w * 0.64} ${h * 0.4}" fill="none" stroke="#242423" stroke-width="10" stroke-linecap="round"/>
          <rect x="${w * 0.6}" y="${h * 0.4}" width="22" height="48" rx="10" fill="#242423"/>
          <rect x="${w * 0.14}" y="${h * 0.8}" width="${w * 0.72}" height="${h * 0.2}" rx="14" fill="#fff" opacity="0.9"/>`;
      } else if (scene === "standing") {
        body = [0.32, 0.68].map((f, i) => `${person(w * f, h * 0.98, 2.3, PEOPLE_SKIN[(i + 2) % 5], p.tops[i % p.tops.length], hairs[i + 2])}`).join("");
      } else {
        body = `<rect x="${w * 0.1}" y="${h * 0.2}" width="${w * 0.42}" height="${h * 0.26}" rx="14" fill="#fff" opacity="0.9"/>
          <rect x="${w * 0.14}" y="${h * 0.24}" width="${w * 0.34}" height="${h * 0.04}" rx="6" fill="${p.accent}"/>
          <rect x="${w * 0.14}" y="${h * 0.31}" width="${w * 0.22}" height="${h * 0.03}" rx="6" fill="#D7D3CC"/>
          ${person(w * 0.7, h * 0.86, 1.9, PEOPLE_SKIN[0], p.tops[1 % p.tops.length], hairs[3])}
          <rect x="0" y="${h * 0.84}" width="${w}" height="${h * 0.16}" fill="${p.accent}"/>`;
      }
      return wrap(w, h, `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bgA}"/><stop offset="1" stop-color="${p.bgB}"/></linearGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#g)"/>
        <rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.3}" height="${h * 0.22}" rx="10" fill="${p.wall}" opacity="0.55"/>
        <circle cx="${w * 0.9}" cy="${h * 0.14}" r="${w * 0.07}" fill="#fff" opacity="0.35"/>${body}`);
    },
  };
}

const card = (x: number, y: number, w: number, h: number, fill = "#fff") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${fill}" filter="url(#sh)"/>`;
const SHADOW = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#242423" flood-opacity="0.22"/></filter></defs>`;
const line = (x: number, y: number, w: number, c = "#D7D3CC", h = 14) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${c}"/>`;

function product(id: string, name: string, tags: string[], inner: () => string, w = 1000, h = 800): ImageryAsset {
  return { id, kind: "product", name, tags, naturalW: w, naturalH: h, license: "Product render, brand-approved", svg: () => wrap(w, h, SHADOW + inner()) };
}

export const IMAGERY: ImageryAsset[] = [
  photo("photo-workshop", "Team workshop", ["team", "collaboration", "EX"], 1200, 1500, { bgA: "#EDEDFD", bgB: "#C5CCF9", wall: "#fff", accent: "#7068EB", skin: PEOPLE_SKIN, tops: ["#2C3666", "#08794A", "#E5944D"] }, "meeting"),
  photo("photo-support-call", "Customer support call", ["customer", "CX", "service"], 1200, 1500, { bgA: "#D6F5DE", bgB: "#7DD9A3", wall: "#fff", accent: "#10412C", skin: PEOPLE_SKIN, tops: ["#105638"] }, "call"),
  photo("photo-retail-team", "Retail team", ["customer", "retail", "CX"], 1600, 1200, { bgA: "#F9E8D2", bgB: "#EBAD70", wall: "#fff", accent: "#A95C18", skin: PEOPLE_SKIN, tops: ["#4C290B", "#3F4D94"] }, "standing"),
  photo("photo-remote-work", "Remote worker", ["remote", "EX", "IT"], 1600, 1200, { bgA: "#D9F0F2", bgB: "#87D0D7", wall: "#fff", accent: "#255B60", skin: PEOPLE_SKIN, tops: ["#104848", "#7068EB"] }, "desk"),
  photo("photo-analyst-pair", "Analysts reviewing results", ["data", "IT", "marketing"], 1600, 1200, { bgA: "#EEEFD5", bgB: "#C7DB5D", wall: "#fff", accent: "#4E5719", skin: PEOPLE_SKIN, tops: ["#393F12", "#2C3666"] }, "standing"),
  photo("photo-campus", "Campus feedback", ["education", "research"], 1200, 1500, { bgA: "#F7DBD4", bgB: "#DA867E", wall: "#fff", accent: "#8A3734", skin: PEOPLE_SKIN, tops: ["#4A2523", "#08794A", "#3F4D94"] }, "meeting"),
  photo("photo-marketing-room", "Marketing planning", ["marketing", "strategy"], 1600, 1200, { bgA: "#EDEBE8", bgB: "#C8C4BC", wall: "#fff", accent: "#464543", skin: PEOPLE_SKIN, tops: ["#5568BF", "#C76056"] }, "desk"),
  photo("photo-hybrid-office", "Hybrid office", ["workplace", "EX"], 1200, 1500, { bgA: "#2C3666", bgB: "#5568BF", wall: "#ABBBF6", accent: "#1A1E37", skin: PEOPLE_SKIN, tops: ["#D6F5DE", "#F2E2A6", "#fff"] }, "meeting"),

  product("product-survey", "Survey question card", ["survey", "forms"], () => `${card(120, 90, 760, 620)}${line(180, 160, 440, "#2F2E2D", 22)}${line(180, 205, 300, "#908D89", 16)}${[0, 1, 2, 3].map((i) => `<circle cx="212" cy="${300 + i * 92}" r="22" fill="${i === 1 ? "#08794A" : "#fff"}" stroke="#908D89" stroke-width="3"/>${line(260, 292 + i * 92, 380 - i * 40, "#D7D3CC", 18)}`).join("")}<rect x="620" y="620" width="200" height="52" rx="26" fill="#08794A"/>`),
  product("product-dashboard", "Results dashboard", ["analytics", "data"], () => `${card(60, 110, 880, 580)}${line(120, 170, 260, "#2F2E2D", 22)}${[210, 150, 270, 190, 310, 240].map((hgt, i) => `<rect x="${140 + i * 120}" y="${630 - hgt}" width="70" height="${hgt}" rx="12" fill="${["#7068EB", "#43A6AF", "#08794A"][i % 3]}"/>`).join("")}${line(700, 170, 180, "#D7D3CC", 14)}`),
  product("product-nps-phone", "NPS on mobile", ["mobile", "CX", "nps"], () => `<rect x="300" y="40" width="400" height="720" rx="56" fill="#242423" filter="url(#sh)"/><rect x="320" y="70" width="360" height="660" rx="40" fill="#FEFDFB"/>${line(360, 140, 220, "#2F2E2D", 20)}${line(360, 182, 160, "#908D89", 14)}${Array.from({ length: 11 }, (_, i) => `<rect x="${352 + (i % 6) * 54}" y="${300 + Math.floor(i / 6) * 70}" width="46" height="54" rx="12" fill="${i === 9 ? "#08794A" : "#EDEBE8"}"/>`).join("")}<rect x="360" y="620" width="280" height="56" rx="28" fill="#08794A"/>`, 1000, 800),
  product("product-report", "Report cover", ["report", "download"], () => `<g transform="rotate(-6 500 400)">${card(270, 70, 460, 660, "#2C3666")}<rect x="310" y="130" width="120" height="14" rx="7" fill="#ABBBF6"/><text x="310" y="260" font-size="64" font-weight="700" fill="#EDEDFD" font-family="Georgia, serif">The CX</text><text x="310" y="336" font-size="64" font-weight="700" fill="#EDEDFD" font-family="Georgia, serif">Gap</text>${line(310, 400, 280, "#5568BF", 14)}${line(310, 430, 200, "#5568BF", 14)}<circle cx="610" cy="600" r="70" fill="#7068EB" opacity="0.85"/></g>`),
  product("product-integrations", "Integrations grid", ["integrations", "IT"], () => `${card(90, 110, 820, 580)}${Array.from({ length: 9 }, (_, i) => `<rect x="${150 + (i % 3) * 245}" y="${170 + Math.floor(i / 3) * 170}" width="200" height="130" rx="20" fill="${["#EDEDFD", "#D6F5DE", "#F9E8D2"][i % 3]}"/><circle cx="${250 + (i % 3) * 245}" cy="${235 + Math.floor(i / 3) * 170}" r="26" fill="${["#7068EB", "#08794A", "#D07A2F"][i % 3]}"/>`).join("")}`),
  product("product-ai-chat", "AI insights chat", ["ai", "insights"], () => `${card(110, 90, 780, 620)}<rect x="170" y="160" width="400" height="90" rx="26" fill="#EDEDFD"/>${line(210, 190, 300, "#7068EB", 16)}<rect x="360" y="290" width="470" height="150" rx="26" fill="#08794A"/>${line(400, 330, 380, "#D6F5DE", 16)}${line(400, 372, 260, "#D6F5DE", 16)}<rect x="170" y="480" width="560" height="140" rx="26" fill="#F7F5F3"/>${line(210, 520, 440, "#C8C4BC", 16)}${line(210, 562, 300, "#C8C4BC", 16)}`),
];

export const PHOTOS = IMAGERY.filter((i) => i.kind === "photo");
export const PRODUCTS = IMAGERY.filter((i) => i.kind === "product");
const BY_ID = new Map(IMAGERY.map((a) => [a.id, a]));

export const getAsset = (id: string) => BY_ID.get(id);
export const assetUrl = (id: string) => `/imagery/${id}.svg`;

export interface BackgroundPreset {
  id: string;
  name: string;
  /** CSS `background` value. `theme` is special: uses the concept's own background color. */
  css: string;
  /** Representative colors, used for contrast checks (worst case is evaluated). */
  colors: string[];
}

export const BG_PRESETS: BackgroundPreset[] = [
  { id: "theme", name: "Concept color", css: "", colors: [] },
  { id: "sand", name: "Sand", css: "#F7F5F3", colors: ["#F7F5F3"] },
  { id: "periwinkle-glow", name: "Periwinkle glow", css: "radial-gradient(circle at 80% 15%, #C5CCF9, #EDEDFD 62%)", colors: ["#C5CCF9", "#EDEDFD"] },
  { id: "green-dawn", name: "Green dawn", css: "linear-gradient(135deg, #D6F5DE, #7DD9A3)", colors: ["#D6F5DE", "#7DD9A3"] },
  { id: "teal-wave", name: "Teal wave", css: "linear-gradient(160deg, #D9F0F2, #87D0D7)", colors: ["#D9F0F2", "#87D0D7"] },
  { id: "warm-peach", name: "Warm peach", css: "linear-gradient(135deg, #F9E8D2, #EBAD70)", colors: ["#F9E8D2", "#EBAD70"] },
  { id: "dots", name: "Dots", css: "radial-gradient(#C5CCF9 1.6px, transparent 1.6px) 0 0 / 22px 22px, #EDEDFD", colors: ["#EDEDFD"] },
  { id: "grid", name: "Grid", css: "linear-gradient(#E2DFDA 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, #E2DFDA 1px, transparent 1px) 0 0 / 28px 28px, #FEFDFB", colors: ["#FEFDFB"] },
  { id: "deep-periwinkle", name: "Deep periwinkle", css: "linear-gradient(135deg, #2C3666, #5568BF)", colors: ["#2C3666", "#5568BF"] },
  { id: "deep-green", name: "Deep green", css: "linear-gradient(135deg, #10412C, #08794A)", colors: ["#10412C", "#08794A"] },
  { id: "ink", name: "Ink", css: "linear-gradient(135deg, #242423, #464543)", colors: ["#242423", "#464543"] },
];
export const getPreset = (id: string | undefined) => BG_PRESETS.find((p) => p.id === id);
