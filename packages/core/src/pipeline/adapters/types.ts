import type { TrendItem } from "../../models/trend-item.js";

export interface AdapterOptions {
  timeout?: number;
  maxItems?: number;
  signal?: AbortSignal;
}

export interface TrendAdapter {
  name: string;
  enabled: boolean;
  fetch(options?: AdapterOptions): Promise<TrendItem[]>;
}
