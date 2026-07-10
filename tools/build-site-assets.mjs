import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");
const assetRoot = resolve(publicDir, "site-assets");
const indexPath = resolve(publicDir, "index.html");

await rm(assetRoot, { recursive: true, force: true });
await mkdir(assetRoot, { recursive: true });

const publicEntry = await buildEntry("public", resolve(root, "client", "public-entry.js"));
const adminEntry = await buildEntry("admin", resolve(root, "client", "admin-entry.js"));
const stylePath = await writeHashedStyles();
await updateIndex({ publicEntry, adminEntry, stylePath });

console.log(`Built site assets: ${publicEntry}, ${adminEntry}, ${stylePath}`);

async function buildEntry(name, entryPoint) {
  const outdir = resolve(assetRoot, name);
  const result = await build({
    entryPoints: { app: entryPoint },
    outdir,
    bundle: true,
    format: "esm",
    splitting: true,
    minify: true,
    target: ["es2020"],
    entryNames: "app-[hash]",
    chunkNames: "chunk-[name]-[hash]",
    assetNames: "asset-[name]-[hash]",
    legalComments: "none",
    metafile: true,
    write: true
  });

  const output = Object.entries(result.metafile.outputs)
    .find(([, metadata]) => metadata.entryPoint && resolve(root, metadata.entryPoint) === entryPoint)?.[0];

  if (!output) {
    throw new Error(`Missing ${name} entry output`);
  }

  return toPublicPath(output);
}

async function writeHashedStyles() {
  const source = Buffer.from(
    (await readFile(resolve(publicDir, "styles.css"), "utf8")).replace(/\r\n?/g, "\n"),
    "utf8"
  );
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
  const output = resolve(assetRoot, `styles-${hash}.css`);
  await writeFile(output, source);
  return toPublicPath(output);
}

async function updateIndex({ publicEntry, adminEntry, stylePath }) {
  let html = await readFile(indexPath, "utf8");
  const styleTag = `<link rel="stylesheet" href="${stylePath}" data-site-styles />`;
  const bootstrap = [
    '<script type="module" data-site-bootstrap>',
    '  const route = location.pathname.replace(/^\\/+|\\/+$/g, "").split("/")[0];',
    `  void import(route === "admin" ? "${adminEntry}" : "${publicEntry}");`,
    "</script>"
  ].join("\n");
  const stylePattern = /<link rel="stylesheet" href="[^"]+"(?: data-site-styles)? \/>/;
  const bootstrapPattern = /<script type="module" data-site-bootstrap>[\s\S]*?<\/script>|<script type="module" src="\/app\.js"><\/script>/;

  if (!stylePattern.test(html) || !bootstrapPattern.test(html)) {
    throw new Error("Unable to locate site asset tags in public/index.html");
  }

  html = html.replace(stylePattern, styleTag).replace(bootstrapPattern, bootstrap);
  await writeFile(indexPath, html);
}

function toPublicPath(path) {
  return `/${relative(publicDir, resolve(path)).split(sep).join("/")}`;
}
