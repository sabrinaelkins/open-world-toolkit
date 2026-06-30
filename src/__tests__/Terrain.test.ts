import { describe, it, expect } from "vitest";
import {
  generateHeightmap,
  generateFbmHeightmap,
  heightmapToImageData,
  getBiome,
  BIOMES,
} from "../types/terrain";

// ----------------------------------------------------------------
// generateHeightmap (legacy)
// ----------------------------------------------------------------
describe("generateHeightmap", () => {
  it("returns correct number of values", () => {
    const hm = generateHeightmap({ width: 8, height: 8, seed: 1 });
    expect(hm).toHaveLength(64);
  });

  it("all values are in [0, 1]", () => {
    const hm = generateHeightmap({ width: 16, height: 16, seed: 42 });
    for (const v of hm) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("same seed produces same output", () => {
    const a = generateHeightmap({ width: 8, height: 8, seed: 99 });
    const b = generateHeightmap({ width: 8, height: 8, seed: 99 });
    expect(a).toEqual(b);
  });

  it("different seeds produce different output", () => {
    const a = generateHeightmap({ width: 8, height: 8, seed: 1 });
    const b = generateHeightmap({ width: 8, height: 8, seed: 2 });
    expect(a).not.toEqual(b);
  });
});

// ----------------------------------------------------------------
// generateFbmHeightmap
// ----------------------------------------------------------------
describe("generateFbmHeightmap", () => {
  const opts = {
    seed: 42,
    scale: 18,
    octaves: 4,
    lacunarity: 2,
    gain: 0.5,
    warp: 0,
  };

  it("returns correct number of values", () => {
    const hm = generateFbmHeightmap(16, 16, opts);
    expect(hm).toHaveLength(256);
  });

  it("all values are in [0, 1]", () => {
    const hm = generateFbmHeightmap(32, 32, opts);
    for (const v of hm) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("same seed + options = same output", () => {
    const a = generateFbmHeightmap(16, 16, opts);
    const b = generateFbmHeightmap(16, 16, opts);
    expect(a).toEqual(b);
  });

  it("different seeds produce different output", () => {
    const a = generateFbmHeightmap(16, 16, { ...opts, seed: 1 });
    const b = generateFbmHeightmap(16, 16, { ...opts, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it("warp > 0 produces different output than warp = 0", () => {
    const a = generateFbmHeightmap(16, 16, { ...opts, warp: 0 });
    const b = generateFbmHeightmap(16, 16, { ...opts, warp: 1 });
    expect(a).not.toEqual(b);
  });

  it("more octaves changes output", () => {
    const a = generateFbmHeightmap(16, 16, { ...opts, octaves: 1 });
    const b = generateFbmHeightmap(16, 16, { ...opts, octaves: 6 });
    expect(a).not.toEqual(b);
  });

  it("produces varied values (not flat)", () => {
    const hm = generateFbmHeightmap(32, 32, opts);
    const min = Math.min(...hm);
    const max = Math.max(...hm);
    expect(max - min).toBeGreaterThan(0.1);
  });
});

// ----------------------------------------------------------------
// getBiome
// ----------------------------------------------------------------
describe("getBiome", () => {
  it("returns deep_ocean for very low values", () => {
    expect(getBiome(0).id).toBe("deep_ocean");
    expect(getBiome(0.1).id).toBe("deep_ocean");
  });

  it("returns snow for very high values", () => {
    expect(getBiome(1.0).id).toBe("snow");
    expect(getBiome(0.95).id).toBe("snow");
  });

  it("returns beach for mid-low values", () => {
    expect(getBiome(0.4).id).toBe("beach");
  });

  it("returns forest for mid values", () => {
    expect(getBiome(0.6).id).toBe("forest");
  });

  it("never returns undefined", () => {
    const testValues = [0, 0.1, 0.25, 0.38, 0.45, 0.55, 0.68, 0.78, 0.88, 1.0];
    for (const v of testValues) {
      expect(getBiome(v)).toBeDefined();
      expect(getBiome(v).id).toBeTruthy();
    }
  });

  it("biomes are ordered by minHeight", () => {
    for (let i = 1; i < BIOMES.length; i++) {
      expect(BIOMES[i].minHeight).toBeGreaterThan(BIOMES[i - 1].minHeight);
    }
  });
});

// ----------------------------------------------------------------
// heightmapToImageData
// ImageData is a browser API — polyfill it for jsdom
// ----------------------------------------------------------------
class ImageDataPolyfill {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

if (typeof globalThis.ImageData === "undefined") {
  // @ts-expect-error polyfill for jsdom
  globalThis.ImageData = ImageDataPolyfill;
}

describe("heightmapToImageData", () => {
  it("returns correct dimensions", () => {
    const hm = generateFbmHeightmap(4, 4, { seed: 1, scale: 18 });
    const img = heightmapToImageData(hm, 4, 4);
    expect(img.width).toBe(4);
    expect(img.height).toBe(4);
    expect(img.data).toHaveLength(4 * 4 * 4); // RGBA
  });

  it("alpha channel is always 255", () => {
    const hm = generateFbmHeightmap(8, 8, { seed: 1, scale: 18 });
    const img = heightmapToImageData(hm, 8, 8);
    for (let i = 3; i < img.data.length; i += 4) {
      expect(img.data[i]).toBe(255);
    }
  });

  it("pixel colors match biome colors", () => {
    // A heightmap of all zeros should be deep_ocean (#1e3a5f)
    const hm = new Array(16).fill(0);
    const img = heightmapToImageData(hm, 4, 4);
    // deep_ocean = #1e3a5f → R:30 G:58 B:95
    expect(img.data[0]).toBe(0x1e); // R
    expect(img.data[1]).toBe(0x3a); // G
    expect(img.data[2]).toBe(0x5f); // B
  });
});
