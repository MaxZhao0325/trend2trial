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

  const categories = [...new Set(sortedCards.map((c) => c.category))];

  const trendRows = sortedCards
    .map(
      (c) => `
      <tr data-category="${c.category}">
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
      <div class="recipe-card" data-category="${r.category}">
        <div class="recipe-header">
          <span class="badge badge-${r.category}">${r.category}</span>
          <span class="recipe-hours">${r.hours}h</span>
        </div>
        <h3 class="recipe-title">${escapeHtml(r.title)}</h3>
        <details>
          <summary class="recipe-desc">${escapeHtml(r.description || "View details")}</summary>
          <div class="recipe-expanded">
            <p>${r.taskCount} steps to complete. Run with:</p>
            <code>npx trend2trial recipe init ${r.name} ./${r.name}</code>
          </div>
        </details>
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
  <meta name="description" content="Track AI Infrastructure trends in Serving, RAG, and LLMOps. Run hands-on trial recipes to benchmark and evaluate emerging tools.">
  <meta property="og:title" content="Trend-to-Trial — AI Infra Trend Radar">
  <meta property="og:description" content="Track AI Infrastructure trends and run hands-on trial recipes for Serving, RAG, and LLMOps.">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Trend-to-Trial — AI Infra Trend Radar">
  <meta name="twitter:description" content="Track AI Infrastructure trends and run hands-on trial recipes.">
  <meta property="og:url" content="https://maxzhao0325.github.io/trend2trial/">
  <link rel="canonical" href="https://maxzhao0325.github.io/trend2trial/">
  <title>Trend-to-Trial — AI Infra Trend Radar</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Trend-to-Trial",
    "description": "AI Infra Trend Radar + Trial Playground",
    "url": "https://maxzhao0325.github.io/trend2trial/"
  }
  </script>
  <style>
    :root {
      --bg: #fafafa;
      --surface: #ffffff;
      --text: #1a1a2e;
      --text-secondary: #555;
      --text-muted: #6b6b6b;
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

    /* Skip navigation */
    .skip-link {
      position: absolute;
      top: -100%;
      left: 1rem;
      background: var(--accent);
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 0 0 4px 4px;
      z-index: 100;
      text-decoration: none;
      font-weight: 600;
    }
    .skip-link:focus {
      top: 0;
    }

    /* Focus styles */
    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
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

    /* Search & Filter */
    .filter-bar {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .search-input {
      flex: 1;
      min-width: 200px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.9rem;
      background: var(--surface);
      color: var(--text);
    }
    .search-input::placeholder { color: var(--text-muted); }
    .filter-btn {
      padding: 0.35rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--surface);
      color: var(--text-secondary);
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .filter-btn:hover { background: var(--bg); }
    .filter-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .no-results {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.95rem;
      display: none;
    }

    /* Expandable recipe cards */
    .recipe-card details summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .recipe-card details summary::-webkit-details-marker { display: none; }
    .recipe-card details summary::before {
      content: "\\25B6";
      font-size: 0.65rem;
      transition: transform 0.15s;
      color: var(--text-muted);
    }
    .recipe-card details[open] summary::before {
      transform: rotate(90deg);
    }
    .recipe-card .recipe-expanded {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px dashed var(--border);
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121212;
        --surface: #1e1e1e;
        --text: #e0e0e0;
        --text-secondary: #b0b0b0;
        --text-muted: #888;
        --border: #333;
        --accent: #5e7ce2;
        --serving: #64b5f6;
        --serving-bg: #1a2740;
        --rag: #ce93d8;
        --rag-bg: #2a1a30;
        --llmops: #ffb74d;
        --llmops-bg: #2a1f10;
      }
      .header {
        background: linear-gradient(135deg, #0d0d1a 0%, #0f1528 50%, #0a1e3d 100%);
      }
      .cli-section {
        background: #0d0d1a;
      }
      .score {
        background: var(--surface);
      }
    }

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
  <a href="#main-content" class="skip-link">Skip to content</a>
  <header class="header" role="banner">
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

  <main id="main-content" class="container" role="main">
    <section class="section" role="region" aria-label="Trends">
      <div class="section-header">
        <h2>Trends</h2>
        <span class="section-count">Serving · RAG · LLMOps</span>
      </div>
      <div class="filter-bar">
        <input type="search" class="search-input" id="trend-search" placeholder="Search trends..." aria-label="Search trends">
        <button class="filter-btn active" data-filter="all">All</button>
        ${categories.map((cat) => `<button class="filter-btn" data-filter="${cat}">${cat}</button>`).join("\n        ")}
      </div>
      <div class="no-results" id="no-results" aria-live="polite">No trends match your search.</div>
      <table class="trends-table">
        <thead>
          <tr>
            <th scope="col">Score</th>
            <th scope="col">Trend</th>
            <th scope="col">Category</th>
            <th scope="col">Date</th>
          </tr>
        </thead>
        <tbody>
          ${trendRows}
        </tbody>
      </table>
    </section>

    <section class="section" role="region" aria-label="Recipes">
      <div class="section-header">
        <h2>Recipes</h2>
        <span class="section-count">${recipes.length} hands-on trials</span>
      </div>
      <div class="recipe-grid">
        ${recipeCards}
      </div>
    </section>

    <section class="cli-section" role="region" aria-label="Quick Start">
      <h3>Quick Start</h3>
      <pre><span class="comment"># No clone needed — run directly via npx</span>
<span class="cmd">npx trend2trial recipe list</span>

<span class="comment"># Initialize and run a recipe</span>
<span class="cmd">npx trend2trial recipe init serving-latency ./my-trial</span>
<span class="cmd">npx trend2trial recipe run ./my-trial</span>

<span class="comment"># View the generated report</span>
<span class="cmd">cat ./my-trial/REPORT.md</span></pre>
    </section>
  </main>

  <script>
  (function() {
    var search = document.getElementById("trend-search");
    var btns = document.querySelectorAll(".filter-btn");
    var rows = document.querySelectorAll(".trends-table tbody tr");
    var noResults = document.getElementById("no-results");
    var activeCat = "all";

    function applyFilters() {
      var q = search.value.toLowerCase();
      var visible = 0;
      rows.forEach(function(row) {
        var cat = row.getAttribute("data-category");
        var text = row.textContent.toLowerCase();
        var catMatch = activeCat === "all" || cat === activeCat;
        var textMatch = !q || text.indexOf(q) !== -1;
        var show = catMatch && textMatch;
        row.style.display = show ? "" : "none";
        if (show) visible++;
      });
      noResults.style.display = visible === 0 ? "block" : "none";
    }

    search.addEventListener("input", applyFilters);

    btns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        btns.forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        activeCat = btn.getAttribute("data-filter");
        applyFilters();
      });
    });
  })();
  </script>

  <footer class="footer" role="contentinfo">
    Trend-to-Trial &mdash; Track AI Infra trends, run hands-on trials.
    <br>
    <a href="https://github.com/MaxZhao0325/trend2trial">GitHub</a>
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
