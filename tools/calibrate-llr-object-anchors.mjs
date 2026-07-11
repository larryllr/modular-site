import { readFileSync } from "node:fs";

const files = [1, 2, 3, 4].map(
  (index) => `vendor/Legacy_SM63Redux/scenes/levels/tutorial_1/tutorial_1_${index}.tscn`
);

function vector(block, property = "position") {
  const match = block.match(new RegExp(`^${property} = Vector2\\((-?[\\d.]+), (-?[\\d.]+)\\)$`, "m"));
  return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
}

function packed(block, property = "polygon") {
  const match = block.match(new RegExp(`^${property} = PackedVector2Array\\(([^)]*)\\)$`, "m"));
  if (!match) return [];
  const values = match[1].split(",").map((value) => Number(value.trim()));
  return Array.from({ length: values.length / 2 }, (_, index) => ({
    x: values[index * 2],
    y: values[index * 2 + 1]
  }));
}

function surfaceY(surface, x) {
  for (let index = 1; index < surface.points.length; index += 1) {
    const left = surface.points[index - 1];
    const right = surface.points[index];
    if (x < left.x || x > right.x) continue;
    const progress = (x - left.x) / Math.max(1, right.x - left.x);
    return left.y + (right.y - left.y) * progress;
  }
  return null;
}

const wanted = new Map([
  ["res://classes/interactable/sign/sign.tscn", "sign"],
  ["res://classes/decorative/big_tree.tscn", "bigTree"],
  ["res://classes/decorative/small_tree.tscn", "smallTree"],
  ["res://classes/decorative/flowers.tscn", "flowers"],
  ["res://classes/entity/enemy/goomba/goomba.tscn", "goomba"],
  ["res://classes/entity/enemy/bobomb/bobomb.tscn", "bobomb"],
  ["res://classes/pickup/bottle/bottle_big.tscn", "bottle"],
  ["res://classes/pickup/fludd_box/fludd_box.tscn", "fludd"]
]);

const samples = [];
for (const file of files) {
  const scene = readFileSync(file, "utf8");
  const resources = new Map(
    [...scene.matchAll(/\[ext_resource type="PackedScene"[^\]]*path="([^"]+)" id="([^"]+)"\]/g)]
      .map((match) => [match[2], match[1]])
  );
  const blocks = scene.split(/\n(?=\[node )/);
  const terrains = blocks
    .map((block) => {
      const header = block.match(/^\[node name="([^"]+)"([^\]]*)\]/);
      if (!header || !/parent="Terrain"/.test(header[2])) return null;
      const id = header[2].match(/instance=ExtResource\("([^"]+)"\)/)?.[1];
      if (!id || resources.get(id) !== "res://classes/solid/terrain/terrain_polygon.tscn") return null;
      const origin = vector(block);
      const polygon = packed(block);
      if (polygon.length < 4) return null;
      return {
        name: header[1],
        points: polygon.slice(0, -2).map((point) => ({
          x: origin.x + point.x,
          y: origin.y + point.y
        }))
      };
    })
    .filter(Boolean);

  for (const block of blocks) {
    const header = block.match(/^\[node name="([^"]+)"([^\]]*)\]/);
    if (!header) continue;
    const id = header[2].match(/instance=ExtResource\("([^"]+)"\)/)?.[1];
    const kind = wanted.get(resources.get(id));
    if (!kind) continue;
    const position = vector(block);
    const candidates = terrains
      .map((terrain) => ({ terrain, y: surfaceY(terrain, position.x) }))
      .filter((candidate) => candidate.y !== null)
      .sort((left, right) => Math.abs(position.y - left.y) - Math.abs(position.y - right.y));
    if (!candidates[0]) continue;
    samples.push({
      file,
      name: header[1],
      kind,
      x: position.x,
      y: position.y,
      surface: candidates[0].terrain.name,
      surfaceY: Number(candidates[0].y.toFixed(2)),
      offset: Number((position.y - candidates[0].y).toFixed(2))
    });
  }
}

const grouped = Object.groupBy(samples, (sample) => sample.kind);
for (const [kind, values] of Object.entries(grouped)) {
  const offsets = values.map((value) => value.offset).sort((a, b) => a - b);
  const median = offsets[Math.floor(offsets.length / 2)];
  console.log(JSON.stringify({
    kind,
    samples: offsets.length,
    median,
    min: offsets[0],
    max: offsets.at(-1),
    offsets
  }));
}

if (process.argv.includes("--details")) {
  console.log(JSON.stringify(samples, null, 2));
}
