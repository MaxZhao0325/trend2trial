import type { Category } from "./trend-card.js";

export interface TaskStep {
  name: string;
  description: string;
  command: string;
  timeout_seconds?: number;
}

export interface RubricMetric {
  name: string;
  description: string;
  unit: string;
  expected?: string;
}

export interface Rubric {
  metrics: RubricMetric[];
  pass_criteria: string;
}

export interface RecipeMeta {
  name: string;
  title: string;
  category: Category;
  estimated_hours: string;
}

export interface Recipe extends RecipeMeta {
  tasks: TaskStep[];
  rubric: Rubric;
}

export interface StepResult {
  name: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface RunResult {
  recipe: string;
  steps: StepResult[];
  metrics: Record<string, unknown>;
  startedAt: string;
  finishedAt: string;
}
