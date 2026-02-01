import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const DIST = resolve(__dirname, "../dist");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadRecipes() {
  const recipesDir = resolve(ROOT, "recipes");
  let entries;
  try {
    entries = await readdir(recipesDir);
  } catch {
    return [];
  }

  const recipes = [];
  for (const entry of entries) {
    const tasksPath = join(recipesDir, entry, "tasks.yaml");
    const readmePath = join(recipesDir, entry, "README.md");
    try {
      await stat(tasksPath);
      const raw = await readFile(tasksPath, "utf-8");

      // Simple YAML parsing for the fields we need (no dependency needed in build script)
      const name = entry;
      const titleMatch = raw.match(/^title:\s*"?(.+?)"?\s*$/m);
      const categoryMatch = raw.match(/^category:\s*(\w+)/m);
      const hoursMatch = raw.match(/^estimated_hours:\s*"?(.+?)"?\s*$/m);
      const title = titleMatch ? titleMatch[1] : name;
      const category = categoryMatch ? categoryMatch[1] : "unknown";
      const hours = hoursMatch ? hoursMatch[1] : "?";

      // Count tasks
      const taskMatches = raw.match(/- name:/g);
      const taskCount = taskMatches ? taskMatches.length : 0;

      // Read first paragraph of README for description
      let description = "";
      try {
        const readme = await readFile(readmePath, "utf-8");
        const lines = readme.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line && !line.startsWith("#") && !line.startsWith("```") && !line.startsWith("-")) {
            description = line;
            break;
          }
        }
      } catch {
        // no README
      }

      recipes.push({ name, title, category, hours, taskCount, description });
    } catch {
      // skip
    }
  }
  return recipes;
}

