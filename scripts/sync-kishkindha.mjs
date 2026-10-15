import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { extractSarga } from "./extract-sarga.mjs";

const sourceDir = path.resolve("scripts/source");
const catalogPath = path.resolve("public/content/catalog.json");
const contentsUrl = "https://www.valmikiramayan.net/kish/kishkindha_contents.htm";
const expected = 67;
const from = Number(process.argv[2] || 1);
const to = Number(process.argv[3] || expected);

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html",
};

function titlesFromContents(html) {
  const root = parse(html);
  const titles = new Map();
  const plain = root.text.replace(/\u00a0/g, " ").replace(/\s+/g, " ");
  const pattern = /(\d{1,3})\s*:\s*(.+?)\s+sarga\s*\/\s*chapter/gi;
  let match;
  while ((match = pattern.exec(plain))) {
    const number = Number(match[1]);
    const title = match[2].replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
    if (number >= 1 && number <= expected && title) titles.set(number, title);
  }
  return titles;
}

function pageNames(sarga, kind) {
  const names =
    kind === "sans"
      ? [`kishkindhasans${sarga}.htm`, `kishkindha_sans${sarga}.htm`]
      : [`kishkindhaitrans${sarga}.htm`, `kishkindharoman${sarga}.htm`];
  return names.map((name) => `https://www.valmikiramayan.net/utf8/kish/sarga${sarga}/${name}`);
}

async function download(sarga, kind, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500 && !process.argv.includes("--force")) return "cached";
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
  const sansFile = path.join(sourceDir, `kishkindha-${sarga}-sans.htm`);
  const itransFile = path.join(sourceDir, `kishkindha-${sarga}-itrans.htm`);
  const outFile = path.resolve(`public/content/kishkindha/${String(sarga).padStart(2, "0")}.json`);
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000 && !process.argv.includes("--force")) {
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
    const result = extractSarga({
      kanda: "kishkindha",
      book: 4,
      sarga,
      title,
      translator: "Desiraju Hanumanta Rao",
      sansFile,
      itransFile,
      outFile,
      sourceUrl: `https://www.valmikiramayan.net/utf8/kish/sarga${sarga}/kishkindhasans${sarga}.htm`,
      romanUrl: `https://www.valmikiramayan.net/utf8/kish/sarga${sarga}/kishkindhaitrans${sarga}.htm`,
      quiet: true,
    });
    return result.blocks > 0;
  } catch (error) {
    console.log(`sarga ${sarga}: failed (${error.message})`);
    return false;
  }
}

fs.mkdirSync(sourceDir, { recursive: true });
const contentsPath = path.join(sourceDir, "kishkindha-contents.htm");
if (!fs.existsSync(contentsPath) || process.argv.includes("--force")) {
  const response = await fetch(contentsUrl, { headers });
  if (!response.ok) throw new Error(`contents ${response.status}`);
  fs.writeFileSync(contentsPath, await response.text());
}
const titles = titlesFromContents(fs.readFileSync(contentsPath, "utf8"));
if (titles.size < expected) {
  console.log(`contents listed ${titles.size} titles, expected ${expected}`);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
for (const [number, title] of titles) {
  const current = catalog.sargas.find((item) => item.kanda === "kishkindha" && item.number === number);
  if (current) current.title = title;
  else catalog.sargas.push({ kanda: "kishkindha", number, title, available: false });
}

const failed = [];
for (let sarga = from; sarga <= to; sarga += 1) {
  const ok = await one(sarga, titles.get(sarga) ?? `Sarga ${sarga}`);
  if (!ok) failed.push(sarga);
}

for (const item of catalog.sargas) {
  if (item.kanda !== "kishkindha") continue;
  const file = path.resolve(`public/content/kishkindha/${String(item.number).padStart(2, "0")}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  item.available = Boolean(data.verses?.length);
}
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(failed.length ? `missing: ${failed.join(", ")}` : "every requested sarga copied");
