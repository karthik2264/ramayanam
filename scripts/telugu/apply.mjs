// Merges hand-written Telugu translation sources into the sarga JSON files.
//
//   node scripts/telugu/apply.mjs bala 1 2 3
//
// Source: translations/te/<kanda>/<NN>.txt, one block per verse:
//
//   ## 1.1.1
//   fix: corrected devanagari line 1 / line 2      (optional; source typo fix)
//   flag: note on the English translation          (optional; for human review)
//   te: Telugu prose meaning (తాత్పర్యం)
//   - तपस्वी | the ascetic | తపస్వి అయిన | 1
//   + इति | thus | అని | 7
//
// Word lines are in the order the words are written in the śloka. "-" marks a word
// that is in the śloka, "+" a word supplied for the meaning. The last column is the
// word's place in the prose (anvaya) order, starting at 1.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { toIast, toItrans, toTelugu } from "./translit.mjs";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const [kanda, ...sargaArgs] = process.argv.slice(2);
if (!kanda || !sargaArgs.length) {
  console.error("usage: node scripts/telugu/apply.mjs <kanda> <sarga> [sarga...]");
  process.exit(1);
}

function parseSource(text, file) {
  const blocks = new Map();
  let current = null;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    const where = `${file}:${index + 1}`;
    if (!line || line.startsWith("#!")) return;
    if (line.startsWith("## ")) {
      current = { id: line.slice(3).trim(), fix: null, flags: [], te: "", words: [], where };
      if (blocks.has(current.id)) throw new Error(`${where} duplicate block ${current.id}`);
      blocks.set(current.id, current);
      return;
    }
    if (!current) throw new Error(`${where} text before the first ## block`);
    if (line.startsWith("fix:")) current.fix = line.slice(4).trim();
    else if (line.startsWith("flag:")) current.flags.push(line.slice(5).trim());
    else if (line.startsWith("te:")) current.te = line.slice(3).trim();
    else if (line.startsWith("- ") || line.startsWith("+ ")) {
      const parts = line.slice(2).split("|").map((part) => part.trim());
      if (parts.length !== 4) throw new Error(`${where} word line needs 4 columns: ${line}`);
      const [devanagari, meaning, meaningTe, order] = parts;
      const anvaya = Number(order);
      if (!devanagari || !meaning || !meaningTe || !Number.isInteger(anvaya) || /[ఀ-౿]/.test(devanagari)) {
        throw new Error(`${where} bad word line: ${line}`);
      }
      current.words.push({ placed: line[0] === "-", devanagari, meaning, meaningTe, anvaya, where });
    } else throw new Error(`${where} unknown line: ${line}`);
  });
  return blocks;
}

const loose = (text) =>
  text
    .replace(/[\s|।॥\-+'ऽः]/g, "")
    .replace(/[ंँ]/g, "म्")
    .replace(/[ङञणन]्/g, "म्");

// A rough check that catches typos, not sandhi: the word's inner letters must appear
// in the śloka. Leading vowels and the last two letters often change in sandhi.
function wordInSloka(word, sloka) {
  const target = loose(sloka);
  return word
    .split(/[\s-]+/)
    .filter(Boolean)
    .every((piece) => {
      const stem = loose(piece).replace(/^[अआइईउऊऋएऐओऔ]/, "");
      if (stem.length <= 2) return true;
      const core = stem.slice(0, Math.max(2, stem.length - 2));
      return target.includes(core);
    });
}

const warnings = [];
const reviewRows = [];

for (const arg of sargaArgs) {
  const sarga = Number(arg);
  const name = String(sarga).padStart(2, "0");
  const jsonPath = join(ROOT, "public/content", kanda, `${name}.json`);
  const srcPath = join(ROOT, "translations/te", kanda, `${name}.txt`);
  if (!existsSync(srcPath)) throw new Error(`missing ${srcPath}`);
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  const blocks = parseSource(readFileSync(srcPath, "utf8"), `translations/te/${kanda}/${name}.txt`);

  for (const id of blocks.keys()) {
    if (!data.verses.some((verse) => verse.id === id)) throw new Error(`${srcPath}: no verse ${id} in ${jsonPath}`);
  }

  for (const verse of data.verses) {
    const block = blocks.get(verse.id);
    if (!block) {
      warnings.push(`${kanda} ${sarga}: ${verse.id} has no Telugu block yet`);
      continue;
    }
    if (block.fix) {
      const fixed = block.fix.split(" / ").map((line) => line.trim()).join("\n");
      if (fixed !== verse.devanagari) {
        reviewRows.push({ id: verse.id, kind: "Sanskrit fix", before: verse.devanagari, after: fixed });
        verse.devanagari = fixed;
        verse.iast = toIast(fixed);
      }
    }
    for (const flag of block.flags) reviewRows.push({ id: verse.id, kind: "English note", before: "", after: flag });
    if (!block.te) throw new Error(`${block.where} ${verse.id} has no te: line`);

    // Anvaya numbers are sort keys: ties keep written order, gaps are closed up.
    block.words
      .map((word, index) => ({ word, index }))
      .sort((a, b) => a.word.anvaya - b.word.anvaya || a.index - b.index)
      .forEach(({ word }, rank) => { word.rank = rank + 1; });
    for (const word of block.words) {
      if (word.placed && !wordInSloka(word.devanagari, verse.devanagari)) {
        warnings.push(`${word.where} ${verse.id}: "${word.devanagari}" not found in the śloka`);
      }
    }

    verse.telugu = toTelugu(verse.devanagari);
    verse.translationTe = block.te;
    let position = 0;
    verse.glosses = block.words.map((word) => ({
      itrans: toItrans(word.devanagari),
      iast: toIast(word.devanagari),
      devanagari: word.devanagari,
      telugu: toTelugu(word.devanagari),
      meaning: word.meaning,
      meaningTe: word.meaningTe,
      anvayaIndex: word.rank - 1,
      verseIndex: word.placed ? position++ : null,
    }));
  }

  data.telugu = { source: `translations/te/${kanda}/${name}.txt`, style: "vyavaharika" };
  writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${kanda} ${sarga}: ${blocks.size}/${data.verses.length} verses`);
}

if (reviewRows.length) {
  const reviewPath = join(ROOT, "translations/te", kanda, "REVIEW.md");
  const existing = existsSync(reviewPath) ? readFileSync(reviewPath, "utf8") : "";
  const lines = reviewRows
    .map((row) =>
      row.kind === "Sanskrit fix"
        ? `- **${row.id}** Sanskrit fix: \`${row.before.replace(/\n/g, " / ")}\` → \`${row.after.replace(/\n/g, " / ")}\``
        : `- **${row.id}** English note: ${row.after}`,
    )
    .filter((line) => !existing.includes(line));
  if (lines.length) {
    const header = existing || `# ${kanda}: items for review\n\nGenerated by scripts/telugu/apply.mjs from fix: and flag: lines.\n\n`;
    writeFileSync(reviewPath, `${header}${lines.join("\n")}\n`);
  }
}

for (const warning of warnings) console.warn(`warn: ${warning}`);
