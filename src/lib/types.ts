export type KandaId =
  | "bala"
  | "ayodhya"
  | "aranya"
  | "kishkindha"
  | "sundara"
  | "yuddha"
  | "uttara";

export type KandaInfo = {
  id: KandaId;
  sanskrit: string;
  name: string;
  gloss: string;
  translator: string;
};

export type SargaInfo = {
  kanda: KandaId;
  number: number;
  title: string;
  available: boolean;
};

export type Catalog = {
  kandas: KandaInfo[];
  sargas: SargaInfo[];
};

export type Gloss = {
  itrans: string;
  iast: string;
  devanagari: string;
  meaning: string;
  anvayaIndex: number;
  verseIndex: number | null;
};

export type Verse = {
  id: string;
  label: string;
  numbers: number[];
  devanagari: string;
  iast: string;
  translation: string;
  notes: string[];
  glosses: Gloss[];
};

export type SargaFile = {
  kanda: KandaId;
  sarga: number;
  title: string;
  sourceUrl: string;
  romanUrl?: string;
  translator: string;
  introduction: string[];
  closing: string[];
  verses: Verse[];
};

export type Bookmark = {
  verseId: string;
  kanda: KandaId;
  sarga: number;
  label: string;
  kandaName: string;
  sargaTitle: string;
  snippet: string;
  createdAt: number;
};

export type Progress = {
  id: string;
  kanda: KandaId;
  sarga: number;
  verseId: string;
  label: string;
  kandaName: string;
  sargaTitle: string;
  updatedAt: number;
};
