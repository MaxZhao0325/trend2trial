import type { Category } from "./trend-card.js";

export interface RegistryEntry {
  name: string;
  title: string;
  category: Category;
  estimated_hours: string;
  version: string;
  files: string[];
}

export interface Registry {
  schemaVersion: number;
  updatedAt: string;
  recipes: RegistryEntry[];
}
