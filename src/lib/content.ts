import type { Catalog, KandaId, SargaFile, SargaInfo } from "./types";

export function asset(path: string) {
  const base = import.meta.env.BASE_URL;
  return `${base}${path}`.replace(/([^:])\/{2,}/g, "$1/");
}

export async function loadCatalog(): Promise<Catalog> {
  const response = await fetch(asset("content/catalog.json"));
  if (!response.ok) throw new Error("Could not load the book list.");
  return response.json() as Promise<Catalog>;
}

export function sargaPath(kanda: string, number: number) {
  return `content/${kanda}/${String(number).padStart(2, "0")}.json`;
}

export async function loadSarga(kanda: string, number: number): Promise<SargaFile> {
  const response = await fetch(asset(sargaPath(kanda, number)));
  if (!response.ok) throw new Error("This chapter is not on the desk yet.");
  return response.json() as Promise<SargaFile>;
}

export function sargasFor(catalog: Catalog, kanda: KandaId): SargaInfo[] {
  return catalog.sargas.filter((sarga) => sarga.kanda === kanda);
}

export function findKanda(catalog: Catalog, id: string) {
  return catalog.kandas.find((kanda) => kanda.id === id);
}

const sargaCache = new Map<string, Promise<SargaFile>>();

export function loadSargaCached(kanda: string, number: number) {
  const key = `${kanda}/${number}`;
  let pending = sargaCache.get(key);
  if (!pending) {
    pending = loadSarga(kanda, number);
    sargaCache.set(key, pending);
  }
  return pending;
}

export async function loadAvailableSargas(catalog: Catalog) {
  const available = catalog.sargas.filter((sarga) => sarga.available);
  return Promise.all(available.map((sarga) => loadSargaCached(sarga.kanda, sarga.number)));
}
