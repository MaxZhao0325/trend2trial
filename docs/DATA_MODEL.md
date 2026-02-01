# Trend-to-Trial — Data Model

## TrendCard

```typescript
interface TrendCard {
  id: string;                          // kebab-case slug, e.g. "vllm-paged-attention"
  title: string;                       // Human-readable title
  summary: string;                     // 2-4 sentence summary of the trend
  category: "serving" | "rag" | "llmops";
  sources: Source[];                   // >= 1 source
  date: string;                        // ISO 8601 date (YYYY-MM-DD)
  relevanceScore: number;              // 0-100, higher = more relevant
  tags: string[];                      // Free-form tags for future filtering
}

interface Source {
  title: string;
  url: string;                         // Must be a valid URL
  type: "paper" | "repo" | "blog" | "release" | "video";
}
```

## Recipe

```typescript
interface Recipe {
  id: string;                          // Directory name under recipes/
  name: string;                        // Human-readable name
  category: "serving" | "rag" | "llmops";
  description: string;
  prerequisites: string[];             // e.g. ["Python 3.10+", "Docker"]
  tasks: Task[];
  rubric: RubricItem[];
}

interface Task {
  name: string;
  command: string;                     // Shell command to execute
  description: string;
  timeout?: number;                    // Max seconds (default: 300)
}

interface RubricItem {
  metric: string;                      // e.g. "throughput_tps"
  description: string;
  unit: string;                        // e.g. "tokens/sec"
  target?: string;                     // Optional target value
}
```

## Report (output)

```typescript
interface Report {
  recipeId: string;
  timestamp: string;                   // ISO 8601
  environment: {
    os: string;
    nodeVersion: string;
    arch: string;
  };
  results: Record<string, string | number>;  // metric → value
  steps: StepResult[];
  command: string;                     // Reproducible CLI command
}

interface StepResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  output?: string;
}
```
