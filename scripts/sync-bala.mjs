import fs from "node:fs";
import path from "node:path";
import { extractSarga } from "./extract-sarga.mjs";

const sourceDir = path.resolve("scripts/source");
const catalogPath = path.resolve("public/content/catalog.json");
const from = Number(process.argv[2] || 2);
const to = Number(process.argv[3] || 77);

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html",
};

function pageNames(sarga, kind) {
  const names = kind === "sans" ? [`balasans${sarga}.htm`, `bala_sans${sarga}.htm`] : [`balaitrans${sarga}.htm`, `bala_itrans${sarga}.htm`];
  return names.map((name) => `https://www.valmikiramayan.net/utf8/baala/sarga${sarga}/${name}`);
}

async function download(sarga, kind, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) return "cached";
  let lastStatus = 0;
  for (const url of pageNames(sarga, kind)) {
    const response = await fetch(url, { headers });
    lastStatus = response.status;
    if (!response.ok) continue;
    const text = await response.text();
    if (!text.includes("verloc") && !text.includes("SanSloka") && !text.includes("ItrSloka")) continue;
    fs.writeFileSync(dest, text);
    return url;
  }
  throw new Error(`${kind} ${lastStatus}`);
}

async function one(sarga, title) {
  const sansFile = path.join(sourceDir, `bala-${sarga}-sans.htm`);
  const itransFile = path.join(sourceDir, `bala-${sarga}-itrans.htm`);
  const outFile = path.resolve(`public/content/bala/${String(sarga).padStart(2, "0")}.json`);
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000 && process.argv.includes("--force") === false) {
    const existing = JSON.parse(fs.readFileSync(outFile, "utf8"));
    if (existing.verses?.length) {
      console.log(`sarga ${sarga}: already copied (${existing.verses.length} blocks)`);
      return true;
    }
  }
  try {
    await download(sarga, "sans", sansFile);
    try {
      await download(sarga, "itrans", itransFile);
    } catch (error) {
      console.log(`sarga ${sarga}: roman page missing (${error.message})`);
    }
    const result = extractSarga({ sarga, title, sansFile, itransFile, outFile, quiet: true });
    return result.blocks > 0;
  } catch (error) {
    console.log(`sarga ${sarga}: failed (${error.message})`);
    return false;
  }
}

fs.mkdirSync(sourceDir, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const titles = new Map(
  catalog.sargas.filter((item) => item.kanda === "bala").map((item) => [item.number, item.title]),
);

const failed = [];
for (let sarga = from; sarga <= to; sarga += 1) {
  const ok = await one(sarga, titles.get(sarga) ?? `Sarga ${sarga}`);
  if (!ok) failed.push(sarga);
}

for (const item of catalog.sargas) {
  if (item.kanda !== "bala") continue;
  const file = path.resolve(`public/content/bala/${String(item.number).padStart(2, "0")}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  item.available = Boolean(data.verses?.length);
}
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(failed.length ? `missing: ${failed.join(", ")}` : "every requested sarga copied");
