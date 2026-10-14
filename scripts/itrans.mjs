const VOWELS = [
  ["R^I", "ṝ", "ॠ", "ॄ"],
  ["R^i", "ṛ", "ऋ", "ृ"],
  ["RRI", "ṝ", "ॠ", "ॄ"],
  ["RRi", "ṛ", "ऋ", "ृ"],
  ["L^i", "ḷ", "ऌ", "ॢ"],
  ["LLi", "ḷ", "ऌ", "ॢ"],
  ["aa", "ā", "आ", "ा"],
  ["ai", "ai", "ऐ", "ै"],
  ["au", "au", "औ", "ौ"],
  ["ii", "ī", "ई", "ी"],
  ["uu", "ū", "ऊ", "ू"],
  ["a", "a", "अ", ""],
  ["i", "i", "इ", "ि"],
  ["u", "u", "उ", "ु"],
  ["e", "e", "ए", "े"],
  ["o", "o", "ओ", "ो"],
];

const CONSONANTS = [
  ["j~n", "jñ", "ज्ञ"],
  ["j~N", "jñ", "ज्ञ"],
  ["kh", "kh", "ख"],
  ["gh", "gh", "घ"],
  ["ch", "c", "च"],
  ["Ch", "ch", "छ"],
  ["jh", "jh", "झ"],
  ["Th", "ṭh", "ठ"],
  ["th", "th", "थ"],
  ["Dh", "ḍh", "ढ"],
  ["dh", "dh", "ध"],
  ["ph", "ph", "फ"],
  ["bh", "bh", "भ"],
  ["sh", "ś", "श"],
  ["Sh", "ṣ", "ष"],
  ["S", "ṣ", "ष"],
  ["~N", "ñ", "ञ"],
  ["~n", "ñ", "ञ"],
  ["k", "k", "क"],
  ["g", "g", "ग"],
  ["c", "c", "च"],
  ["j", "j", "ज"],
  ["T", "ṭ", "ट"],
  ["D", "ḍ", "ड"],
  ["N", "ṇ", "ण"],
  ["t", "t", "त"],
  ["d", "d", "द"],
  ["n", "n", "न"],
  ["p", "p", "प"],
  ["b", "b", "ब"],
  ["m", "m", "म"],
  ["y", "y", "य"],
  ["r", "r", "र"],
  ["l", "l", "ल"],
  ["v", "v", "व"],
  ["w", "v", "व"],
  ["s", "s", "स"],
  ["h", "h", "ह"],
];

const NASAL_BEFORE = {
  क: ["ṅ", "ङ"],
  ख: ["ṅ", "ङ"],
  ग: ["ṅ", "ङ"],
  घ: ["ṅ", "ङ"],
  च: ["ñ", "ञ"],
  छ: ["ñ", "ञ"],
  ज: ["ñ", "ञ"],
  झ: ["ñ", "ञ"],
  ट: ["ṇ", "ण"],
  ठ: ["ṇ", "ण"],
  ड: ["ṇ", "ण"],
  ढ: ["ṇ", "ण"],
  त: ["n", "न"],
  थ: ["n", "न"],
  द: ["n", "न"],
  ध: ["n", "न"],
  प: ["m", "म"],
  फ: ["m", "म"],
  ब: ["m", "म"],
  भ: ["m", "म"],
};

function startsWithAt(source, index, token) {
  return source.startsWith(token, index);
}

function matchTable(table, source, index) {
  for (const row of table) {
    if (startsWithAt(source, index, row[0])) return row;
  }
  return null;
}

function peekConsonant(source, index) {
  return matchTable(CONSONANTS, source, index);
}

