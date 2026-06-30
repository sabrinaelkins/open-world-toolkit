// ================================================================
// terrain.ts — Heightmap generation + biome classification
// ================================================================

export type NoiseOptions = {
  width: number;
  height: number;
  seed: number;
  scale?: number;
};

export type TerrainGenOptions = {
  algo?: "fbm";
  seed: number;
  grid?: { width: number; height: number };
  scale?: number;
  octaves?: number;
  lacunarity?: number;
  gain?: number;
  warp?: number;
};

export type BiomeId =
  | "deep_ocean"
  | "ocean"
  | "beach"
  | "plains"
  | "forest"
  | "highland"
  | "mountain"
  | "snow";

export type BiomeInfo = {
  id: BiomeId;
  label: string;
  color: string;
  minHeight: number;
};

export const BIOMES: BiomeInfo[] = [
  { id: "deep_ocean", label: "Deep Ocean", color: "#1e3a5f", minHeight: 0.0 },
  { id: "ocean", label: "Ocean", color: "#2563eb", minHeight: 0.25 },
  { id: "beach", label: "Beach", color: "#d4a853", minHeight: 0.38 },
  { id: "plains", label: "Plains", color: "#4ade80", minHeight: 0.45 },
  { id: "forest", label: "Forest", color: "#16a34a", minHeight: 0.55 },
  { id: "highland", label: "Highland", color: "#78716c", minHeight: 0.68 },
  { id: "mountain", label: "Mountain", color: "#a8a29e", minHeight: 0.78 },
  { id: "snow", label: "Snow", color: "#f1f5f9", minHeight: 0.88 },
];

export function getBiome(height: number): BiomeInfo {
  let result = BIOMES[0];
  for (const b of BIOMES) {
    if (height >= b.minHeight) result = b;
    else break;
  }
  return result;
}

// ----------------------------------------------------------------
// RNG
// ----------------------------------------------------------------
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(x: number, y: number, seed: number): number {
  const h = x * 374761393 + y * 668265263 + seed * 1442695040;
  return mulberry32(Number(h & 0xffffffff))();
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);
  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x0 + 1, y0, seed);
  const n01 = hash2D(x0, y0 + 1, seed);
  const n11 = hash2D(x0 + 1, y0 + 1, seed);
  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
}

// ----------------------------------------------------------------
// FBM — Fractal Brownian Motion
// ----------------------------------------------------------------
function fbm(
  x: number,
  y: number,
  seed: number,
  octaves: number,
  lacunarity: number,
  gain: number,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    value +=
      valueNoise2D(x * frequency, y * frequency, seed + i * 997) * amplitude;
    max += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / max; // normalize to [0, 1]
}

// ----------------------------------------------------------------
// Domain warp — distorts coordinates before sampling
// ----------------------------------------------------------------
function warpedFbm(
  x: number,
  y: number,
  seed: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  warp: number,
): number {
  if (warp === 0) return fbm(x, y, seed, octaves, lacunarity, gain);

  // First pass — get warp offsets
  const wx = fbm(x + 0.0, y + 0.0, seed + 1000, octaves, lacunarity, gain);
  const wy = fbm(x + 5.2, y + 1.3, seed + 2000, octaves, lacunarity, gain);

  // Second pass — sample with warped coords
  return fbm(
    x + warp * (wx - 0.5),
    y + warp * (wy - 0.5),
    seed,
    octaves,
    lacunarity,
    gain,
  );
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/** Legacy single-octave heightmap (used by existing TerrainPreview) */
export function generateHeightmap({
  width,
  height,
  seed,
  scale = 24,
}: NoiseOptions): number[] {
  const out = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + x] = valueNoise2D(x / scale, y / scale, seed);
    }
  }
  return out;
}

/** Full FBM heightmap with all terrain gen options */
export function generateFbmHeightmap(
  width: number,
  height: number,
  opts: TerrainGenOptions,
): number[] {
  const {
    seed,
    scale = 18,
    octaves = 4,
    lacunarity = 2.0,
    gain = 0.5,
    warp = 0,
  } = opts;

  const out = new Array<number>(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / scale;
      const ny = y / scale;
      out[y * width + x] = warpedFbm(
        nx,
        ny,
        seed,
        octaves,
        lacunarity,
        gain,
        warp,
      );
    }
  }

  return out;
}

/** Render heightmap to an ImageData for canvas display */
export function heightmapToImageData(
  heightmap: number[],
  width: number,
  height: number,
): ImageData {
  const img = new ImageData(width, height);
  for (let i = 0; i < heightmap.length; i++) {
    const biome = getBiome(heightmap[i]);
    const hex = biome.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    img.data[i * 4 + 0] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  return img;
}
