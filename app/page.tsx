"use client";

import { useState } from "react";

type PageEntry = {
  path: string;
  screenshot: string;
};

type MatchPair = {
  normalizedPath: string;
  path1: string;
  path2: string;
  screenshot1: string;
  screenshot2: string;
};

type CompareResult = {
  url1: string;
  url2: string;
  pairs?: MatchPair[];
  pages1: PageEntry[];
  pages2: PageEntry[];
};

/** Normalize path for comparison: use only the last segment (after final "/"), then remove ".htm", ".html", or "-cc.htm" before comparing. */
function normalizePathForComparison(path: string): string {
  if (!path || path === "/") return "/";
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : "";
  if (!lastSegment) return "/";
  let s = lastSegment;
  if (s.endsWith("-cc.htm")) s = s.slice(0, -6);
  if (s.endsWith(".html")) s = s.slice(0, -5);
  if (s.endsWith(".htm")) s = s.slice(0, -4);
  return s || "/";
}

function getMatchingPairs(result: CompareResult): MatchPair[] {
  if (result.pairs && result.pairs.length > 0) return result.pairs;
  const byNormalized2 = new Map<string, PageEntry>();
  for (const p of result.pages2) {
    const key = normalizePathForComparison(p.path);
    if (!byNormalized2.has(key)) byNormalized2.set(key, p);
  }
  const matchedNormalized = new Set<string>();
  const pairs: MatchPair[] = [];
  for (const p1 of result.pages1) {
    if (!p1.screenshot) continue;
    const key = normalizePathForComparison(p1.path);
    const p2 = byNormalized2.get(key);
    console.log(key, p2);
    if (p2?.screenshot && !matchedNormalized.has(key)) {
      matchedNormalized.add(key);
      pairs.push({
        normalizedPath: key,
        path1: p1.path,
        path2: p2.path,
        screenshot1: p1.screenshot,
        screenshot2: p2.screenshot,
      });
    }
  }
console.log(pairs);
  return pairs.sort((a, b) =>
    a.normalizedPath === "/" ? -1 : b.normalizedPath === "/" ? 1 : a.normalizedPath.localeCompare(b.normalizedPath)
  );
}

/** Pages from site 1 that have no matching normalized path on site 2 */
function getPagesOnlyOnSite1(result: CompareResult, pairs: MatchPair[]): PageEntry[] {
  const matchedNormalized = new Set(pairs.map((p) => p.normalizedPath));
  return result.pages1.filter(
    (p) => !matchedNormalized.has(normalizePathForComparison(p.path))
  );
}

/** Pages from site 2 that have no matching normalized path on site 1 */
function getPagesOnlyOnSite2(result: CompareResult, pairs: MatchPair[]): PageEntry[] {
  const matchedNormalized = new Set(pairs.map((p) => p.normalizedPath));
  return result.pages2.filter(
    (p) => !matchedNormalized.has(normalizePathForComparison(p.path))
  );
}

