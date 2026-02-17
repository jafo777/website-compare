"use client";

import { useState } from "react";

type PageEntry = {
  path: string;
  screenshot: string;
};

type MatchPair = {
  path: string;
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

function getMatchingPairs(result: CompareResult): MatchPair[] {
  if (result.pairs && result.pairs.length > 0) return result.pairs;
  const paths2 = new Set(result.pages2.map((p) => p.path));
  return result.pages1
    .filter((p) => paths2.has(p.path) && p.screenshot)
    .map((p) => ({
      path: p.path,
      screenshot1: p.screenshot,
      screenshot2: result.pages2.find((q) => q.path === p.path)!.screenshot,
    }))
    .sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
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
              return (
                <>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {result.pages1.length} page(s) from Website 1 · {result.pages2.length} page(s) from Website 2
              {pairs.length > 0 && ` · ${pairs.length} matching path(s) shown side by side`}
            </p>

            {pairs.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300">
                  Matching page names (side by side)
                </h3>
                <div className="space-y-6">
                  {pairs.map((pair) => (
                    <div
                      key={pair.path}
                      className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
                    >
                      <div className="bg-stone-100 dark:bg-stone-800 px-4 py-2 border-b border-stone-200 dark:border-stone-700">
                        <span className="font-mono text-sm text-stone-700 dark:text-stone-300">
                          {pair.path}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        <div className="border-r border-stone-200 dark:border-stone-700 p-2 bg-stone-50 dark:bg-stone-900/50">
                          <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Website 1</div>
                          <img
                            src={`data:image/jpeg;base64,${pair.screenshot1}`}
                            alt={`Website 1 – ${pair.path}`}
                            className="w-full h-auto rounded border border-stone-200 dark:border-stone-600"
                          />
                        </div>
                        <div className="p-2 bg-stone-50 dark:bg-stone-900/50">
                          <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Website 2</div>
                          <img
                            src={`data:image/jpeg;base64,${pair.screenshot2}`}
                            alt={`Website 2 – ${pair.path}`}
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
                  {result.pages1
                    .filter((page) => !pairs.some((p) => p.path === page.path))
                    .map((page) => (
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
                  {result.pages2
                    .filter((page) => !pairs.some((p) => p.path === page.path))
                    .map((page) => (
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
