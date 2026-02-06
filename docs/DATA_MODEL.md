# Trend-to-Trial — Data Model

## TrendItem (pipeline internal)

Raw item from a trend adapter before conversion to TrendCard.

```typescript
interface TrendItem {
  title: string;
  url: string;
  source: string; // Adapter name, e.g. "rss", "hackernews"
  tags: string[];
  score: number; // Raw score from adapter
  publishedAt: string; // ISO 8601 date
  summary: string;
  trialRecipeSuggestion: string;
}
```

## TrendCard (public model)

Validated trend card stored in JSON files and rendered on the web.

```typescript
type Category = "serving" | "rag" | "llmops";
type SourceType = "paper" | "repo" | "blog" | "release" | "video";

interface Source {
  title: string;
  url: string; // Must start with "http"
  type: SourceType;
}

interface TrendCard {
  id: string; // kebab-case slug, e.g. "vllm-paged-attention"
  title: string;
  summary: string; // 2-4 sentence summary
  category: Category;
  sources: Source[]; // >= 1 source
  date: string; // ISO 8601 date (YYYY-MM-DD)
  relevanceScore: number; // 0-100, higher = more relevant
  tags: string[];
}
```

## Recipe

Defined by `tasks.yaml` + `rubric.yaml` in each recipe directory.

```typescript
interface TaskStep {
  name: string;
  description: string;
  command: string; // Shell command to execute
  timeout_seconds?: number; // Max seconds (default: 60)
}

interface RubricMetric {
  name: string;
  description: string;
  unit: string; // e.g. "ms", "rps", "%"
  expected?: string; // Optional target value
}

interface Rubric {
  metrics: RubricMetric[];
  pass_criteria: string; // Human-readable pass condition
}

interface RecipeMeta {
  name: string; // Directory name under recipes/
  title: string; // Human-readable title
  category: Category;
  estimated_hours: string;
}

interface Recipe extends RecipeMeta {
  tasks: TaskStep[];
  rubric: Rubric;
}
```

## Registry

Recipe registry at `recipes/registry.json` for remote fetching.

```typescript
interface ChecksummedFile {
  path: string;
  sha256: string;
}

type RegistryFile = string | ChecksummedFile;

interface RegistryEntry {
  name: string;
  title: string;
  category: Category;
  estimated_hours: string;
  version: string; // Semantic version, e.g. "0.1.0"
  files: RegistryFile[]; // Files to download (string = legacy, object = checksummed)
}

interface Registry {
  schemaVersion: number; // Currently 1
  updatedAt: string; // ISO 8601 date
  recipes: RegistryEntry[];
}
```

## RunOptions & RunResult

Execution options and results from `runRecipe()`.

```typescript
interface RunOptions {
  confirmed: boolean; // Must be true to execute
  failFast?: boolean; // Stop on first failure (default: true)
}

interface StepResult {
  name: string;
  exitCode: number; // 0 = success
  stdout: string;
  stderr: string;
  durationMs: number;
}

interface RunResult {
  recipe: string; // Recipe name
  steps: StepResult[];
  metrics: Record<string, unknown>; // From metrics.json (optional)
  startedAt: string; // ISO 8601
  finishedAt: string; // ISO 8601
}
```

## TrendsEnvelope

Versioned JSON envelope written by `writeTrends()`.

```typescript
interface TrendsEnvelope {
  schemaVersion: number; // Currently 1
  generatedAt: string; // ISO 8601
  cards: TrendCard[];
}
```
