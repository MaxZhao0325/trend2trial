export type Category = "serving" | "rag" | "llmops";
export type SourceType = "paper" | "repo" | "blog" | "release" | "video";

export interface Source {
  title: string;
  url: string;
  type: SourceType;
}

export interface TrendCard {
  id: string;
  title: string;
  summary: string;
  category: Category;
  sources: Source[];
  date: string;
  relevanceScore: number;
  tags: string[];
}

const CATEGORIES: ReadonlySet<string> = new Set(["serving", "rag", "llmops"]);
const SOURCE_TYPES: ReadonlySet<string> = new Set(["paper", "repo", "blog", "release", "video"]);

export interface ValidationError {
  field: string;
  message: string;
}

export function validateTrendCard(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof data !== "object" || data === null) {
    return [{ field: "root", message: "must be a non-null object" }];
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string" || obj.id.length === 0) {
    errors.push({ field: "id", message: "must be a non-empty string" });
  }
  if (typeof obj.title !== "string" || obj.title.length === 0) {
    errors.push({ field: "title", message: "must be a non-empty string" });
  }
  if (typeof obj.summary !== "string" || obj.summary.length === 0) {
    errors.push({ field: "summary", message: "must be a non-empty string" });
  }
  if (typeof obj.category !== "string" || !CATEGORIES.has(obj.category)) {
    errors.push({ field: "category", message: `must be one of: ${[...CATEGORIES].join(", ")}` });
  }
  if (typeof obj.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(obj.date)) {
    errors.push({ field: "date", message: "must be ISO 8601 date (YYYY-MM-DD)" });
  }
  if (typeof obj.relevanceScore !== "number" || obj.relevanceScore < 0 || obj.relevanceScore > 100) {
    errors.push({ field: "relevanceScore", message: "must be a number between 0 and 100" });
  }
  if (!Array.isArray(obj.tags)) {
    errors.push({ field: "tags", message: "must be an array" });
  }

  if (!Array.isArray(obj.sources) || obj.sources.length === 0) {
    errors.push({ field: "sources", message: "must be a non-empty array" });
  } else {
    for (let i = 0; i < obj.sources.length; i++) {
      const src = obj.sources[i] as Record<string, unknown>;
      if (typeof src.title !== "string" || src.title.length === 0) {
        errors.push({ field: `sources[${i}].title`, message: "must be a non-empty string" });
      }
      if (typeof src.url !== "string" || !src.url.startsWith("http")) {
        errors.push({ field: `sources[${i}].url`, message: "must be a valid URL" });
      }
      if (typeof src.type !== "string" || !SOURCE_TYPES.has(src.type)) {
        errors.push({
          field: `sources[${i}].type`,
          message: `must be one of: ${[...SOURCE_TYPES].join(", ")}`,
        });
      }
    }
  }

  return errors;
}
