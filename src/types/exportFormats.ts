import type { GameWorldFile } from "./worldTypes";

// ----------------------------------------------------------------
// Native JSON (clean, no internal editor state)
// ----------------------------------------------------------------
export function exportNativeJson(world: GameWorldFile): string {
  const clean = {
    version: world.version,
    world: world.world,
    maps: world.maps.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      size: m.size,
      locations: m.locations,
      terrainGen: m.terrainGen,
    })),
    locations: world.locations.map((l) => ({
      id: l.id,
      name: l.name,
      mapId: l.mapId,
      position: l.position,
      radius: l.radius,
      tags: l.tags,
    })),
    tagMeta: world.tagMeta,
    npcs: world.npcs,
    items: world.items,
    quests: world.quests,
    triggers: world.triggers,
  };
  return JSON.stringify(clean, null, 2);
}

// ----------------------------------------------------------------
// CSV — flat location table
// ----------------------------------------------------------------
export function exportCsv(world: GameWorldFile): string {
  const headers = [
    "id",
    "name",
    "mapId",
    "mapName",
    "x",
    "y",
    "z",
    "radius",
    "tags",
  ];

  const mapNameById = new Map(world.maps.map((m) => [m.id, m.name]));

  const rows = world.locations.map((l) => [
    l.id,
    l.name,
    l.mapId,
    mapNameById.get(l.mapId) ?? "unassigned",
    l.position.x,
    l.position.y,
    l.position.z,
    l.radius,
    (l.tags ?? []).join("|"),
  ]);

  const escape = (val: unknown) => {
    const s = String(val ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];

  return lines.join("\n");
}

// ----------------------------------------------------------------
// Tiled JSON — one file per map
// Tiled map format: https://doc.mapeditor.org/en/stable/reference/json-map-format/
// ----------------------------------------------------------------
export type TiledExport = {
  filename: string;
  content: string;
};

export function exportTiled(world: GameWorldFile): TiledExport[] {
  const mapNameById = new Map(world.maps.map((m) => [m.id, m.name]));

  return world.maps.map((m) => {
    const mapLocs = world.locations.filter((l) => l.mapId === m.id);
    const mapW = m.size?.width ?? 1000;
    const mapH = m.size?.height ?? 1000;

    // Tiled uses tile-based coordinates — we treat 1 unit = 1 pixel (scale = 1)
    const tiledMap = {
      tiledversion: "1.10.0",
      type: "map",
      version: "1.10",
      orientation: "orthogonal",
      renderorder: "right-down",
      width: Math.ceil(mapW / 32),
      height: Math.ceil(mapH / 32),
      tilewidth: 32,
      tileheight: 32,
      infinite: false,
      nextlayerid: 3,
      nextobjectid: mapLocs.length + 1,
      backgroundcolor: "#020617",
      layers: [
        // Tile layer (empty — terrain is procedural)
        {
          id: 1,
          type: "tilelayer",
          name: "Terrain",
          x: 0,
          y: 0,
          width: Math.ceil(mapW / 32),
          height: Math.ceil(mapH / 32),
          opacity: 1,
          visible: true,
          data: new Array(Math.ceil(mapW / 32) * Math.ceil(mapH / 32)).fill(0),
        },
        // Object layer — locations as Tiled objects
        {
          id: 2,
          type: "objectgroup",
          name: "Locations",
          x: 0,
          y: 0,
          opacity: 1,
          visible: true,
          objects: mapLocs.map((loc, i) => ({
            id: i + 1,
            name: loc.name,
            type: (loc.tags ?? []).join(","),
            x: loc.position.x,
            y: loc.position.y,
            width: (loc.radius ?? 5) * 2,
            height: (loc.radius ?? 5) * 2,
            rotation: 0,
            visible: true,
            ellipse: true,
            properties: [
              { name: "id", type: "string", value: loc.id },
              { name: "mapId", type: "string", value: loc.mapId },
              { name: "z", type: "float", value: loc.position.z },
              { name: "radius", type: "float", value: loc.radius ?? 5 },
              {
                name: "tags",
                type: "string",
                value: (loc.tags ?? []).join(","),
              },
            ],
          })),
        },
      ],
      properties: [
        { name: "worldId", type: "string", value: world.world.id },
        { name: "worldName", type: "string", value: world.world.name },
        { name: "mapId", type: "string", value: m.id },
        { name: "mapName", type: "string", value: m.name },
        { name: "unit", type: "string", value: m.size?.unit ?? "meters" },
      ],
    };

    const safeName = (mapNameById.get(m.id) ?? m.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");

    return {
      filename: `${safeName}.tmj`,
      content: JSON.stringify(tiledMap, null, 2),
    };
  });
}

// ----------------------------------------------------------------
// Download helper
// ----------------------------------------------------------------
export function downloadFile(
  filename: string,
  content: string,
  mime = "text/plain",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
