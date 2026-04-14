// Shared rule-based mapper from vendor department strings to our nav taxonomy.
// Used by the daily importer and the categorize-pending script so edits stay in sync.

export const CATEGORY_MAP: Record<string, string> = {
  uncategorized: "wiring-and-cable",
  satco: "lighting",
  tornilleria: "tool-accessories",
  tornillera: "tool-accessories",
  "wiring devices": "wiring-and-cable",
  emt: "conduit-and-fittings",
  iluminacion: "lighting",
  iluminaion: "lighting",
  ilimunacion: "lighting",
  iluminacvion: "lighting",
  pvc: "conduit-and-fittings",
  ge: "panels-and-breakers",
  cableria: "wiring-and-cable",
  gb: "tool-accessories",
  "breaker no ge": "panels-and-breakers",
  contactores: "panels-and-breakers",
  wiremold: "conduit-and-fittings",
  rigido: "conduit-and-fittings",
  rigid: "conduit-and-fittings",
  "green/klein": "hand-tools",
  ahdesivos: "tool-accessories",
  adhesivos: "tool-accessories",
  leviton: "wiring-and-cable",
  "material linea": "wiring-and-cable",
  transfer: "panels-and-breakers",
  milwaukee: "power-tools-and-testers",
  "3m": "tool-accessories",
  limpieza: "tool-accessories",
  poleline: "wiring-and-cable",
  fusibles: "panels-and-breakers",
  piscina: "wiring-and-cable",
  "non-stock item": "wiring-and-cable",
  herramienta: "hand-tools",
  herramientas: "hand-tools",
  "wiring devices plate": "wiring-and-cable",
  "wiring devices dimmer": "wiring-and-cable",
  "wiring devices floor": "wiring-and-cable",
  "wiring devices switch": "wiring-and-cable",
  "wiring devices recep": "wiring-and-cable",
  "wiring devices sensor": "wiring-and-cable",
  "wiring devices wp": "wiring-and-cable",
  "wiring devices disconect": "panels-and-breakers",
  "wiring devices lutron": "wiring-and-cable",
  "industrial plate": "wiring-and-cable",
  "metal plate": "wiring-and-cable",
  cable: "wiring-and-cable",
  "cable armado": "wiring-and-cable",
  "tuberia emt": "conduit-and-fittings",
  tuberia: "conduit-and-fittings",
  "tuberia flexible": "conduit-and-fittings",
  corrugado: "conduit-and-fittings",
  metal: "conduit-and-fittings",
  aluminio: "conduit-and-fittings",
  bronce: "wiring-and-cable",
  cobre: "wiring-and-cable",
  galvanizado: "conduit-and-fittings",
  planta: "panels-and-breakers",
  "planta amarillo": "panels-and-breakers",
  unistrut: "conduit-and-fittings",
  unistrud: "conduit-and-fittings",
  fuse: "panels-and-breakers",
  ledvance: "lighting",
  sylvania: "lighting",
  americanlite: "lighting",
  liteway: "lighting",
  liquidacion: "lighting",
  solar: "lighting",
  "solar brazo": "lighting",
  "solar cube": "lighting",
  intermatic: "lighting",
  lutron: "wiring-and-cable",
  eaton: "panels-and-breakers",
  federal: "panels-and-breakers",
  schneider: "panels-and-breakers",
  siemens: "panels-and-breakers",
  challenger: "panels-and-breakers",
  abb: "panels-and-breakers",
  zinsco: "panels-and-breakers",
  "breaker dc": "panels-and-breakers",
  greenlee: "hand-tools",
  "mini split": "panels-and-breakers",
  "sj air": "panels-and-breakers",
  surge: "panels-and-breakers",
  gypsum: "tool-accessories",
  caulking: "tool-accessories",
  soldar: "tool-accessories",
  thermoweld: "tool-accessories",
  ultraweld: "tool-accessories",
  lanco: "tool-accessories",
  pegatanke: "tool-accessories",
  cementicios: "tool-accessories",
  muela: "tool-accessories",
  ground: "wiring-and-cable",
  conector: "wiring-and-cable",
  connector: "wiring-and-cable",
  "smart conector": "wiring-and-cable",
  "smart electric": "wiring-and-cable",
  "wiring devices abanico": "lighting",
  extensiones: "wiring-and-cable",
  box: "panels-and-breakers",
  mennekes: "panels-and-breakers",
  morris: "wiring-and-cable",
  klein: "hand-tools",
  "klein tools": "hand-tools",
};

const BRAND_MAP: Record<string, string> = {
  klein: "klein-tools",
  "klein tools": "klein-tools",
  "green/klein": "klein-tools",
  southwire: "southwire",
  hubbell: "hubbell",
  leviton: "leviton",
  "square d": "square-d",
  squared: "square-d",
};

export const TAXONOMY_FALLBACK = "wiring-and-cable";

function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .trim();
}

export function mapDepartmentToCategory(dept: unknown): string {
  const k = norm(dept);
  if (!k) return TAXONOMY_FALLBACK;
  return CATEGORY_MAP[k] ?? TAXONOMY_FALLBACK;
}

/** True only when the vendor department maps to a known taxonomy slug. */
export function hasKnownMapping(dept: unknown): boolean {
  const k = norm(dept);
  return !!k && k in CATEGORY_MAP;
}

export function mapBrand(brand: unknown, department: unknown): string | null {
  const b = norm(brand);
  if (b && BRAND_MAP[b]) return BRAND_MAP[b];
  for (const key of Object.keys(BRAND_MAP)) {
    if (b.includes(key)) return BRAND_MAP[key];
  }
  const d = norm(department);
  if (d && BRAND_MAP[d]) return BRAND_MAP[d];
  return null;
}

/** Build the categories[] array for a product given raw RMS values. */
export function buildCategories(
  department: unknown,
  brand: unknown
): { primary: string; categories: string[] } {
  const primary = mapDepartmentToCategory(department);
  const brandSlug = mapBrand(brand, department);
  const set = new Set([primary]);
  if (brandSlug) set.add(brandSlug);
  return { primary, categories: Array.from(set) };
}