export default function Home() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url1: url1.trim(), url2: url2.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comparison failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-200">
            Website comparison
          </h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            Enter two URLs to crawl both sites and view a screenshot of every page from each website.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm p-6 mb-10"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="url1"
                className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
              >
                First URL
              </label>
              <input
                id="url1"
                type="url"
                value={url1}
                onChange={(e) => setUrl1(e.target.value)}
                placeholder="https://example.com"
                required
                className="w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="url2"
                className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
              >
                Second URL
              </label>
              <input
                id="url2"
                type="url"
                value={url2}
                onChange={(e) => setUrl2(e.target.value)}
                placeholder="https://other-site.com"
                required
                className="w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium px-5 py-2.5 transition-colors disabled:cursor-not-allowed"
            >
              {loading ? "Crawling & capturing…" : "Compare"}
            </button>
            {loading && (
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Capturing a screenshot of every page on each site (up to 100 per site). This may take a few minutes.
              </span>
            )}
          </div>
        </form>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 mb-10"
          >
            {error}
          </div>
        )}

        {result && (
          <section className="space-y-10">
            <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">
              Results
            </h2>
            {(() => {
              const pairs = getMatchingPairs(result);
              const only1 = getPagesOnlyOnSite1(result, pairs);
              const only2 = getPagesOnlyOnSite2(result, pairs);
              return (
                <>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {result.pages1.length} page(s) from Website 1 · {result.pages2.length} page(s) from Website 2
              {pairs.length > 0 && ` · ${pairs.length} matching page name(s) shown side by side`}
            </p>

            {pairs.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300">
                  Matching page names (side by side)
                </h3>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Only the last part of each path (after the final &quot;/&quot;) is compared, after removing suffixes like .htm, .html, and -cc.htm.
                </p>
                <div className="space-y-6">
                  {pairs.map((pair) => (
                    <div
                      key={pair.normalizedPath}
                      className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
                    >
                      <div className="bg-stone-100 dark:bg-stone-800 px-4 py-2 border-b border-stone-200 dark:border-stone-700 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-mono text-sm text-stone-700 dark:text-stone-300">
                          {pair.normalizedPath === "/" ? "/" : pair.normalizedPath}
                        </span>
                        {(pair.path1 !== pair.normalizedPath || pair.path2 !== pair.normalizedPath) && (
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            Website 1: <span className="font-mono">{pair.path1}</span>
                            {" · "}
                            Website 2: <span className="font-mono">{pair.path2}</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        <div className="border-r border-stone-200 dark:border-stone-700 p-2 bg-stone-50 dark:bg-stone-900/50">
                          <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Website 1</div>
                          <div className="font-mono text-sm text-stone-700 dark:text-stone-300 mb-2">
                            {pair.normalizedPath === "/" ? "/" : pair.normalizedPath}
                          </div>
                          <img
                            src={`data:image/jpeg;base64,${pair.screenshot1}`}
                            alt={`Website 1 – ${pair.path1}`}
                            className="w-full h-auto rounded border border-stone-200 dark:border-stone-600"
                          />
                        </div>
                        <div className="p-2 bg-stone-50 dark:bg-stone-900/50">
                          <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Website 2</div>
                          <div className="font-mono text-sm text-stone-700 dark:text-stone-300 mb-2">
                            {pair.normalizedPath === "/" ? "/" : pair.normalizedPath}
                          </div>
                          <img
                            src={`data:image/jpeg;base64,${pair.screenshot2}`}
                            alt={`Website 2 – ${pair.path2}`}
                            className="w-full h-auto rounded border border-stone-200 dark:border-stone-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300 truncate" title={result.url1}>
                  {pairs.length > 0 ? "Only on Website 1" : "Website 1"}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate" title={result.url1}>
                  {result.url1}
                </p>
                <div className="space-y-6">
                  {only1.map((page) => (
                      <div
                        key={page.path}
                        className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
                      >
                        <div className="bg-stone-100 dark:bg-stone-800 px-4 py-2 border-b border-stone-200 dark:border-stone-700">
                          <span className="font-mono text-sm text-stone-700 dark:text-stone-300">
                            {page.path}
                          </span>
                        </div>
                        <div className="p-2 bg-stone-50 dark:bg-stone-900/50">
                          <div className="font-mono text-sm text-stone-700 dark:text-stone-300 mb-2">
                            {normalizePathForComparison(page.path) === "/" ? "/" : normalizePathForComparison(page.path)}
                          </div>
                          {page.screenshot ? (
                            <img
                              src={`data:image/jpeg;base64,${page.screenshot}`}
                              alt={page.path}
                              className="w-full h-auto rounded border border-stone-200 dark:border-stone-600"
                            />
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300 truncate" title={result.url2}>
                  {pairs.length > 0 ? "Only on Website 2" : "Website 2"}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate" title={result.url2}>
                  {result.url2}
                </p>
                <div className="space-y-6">
                  {only2.map((page) => (
                      <div
                        key={page.path}
                        className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
                      >
                        <div className="bg-stone-100 dark:bg-stone-800 px-4 py-2 border-b border-stone-200 dark:border-stone-700">
                          <span className="font-mono text-sm text-stone-700 dark:text-stone-300">
                            {page.path}
                          </span>
                        </div>
                        <div className="p-2 bg-stone-50 dark:bg-stone-900/50">
                          <div className="font-mono text-sm text-stone-700 dark:text-stone-300 mb-2">
                            {normalizePathForComparison(page.path) === "/" ? "/" : normalizePathForComparison(page.path)}
                          </div>
                          {page.screenshot ? (
                            <img
                              src={`data:image/jpeg;base64,${page.screenshot}`}
                              alt={page.path}
                              className="w-full h-auto rounded border border-stone-200 dark:border-stone-600"
                            />
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
                </>
              );
            })()}
          </section>
        )}
      </div>
    </div>
  );
}
