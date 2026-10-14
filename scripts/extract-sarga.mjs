import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { assertTransliteration, transliterate } from "./itrans.mjs";

assertTransliteration();

const DEV_DIGITS = "०१२३४५६७८९";

const sourceDir = path.resolve("scripts/source");
const sansPath = path.join(sourceDir, "bala-1-sans.htm");
const itransPath = path.join(sourceDir, "bala-1-itrans.htm");
const outPath = path.resolve("public/content/bala/01.json");

function latinDigits(value) {
  return value.replace(/[०-९]/g, (char) => String(DEV_DIGITS.indexOf(char)));
}

function cleanPlain(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function textWithBreaks(element) {
  let out = "";
  const walk = (node) => {
    if (node.nodeType === 3) {
      out += (node.rawText ?? "").replace(/[ \t]*\n[ \t]*/g, " ");
      return;
    }
    const tag = (node.tagName || "").toLowerCase();
    if (tag === "br") {
      out += "\n";
      return;
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(element);
  return cleanPlain(out);
}

function toIastOrOriginal(value) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed || !/[A-Za-z]/.test(trimmed) || /[\u0900-\u097F]/.test(trimmed)) return trimmed;
  const converted = transliterate(trimmed);
  const unknownLetters = converted.unknown.filter((char) => /[A-Za-z]/.test(char));
  if (unknownLetters.length) return trimmed;
  return converted.iast;
}

function richText(element) {
  let out = "";
  const walk = (node) => {
    if (node.nodeType === 3) {
      out += (node.rawText ?? "").replace(/[ \t]*\n[ \t]*/g, " ");
      return;
    }
    const tag = (node.tagName || "").toLowerCase();
    if (tag === "br") {
      out += "\n";
      return;
    }
    if (tag === "em" || tag === "i") {
      const inner = toIastOrOriginal(node.text || "");
      if (inner) out += `<em>${inner}</em>`;
      return;
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(element);
  return cleanPlain(out);
}

function cleanHead(raw) {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/^\s*(?:\d+[a-z]?(?:\s*,\s*\d+[a-z]?)*)\s*\.?\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMeaning(raw) {
  let meaning = raw.replace(/\u00a0/g, " ");
  const eq = meaning.indexOf("=");
  if (eq >= 0) meaning = meaning.slice(eq + 1);
  return meaning.replace(/^[\s:;]+/, "").replace(/[\s;]+$/, "").replace(/\s+/g, " ").trim();
}

function parseGlosses(element) {
  const text = (element.text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
  const glosses = [];
  const pattern = /([^;=]+?)\s*=\s*([^;]+)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const itrans = cleanHead(match[1]).replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
    const meaning = match[2].replace(/\s+/g, " ").replace(/^[\s:]+/, "").replace(/[\s,]+$/, "").trim();
    if (!itrans || !meaning || !/[A-Za-z]{2,}/.test(itrans)) continue;
    if (/\d/.test(itrans) && /^[\d\s,a-z.]+$/i.test(itrans)) continue;
    glosses.push({ itrans, meaning });
  }
  return glosses;
}

function verseKeys(sloka) {
  const text = latinDigits(sloka);
  const keys = [];
  const re = /(\d+)\s*-\s*(\d+)\s*-\s*(\d+)([a-z])?/g;
  let match;
  while ((match = re.exec(text))) {
    keys.push(`${Number(match[1])}.${Number(match[2])}.${Number(match[3])}${match[4] ?? ""}`);
  }
  return keys;
}

function cleanDevanagari(sloka) {
  return sloka
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line) => line.replace(/\s*[०-९0-9]+(?:\s*[-–]\s*[०-९0-9]+)+(?:\s*[a-zA-Z])?\s*$/u, "").trim())
    .filter(Boolean)
    .join("\n");
}

function cleanItransSloka(sloka) {
  return sloka
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").replace(/\s*\d+\s*-\s*\d+\s*-\s*\d+[a-z]?\s*$/i, "").trim())
    .filter(Boolean)
    .join("\n");
}

function cleanTranslation(value) {
  return cleanPlain(value)
    .replace(/\s*\[\d+\s*-\s*\d+\s*-\s*\d+[a-z]?(?:\s*,\s*\d+[a-z]?)*\]\s*$/i, "")
    .trim();
}

function walkPage(html, slokaClass) {
  const root = parse(html);
  const intro = [];
  const blocks = [];
  const closing = [];
  let current = null;
  let started = false;

  for (const element of root.querySelectorAll("p, h4")) {
    const className = element.getAttribute("class") || "";
    if (className.includes("verloc")) {
      if (current) blocks.push(current);
      current = { sloka: "", pratipada: null, translations: [], notes: [], citationKeys: [] };
      started = true;
      continue;
    }
    if (!started) {
      if (className.includes("tat") || className.includes("comment")) {
        const text = textWithBreaks(element);
        if (text) intro.push(text);
      }
      continue;
    }
    if (!current) continue;
    if (className.includes(slokaClass) || (slokaClass === "SanSloka" && className.includes("SanSloka"))) {
      const text = textWithBreaks(element);
      const keep = slokaClass === "ItrSloka" ? /[A-Za-z]/.test(text) : /[\u0900-\u097F]/.test(text);
      if (keep) current.sloka = current.sloka ? `${current.sloka}\n${text}` : text;
      continue;
    }
    if (className.includes("pratipada")) {
      current.pratipada = element;
      continue;
    }
    if (className.includes("tat")) {
      const raw = textWithBreaks(element);
      const text = cleanTranslation(raw);
      if (text) current.translations.push(text);
      current.citationKeys.push(...verseKeys(raw));
      continue;
    }
    if (className.includes("comment") || element.tagName === "H4") {
      const text = richText(element);
      if (text) current.notes.push(text);
    }
  }
  if (current) blocks.push(current);

  const verses = [];
  for (const block of blocks) {
    const glosses = block.pratipada ? parseGlosses(block.pratipada) : [];
    const labelHint = block.pratipada ? (block.pratipada.text.match(/^\s*((?:\d+[a-z]?)(?:\s*,\s*\d+[a-z]?)*)/) || [])[1] : null;
    let keys = verseKeys(block.sloka);
    if (!keys.length) keys = block.citationKeys ?? [];
    if (!keys.length && labelHint) {
      keys = labelHint
        .split(",")
        .map((part) => part.trim().match(/^(\d+)([a-z])?$/))
        .filter(Boolean)
        .map((match) => `1.1.${Number(match[1])}${match[2] ?? ""}`);
    }
    if (keys.length > 4) {
      if (block.sloka) closing.push(block.sloka);
      for (const note of block.notes) closing.push(note);
      continue;
    }
    if (!keys.length && glosses.length === 0) {
      if (block.sloka) closing.push(block.sloka);
      for (const note of block.notes) closing.push(note.replace(/<\/?em>/g, ""));
      for (const translation of block.translations) closing.push(translation);
      continue;
    }
    const gayatri = [];
    const notes = [];
    for (const note of block.notes) {
      if (/gayatri|गायत्री/i.test(note)) gayatri.push(note);
      else notes.push(note);
    }
    closing.push(...gayatri);
    verses.push({
      keys,
      labelHint,
      sloka: block.sloka,
      glosses,
      translation: block.translations.join("\n\n"),
      notes,
    });
  }

  return { intro: intro.map(cleanPlain).filter(Boolean), verses, closing: closing.map(cleanPlain).filter(Boolean) };
}

function loose(value) {
  return value
    .toLowerCase()
    .replace(/\^/g, "")
    .replace(/~/g, "")
    .replace(/mg/g, "ng")
    .replace(/aa/g, "a")
    .replace(/ii/g, "i")
    .replace(/uu/g, "u")
    .replace(/sh/g, "s")
    .replace(/ch/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = a[i - 1] === b[j - 1] ? previous : Math.min(previous, row[j], row[j - 1]) + 1;
      previous = current;
    }
  }
  return row[b.length];
}

function skeleton(value) {
  return loose(value).replace(/([a-z])h/g, "$1");
}

function glossParts(head) {
  return head.split(/[\s\-–]+/).map((part) => part.trim()).filter((part) => /[a-zA-Z]/.test(part));
}

function verseTokens(sloka) {
  return cleanItransSloka(sloka)
    .replace(/\|/g, " ")
    .replace(/\.(?=[A-Za-z])/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => /[A-Za-z]/.test(token));
}

function near(a, b) {
  const left = loose(a);
  const right = loose(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftStem = skeleton(left);
  const rightStem = skeleton(right);
  if (leftStem === rightStem) return true;
  if (left.length < 4 || right.length < 4) return false;
  if (Math.abs(left.length - right.length) > 2) return false;
  return levenshtein(left, right) <= 1 || levenshtein(leftStem, rightStem) <= 1;
}

function findBag(tokens, parts, used) {
  if (!parts.length || parts.length > 6) return null;
  const options = parts.map((part) => {
    const hits = [];
    for (let index = 0; index < tokens.length; index += 1) {
      if (!used[index] && near(tokens[index], part)) hits.push(index);
    }
    return hits;
  });
  if (options.some((hits) => hits.length === 0)) return null;
  let best = null;
  const chosen = [];
  const walk = (depth) => {
    if (depth === options.length) {
      const start = Math.min(...chosen);
      const end = Math.max(...chosen);
      if (end - start + 1 > parts.length + 2) return;
      if (!best || end - start < best.span || (end - start === best.span && start < best.start)) {
        best = { start, span: end - start, positions: [...chosen] };
      }
      return;
    }
    for (const index of options[depth]) {
      if (chosen.includes(index)) continue;
      chosen.push(index);
      walk(depth + 1);
      chosen.pop();
    }
  };
  walk(0);
  return best;
}

function findJoined(tokens, parts, used) {
  const joined = loose(parts.join(""));
  const joinedStem = skeleton(parts.join(""));
  if (!joined) return null;
  for (let index = 0; index < tokens.length; index += 1) {
    if (used[index]) continue;
    if (loose(tokens[index]) === joined || skeleton(tokens[index]) === joinedStem || near(tokens[index], parts.join(""))) {
      return { start: index, positions: [index] };
    }
  }
  for (let start = 0; start < tokens.length; start += 1) {
    if (used[start]) continue;
    let acc = "";
    const positions = [];
    for (let index = start; index < tokens.length && positions.length < parts.length + 1; index += 1) {
      if (used[index]) break;
      acc += loose(tokens[index]);
      positions.push(index);
      if (acc === joined || skeleton(acc) === joinedStem) return { start, positions };
    }
  }
  return null;
}

function alignGlosses(sloka, rawGlosses) {
  const tokens = verseTokens(sloka);
  const glosses = rawGlosses.map((gloss, anvayaIndex) => ({
    ...gloss,
    anvayaIndex,
    parts: glossParts(gloss.itrans),
    verseIndex: null,
  }));
  const used = tokens.map(() => false);
  const longestFirst = [...glosses].sort((a, b) => b.parts.length - a.parts.length || b.itrans.length - a.itrans.length);
  for (const gloss of longestFirst) {
    if (!gloss.parts.length) continue;
    const span = findBag(tokens, gloss.parts, used) ?? findJoined(tokens, gloss.parts, used);
    if (!span) continue;
    gloss.verseIndex = span.start;
    for (const position of span.positions) used[position] = true;
  }
  return glosses;
}

function formatLabel(keys) {
  if (!keys.length) return "";
  if (keys.length === 1) return keys[0];
  const [book, chapter] = keys[0].split(".");
  const tails = keys.map((key) => key.split(".").slice(2).join("."));
  return `${book}.${chapter}.${tails.join(", ")}`;
}

function numbersOf(keys) {
  return [...new Set(keys.map((key) => Number(key.split(".")[2].replace(/\D/g, ""))).filter((n) => Number.isFinite(n)))];
}

function finishGloss(gloss) {
  const converted = transliterate(gloss.itrans);
  return {
    itrans: gloss.itrans,
    iast: converted.iast,
    devanagari: converted.devanagari,
    meaning: gloss.meaning,
    anvayaIndex: gloss.anvayaIndex,
    verseIndex: gloss.verseIndex,
  };
}

function build() {
  const sans = walkPage(fs.readFileSync(sansPath, "utf8"), "SanSloka");
  const itrans = walkPage(fs.readFileSync(itransPath, "utf8"), "ItrSloka");
  const byKey = new Map();
  const ensure = (keys) => {
    const id = keys[0];
    if (!id) return null;
    if (!byKey.has(id)) {
      byKey.set(id, { keys, roman: "", devanagari: "", glosses: [], translation: "", notes: [] });
    }
    const slot = byKey.get(id);
    if (keys.length > slot.keys.length && keys.length <= 4) slot.keys = keys;
    return slot;
  };

  for (const roman of itrans.verses) {
    const slot = ensure(roman.keys);
    if (!slot) continue;
    if (roman.sloka && !slot.roman) slot.roman = roman.sloka;
    if (roman.glosses.length && slot.glosses.length === 0) slot.glosses = roman.glosses;
    if (roman.translation && !slot.translation) slot.translation = roman.translation;
    if (roman.notes.length && slot.notes.length === 0) slot.notes = roman.notes;
  }
  for (const verse of sans.verses) {
    const slot = ensure(verse.keys);
    if (!slot) continue;
    if (verse.sloka) slot.devanagari = verse.sloka;
    if (verse.translation) slot.translation = verse.translation;
    if (verse.notes.length) slot.notes = verse.notes;
    if (verse.glosses.length && slot.glosses.length === 0) slot.glosses = verse.glosses;
  }

  const merged = [...byKey.values()]
    .filter((slot) => slot.devanagari || slot.glosses.length)
    .map((slot) => {
      const aligned = alignGlosses(slot.roman, slot.glosses);
      const iastLines = cleanItransSloka(slot.roman)
        .split("\n")
        .map((line) => transliterate(line).iast)
        .filter(Boolean)
        .join("\n");
      return {
        id: slot.keys[0],
        label: formatLabel(slot.keys),
        numbers: numbersOf(slot.keys),
        devanagari: cleanDevanagari(slot.devanagari),
        iast: iastLines,
        translation: slot.translation,
        notes: slot.notes,
        glosses: aligned.map(finishGloss),
      };
    })
    .sort((a, b) => (a.numbers[0] ?? 0) - (b.numbers[0] ?? 0) || a.label.localeCompare(b.label));

  const glossCount = merged.reduce((sum, verse) => sum + verse.glosses.length, 0);
  const unplaced = merged.flatMap((verse) =>
    verse.glosses.filter((gloss) => gloss.verseIndex == null).map((gloss) => `${verse.id} ${gloss.itrans}`),
  );

  const document = {
    kanda: "bala",
    sarga: 1,
    title: "Narada briefs Valmiki about Rama and the Ramayana in a nutshell",
    sourceUrl: "https://www.valmikiramayan.net/utf8/baala/sarga1/balasans1.htm",
    romanUrl: "https://www.valmikiramayan.net/utf8/baala/sarga1/balaitrans1.htm",
    translator: "Desiraju Hanumanta Rao",
    introduction: sans.intro,
    closing: sans.closing.filter((line, index, all) => line.length > 20 && all.indexOf(line) === index),
    verses: merged,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);

  console.log(`verses ${merged.length}`);
  console.log(`glosses ${glossCount}`);
  console.log(`unplaced ${unplaced.length}`);
  console.log(unplaced.slice(0, 40).join("\n"));
  const first = merged.find((verse) => verse.id === "1.1.1") ?? merged[0];
  console.log(`--- ${first.id} written order ---`);
  console.log(
    [...first.glosses]
      .sort((a, b) => (a.verseIndex ?? 999) - (b.verseIndex ?? 999))
      .map((gloss) => `${gloss.verseIndex ?? "-"} ${gloss.devanagari} = ${gloss.meaning}`)
      .join("\n"),
  );
}

const tempSans = path.join(process.env.TEMP ?? "", "balasans1.htm");
const tempItrans = path.join(process.env.TEMP ?? "", "balaitrans1.htm");
fs.mkdirSync(sourceDir, { recursive: true });
if (!fs.existsSync(sansPath) && fs.existsSync(tempSans)) fs.copyFileSync(tempSans, sansPath);
if (!fs.existsSync(itransPath) && fs.existsSync(tempItrans)) fs.copyFileSync(tempItrans, itransPath);

build();