function isBoundary(char) {
  return char == null || /[\s\d|,.;:!?()[\]"'“”‘’\-]/.test(char);
}

export function transliterate(input) {
  const source = input;
  let index = 0;
  let iast = "";
  let devanagari = "";
  const unknown = [];

  while (index < source.length) {
    const char = source[index];

    if (char === "-") {
      iast += "-";
      devanagari += " ";
      index += 1;
      continue;
    }

    if (char === "|") {
      if (source[index + 1] === "|") {
        iast += " || ";
        devanagari += "॥";
        index += 2;
      } else {
        iast += " | ";
        devanagari += "।";
        index += 1;
      }
      continue;
    }

    if (/[\s\d,;:!?()[\]"'“”‘’]/.test(char)) {
      iast += char;
      devanagari += char;
      index += 1;
      continue;
    }

    if (char === ".") {
      if (startsWithAt(source, index, ".m") || startsWithAt(source, index, ".M") || startsWithAt(source, index, ".n")) {
        iast += "ṃ";
        devanagari += "ं";
        index += 2;
        continue;
      }
      if (startsWithAt(source, index, ".aa") || startsWithAt(source, index, ".AA")) {
        iast += "'ā";
        devanagari += "ऽा";
        index += 3;
        continue;
      }
      if (startsWithAt(source, index, ".a") || startsWithAt(source, index, ".A")) {
        iast += "'";
        devanagari += "ऽ";
        index += 2;
        continue;
      }
      iast += ".";
      devanagari += ".";
      index += 1;
      continue;
    }

    if (char === "H") {
      iast += "ḥ";
      devanagari += "ः";
      index += 1;
      continue;
    }

    if (char === "M") {
      const next = peekConsonant(source, index + 1);
      if (next) {
        const nasal = NASAL_BEFORE[next[2]] ?? ["ṃ", "ं"];
        iast += nasal[0];
        if (nasal[1] === "ं") devanagari += "ं";
        else devanagari += `${nasal[1]}्`;
        index += 1;
        continue;
      }
      iast += "ṃ";
      devanagari += "ं";
      index += 1;
      continue;
    }

    const consonant = matchTable(CONSONANTS, source, index);
    if (consonant) {
      index += consonant[0].length;
      const vowel = matchTable(VOWELS, source, index);
      const nextChar = source[index + (vowel ? vowel[0].length : 0)];
      if (vowel) {
        iast += consonant[1] + vowel[1];
        devanagari += consonant[2] + vowel[3];
        index += vowel[0].length;
      } else if (consonant[1] === "m" && isBoundary(nextChar)) {
        iast += "m";
        devanagari += "ं";
      } else {
        iast += consonant[1];
        devanagari += `${consonant[2]}्`;
      }
      continue;
    }

    const vowel = matchTable(VOWELS, source, index);
    if (vowel) {
      iast += vowel[1];
      devanagari += vowel[2];
      index += vowel[0].length;
      continue;
    }

    unknown.push(char);
    iast += char;
    devanagari += char;
    index += 1;
  }

  return {
    iast: iast.replace(/[ \t]{2,}/g, " ").replace(/\s+\|/g, " |").trim(),
    devanagari: devanagari.replace(/[ ]{2,}/g, " ").trim(),
    unknown,
  };
}

const checks = [
  ["tapaH", "tapaḥ", "तपः"],
  ["svaadhyaaya", "svādhyāya", "स्वाध्याय"],
  ["nirataam", "niratām", "निरतां"],
  ["tapasvii", "tapasvī", "तपस्वी"],
  ["vaagvidaam", "vāgvidām", "वाग्विदां"],
  ["varam", "varam", "वरं"],
  ["naaradam", "nāradam", "नारदं"],
  ["paripapracCha", "paripapraccha", "परिपप्रच्छ"],
  ["vaalmiikiH", "vālmīkiḥ", "वाल्मीकिः"],
  ["puMgavam", "puṅgavam", "पुङ्गवं"],
  ["dharmaj~naH", "dharmajñaḥ", "धर्मज्ञः"],
  ["kR^ita", "kṛta", "कृत"],
  ["samartho.asi", "samartho'si", "समर्थोऽसि"],
  ["chaaritreNa", "cāritreṇa", "चारित्रेण"],
  ["bhuuteSu", "bhūteṣu", "भूतेषु"],
  ["ikShvaaku", "ikṣvāku", "इक्ष्वाकु"],
  ["guNavaan", "guṇavān", "गुणवान्"],
];

export function assertTransliteration() {
  const failures = [];
  for (const [input, iast, devanagari] of checks) {
    const got = transliterate(input);
    if (got.iast !== iast || got.devanagari !== devanagari) {
      failures.push({ input, expected: { iast, devanagari }, got });
    }
  }
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    throw new Error(`${failures.length} transliteration checks failed`);
  }
}
