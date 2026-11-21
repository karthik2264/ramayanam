// Deterministic converters from Devanagari to Telugu script, IAST and ITRANS.
// Devanagari is the source of truth; nothing here translates, it only re-spells.

const VIRAMA = "्";

const INDEPENDENT_VOWELS = {
  "अ": ["a", "a"],
  "आ": ["ā", "aa"],
  "इ": ["i", "i"],
  "ई": ["ī", "ii"],
  "उ": ["u", "u"],
  "ऊ": ["ū", "uu"],
  "ऋ": ["ṛ", "R^i"],
  "ॠ": ["ṝ", "R^I"],
  "ऌ": ["ḷ", "L^i"],
  "ए": ["e", "e"],
  "ऐ": ["ai", "ai"],
  "ओ": ["o", "o"],
  "औ": ["au", "au"],
};

const VOWEL_SIGNS = {
  "ा": ["ā", "aa"],
  "ि": ["i", "i"],
  "ी": ["ī", "ii"],
  "ु": ["u", "u"],
  "ू": ["ū", "uu"],
  "ृ": ["ṛ", "R^i"],
  "ॄ": ["ṝ", "R^I"],
  "ॢ": ["ḷ", "L^i"],
  "े": ["e", "e"],
  "ै": ["ai", "ai"],
  "ो": ["o", "o"],
  "ौ": ["au", "au"],
};

const CONSONANTS = {
  "क": ["k", "k"],
  "ख": ["kh", "kh"],
  "ग": ["g", "g"],
  "घ": ["gh", "gh"],
  "ङ": ["ṅ", "~N"],
  "च": ["c", "ch"],
  "छ": ["ch", "Ch"],
  "ज": ["j", "j"],
  "झ": ["jh", "jh"],
  "ञ": ["ñ", "~n"],
  "ट": ["ṭ", "T"],
  "ठ": ["ṭh", "Th"],
  "ड": ["ḍ", "D"],
  "ढ": ["ḍh", "Dh"],
  "ण": ["ṇ", "N"],
  "त": ["t", "t"],
  "थ": ["th", "th"],
  "द": ["d", "d"],
  "ध": ["dh", "dh"],
  "न": ["n", "n"],
  "प": ["p", "p"],
  "फ": ["ph", "ph"],
  "ब": ["b", "b"],
  "भ": ["bh", "bh"],
  "म": ["m", "m"],
  "य": ["y", "y"],
  "र": ["r", "r"],
  "ल": ["l", "l"],
  "ळ": ["ḻ", "L"],
  "व": ["v", "v"],
  "श": ["ś", "sh"],
  "ष": ["ṣ", "Sh"],
  "स": ["s", "s"],
  "ह": ["h", "h"],
};

const MARKS = {
  "ं": ["ṃ", "M"],
  "ः": ["ḥ", "H"],
  "ँ": ["m̐", ".N"],
  "ऽ": ["'", ".a"],
};

// Nasal + same-class stop is printed with an anusvara in Telugu (పుంగవ, శాంతి).
const NASAL_CLASS = {
  "ङ": "कखगघ",
  "ञ": "चछजझ",
  "ण": "टठडढ",
  "न": "तथदध",
  "म": "पफबभ",
};

const STRIP = /[॒॑‌‍]/g;

/** Devanagari → Telugu script. */
export function toTelugu(input) {
  const text = input.normalize("NFC").replace(STRIP, "");
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    const after = text[i + 2];
    if (NASAL_CLASS[ch] && next === VIRAMA && after && NASAL_CLASS[ch].includes(after)) {
      out += "ం";
      i += 1;
      continue;
    }
    if (ch === "ॐ") {
      out += "ఓం";
      continue;
    }
    const code = ch.codePointAt(0);
    if (code >= 0x0901 && code <= 0x0963 && code !== 0x0964 && code !== 0x0965) {
      out += String.fromCodePoint(code + 0x300);
      continue;
    }
    out += ch;
  }
  return out;
}

function romanize(input, column) {
  const text = input.normalize("NFC").replace(STRIP, "");
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (CONSONANTS[ch]) {
      out += CONSONANTS[ch][column];
      const next = text[i + 1];
      if (next === VIRAMA) {
        i += 1;
      } else if (VOWEL_SIGNS[next]) {
        out += VOWEL_SIGNS[next][column];
        i += 1;
      } else {
        out += "a";
      }
      continue;
    }
    if (INDEPENDENT_VOWELS[ch]) {
      out += INDEPENDENT_VOWELS[ch][column];
      continue;
    }
    if (MARKS[ch]) {
      out += MARKS[ch][column];
      continue;
    }
    if (ch === "।" || ch === "॥") {
      out += ch === "।" ? "|" : "||";
      continue;
    }
    out += ch;
  }
  return out;
}

/** Devanagari → IAST. */
export function toIast(input) {
  return romanize(input, 0);
}

/** Devanagari → ITRANS. */
export function toItrans(input) {
  return romanize(input, 1);
}
