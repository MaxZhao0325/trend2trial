import type { Category } from "./trend-card.js";

export interface ChecksummedFile {
  path: string;
  sha256: string;
}

export type RegistryFile = string | ChecksummedFile;

export interface RegistryEntry {
  name: string;
  title: string;
  category: Category;
  estimated_hours: string;
  version: string;
  files: RegistryFile[];
}

export interface Registry {
  schemaVersion: number;
  updatedAt: string;
  recipes: RegistryEntry[];
}