async function build() {
  const raw = await readFile(resolve(ROOT, "data/sample.json"), "utf-8");
  const cards = JSON.parse(raw);
  const recipes = await loadRecipes();

  await mkdir(DIST, { recursive: true });

  const sortedCards = cards.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const trendRows = sortedCards
    .map(
      (c) => `
      <tr>
        <td class="score-cell"><div class="score">${c.relevanceScore}</div></td>
        <td>
          <div class="trend-title">${escapeHtml(c.title)}</div>
          <p class="trend-summary">${escapeHtml(c.summary)}</p>
          <div class="trend-sources">${c.sources.map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a>`).join(" · ")}</div>
        </td>
        <td><span class="badge badge-${c.category}">${c.category}</span></td>
        <td class="date-cell">${c.date}</td>
      </tr>`,
    )
    .join("\n");

  const recipeCards = recipes
    .map(
      (r) => `
      <div class="recipe-card">
        <div class="recipe-header">
          <span class="badge badge-${r.category}">${r.category}</span>
          <span class="recipe-hours">${r.hours}h</span>
        </div>
        <h3 class="recipe-title">${escapeHtml(r.title)}</h3>
        <p class="recipe-desc">${escapeHtml(r.description)}</p>
        <div class="recipe-meta">
          <span>${r.taskCount} steps</span>
          <code>recipe init ${r.name}</code>
        </div>
      </div>`,
    )
    .join("\n");

  const stats = {
    trends: cards.length,
    recipes: recipes.length,
    categories: [...new Set(cards.map((c) => c.category))].length,
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trend-to-Trial — AI Infra Trend Radar</title>
  <style>
    :root {
      --bg: #fafafa;
      --surface: #ffffff;
      --text: #1a1a2e;
      --text-secondary: #555;
      --text-muted: #888;
      --border: #e8e8e8;
      --accent: #4361ee;
      --serving: #1565c0;
      --serving-bg: #e3f2fd;
      --rag: #7b1fa2;
      --rag-bg: #f3e5f5;
      --llmops: #e65100;
      --llmops-bg: #fff3e0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
      padding: 3rem 1rem 2.5rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    .header .tagline {
      font-size: 1.1rem;
      opacity: 0.85;
      font-weight: 300;
      margin-bottom: 1.5rem;
    }
    .stats-row {
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .stat {
      text-align: center;
    }
    .stat-number {
      font-size: 1.8rem;
      font-weight: 700;
      display: block;
    }
    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.7;
    }

    /* Container */
    .container {
      max-width: 1020px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    /* Section */
    .section {
      margin-top: 2.5rem;
    }
    .section-header {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--border);
    }
    .section-header h2 {
      font-size: 1.4rem;
      font-weight: 600;
    }
    .section-header .section-count {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    /* Trends Table */
    .trends-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .trends-table thead th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .trends-table td {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .trends-table tr:last-child td { border-bottom: none; }
    .score-cell { width: 50px; text-align: center; }
    .score {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
      background: var(--bg);
      color: var(--accent);
    }
    .trend-title { font-weight: 600; font-size: 1rem; margin-bottom: 0.3rem; }
    .trend-summary { font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 0.4rem; line-height: 1.5; }
    .trend-sources a {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.8rem;
    }
    .trend-sources a:hover { text-decoration: underline; }
    .date-cell { font-size: 0.85rem; color: var(--text-muted); white-space: nowrap; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge-serving { background: var(--serving-bg); color: var(--serving); }
    .badge-rag { background: var(--rag-bg); color: var(--rag); }
    .badge-llmops { background: var(--llmops-bg); color: var(--llmops); }

    /* Recipe Cards Grid */
    .recipe-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .recipe-card {
      background: var(--surface);
      border-radius: 8px;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.2s;
    }
    .recipe-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .recipe-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .recipe-hours {
      font-size: 0.8rem;
      color: var(--text-muted);
      background: var(--bg);
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }
    .recipe-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .recipe-desc {
      font-size: 0.88rem;
      color: var(--text-secondary);
      flex: 1;
      margin-bottom: 0.75rem;
      line-height: 1.5;
    }
    .recipe-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: var(--text-muted);
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }
    .recipe-meta code {
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 0.75rem;
      background: var(--bg);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    /* CLI Section */
    .cli-section {
      margin-top: 2.5rem;
      margin-bottom: 3rem;
      background: #1a1a2e;
      border-radius: 8px;
      padding: 1.5rem;
      color: #e0e0e0;
    }
    .cli-section h3 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #888;
      margin-bottom: 1rem;
    }
    .cli-section pre {
      font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
      font-size: 0.85rem;
      line-height: 1.8;
      overflow-x: auto;
    }
    .cli-section .comment { color: #666; }
    .cli-section .cmd { color: #64ffda; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 2rem 1rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
    }
    .footer a { color: var(--accent); text-decoration: none; }

    /* Mobile */
    @media (max-width: 640px) {
      .header h1 { font-size: 1.6rem; }
      .trends-table, .trends-table thead, .trends-table tbody, .trends-table th, .trends-table td, .trends-table tr { display: block; }
      .trends-table thead { display: none; }
      .trends-table td { padding: 0.5rem 1rem; border: none; }
      .trends-table tr { border-bottom: 1px solid var(--border); padding: 0.75rem 0; }
      .score-cell { text-align: left; }
      .recipe-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>Trend-to-Trial</h1>
    <p class="tagline">AI Infra Trend Radar + Trial Playground</p>
    <div class="stats-row">
      <div class="stat">
        <span class="stat-number">${stats.trends}</span>
        <span class="stat-label">Trends</span>
      </div>
      <div class="stat">
        <span class="stat-number">${stats.recipes}</span>
        <span class="stat-label">Recipes</span>
      </div>
      <div class="stat">
        <span class="stat-number">${stats.categories}</span>
        <span class="stat-label">Categories</span>
      </div>
    </div>
  </header>

  <main class="container">
    <section class="section">
      <div class="section-header">
        <h2>Trends</h2>
        <span class="section-count">Serving · RAG · LLMOps</span>
      </div>
      <table class="trends-table">
        <thead>
          <tr>
            <th>Score</th>
            <th>Trend</th>
            <th>Category</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${trendRows}
        </tbody>
      </table>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Recipes</h2>
        <span class="section-count">${recipes.length} hands-on trials</span>
      </div>
      <div class="recipe-grid">
        ${recipeCards}
      </div>
    </section>

    <section class="cli-section">
      <h3>Quick Start</h3>
      <pre><span class="comment"># Clone and build</span>
<span class="cmd">git clone https://github.com/zhaohanzhang/trend2trial.git</span>
<span class="cmd">cd trend2trial</span>
<span class="cmd">pnpm install &amp;&amp; pnpm build</span>

<span class="comment"># List available recipes</span>
<span class="cmd">node packages/cli/dist/main.js recipe list</span>

<span class="comment"># Initialize and run a recipe</span>
<span class="cmd">node packages/cli/dist/main.js recipe init serving-latency ./my-trial</span>
<span class="cmd">node packages/cli/dist/main.js recipe run ./my-trial</span>

<span class="comment"># View the generated report</span>
<span class="cmd">cat ./my-trial/REPORT.md</span></pre>
      <p style="margin-top:1rem;font-size:0.82rem;color:#888;">
        <strong>Coming soon:</strong> <code style="color:#64ffda;">npx trend2trial recipe list</code> — no clone needed.
      </p>
    </section>
  </main>

  <footer class="footer">
    Trend-to-Trial &mdash; Track AI Infra trends, run hands-on trials.
    <br>
    <a href="https://github.com/zhaohanzhang/trend2trial">GitHub</a>
  </footer>
</body>
</html>`;

  await writeFile(resolve(DIST, "index.html"), html, "utf-8");
  console.log(`Built static site → ${resolve(DIST, "index.html")}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
