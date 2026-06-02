import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "..", "claude-dj.config.json");

export interface Config {
  suggestionMode: "pool" | "claude";
  pools: Record<string, string[]>;
}

export const DEFAULT_POOLS: Record<string, string[]> = {
  git_push: [
    "Push It Salt-N-Pepa",
    "Eye of the Tiger Survivor",
    "Shipping Up To Boston Dropkick Murphys",
    "Here Comes The Hotstepper Ini Kamoze",
    "Jump Kris Kross",
    "Mr Brightside The Killers",
    "Bittersweet Symphony The Verve",
    "Song 2 Blur",
    "Lose Yourself Eminem",
    "Can't Stop Won't Stop Young Gunz",
  ],
  victory: [
    "We Are The Champions Queen",
    "Celebration Kool and the Gang",
    "Don't Stop Me Now Queen",
    "Thunder Imagine Dragons",
    "Gonna Fly Now Rocky theme",
    "Jump Van Halen",
    "Beautiful Day U2",
    "Here I Go Again Whitesnake",
    "Born to Run Bruce Springsteen",
    "Living on a Prayer Bon Jovi",
  ],
  chill: [
    "Clair de Lune Debussy",
    "Weightless Marconi Union",
    "Teardrop Massive Attack",
    "The Night Will Always Win Manchester Orchestra",
    "Mad World Gary Jules",
  ],
  focus: [
    "Comptine d'Un Autre Été Yann Tiersen",
    "Experience Ludovico Einaudi",
    "Time Hans Zimmer",
    "Intro The xx",
    "Avril 14th Aphex Twin",
  ],
};

export function loadConfig(): Config {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      suggestionMode: parsed.suggestionMode ?? "pool",
      pools: { ...DEFAULT_POOLS, ...(parsed.pools ?? {}) },
    };
  } catch {
    return { suggestionMode: "pool", pools: DEFAULT_POOLS };
  }
}

export function pickFromPool(pools: Record<string, string[]>, context: string): string {
  const pool = pools[context] ?? pools["git_push"] ?? ["celebration music"];
  return pool[Math.floor(Math.random() * pool.length)];
}
