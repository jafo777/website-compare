"use client";

import { useState, useEffect } from "react";

const COMPARE_MAX_SIZE = 600;
const PIXEL_DIFF_THRESHOLD = 30;
const MIN_BOX_SIZE = 5;

type NormalizedBox = { left: number; top: number; width: number; height: number };

/** Compute bounding boxes of pixel differences between two image URLs (normalized 0–1). */
function useDiffBoxes(
  dataUrl1: string | null,
  dataUrl2: string | null
): NormalizedBox[] | null {
  const [boxes, setBoxes] = useState<NormalizedBox[] | null>(null);

  useEffect(() => {
    if (!dataUrl1 || !dataUrl2) {
      setBoxes(null);
      return;
    }
    setBoxes(null);
    const img1 = new Image();
    const img2 = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const onBothLoaded = () => {
      const w1 = img1.naturalWidth;
      const h1 = img1.naturalHeight;
      const w2 = img2.naturalWidth;
      const h2 = img2.naturalHeight;
      const scale = Math.min(1, COMPARE_MAX_SIZE / Math.max(w1, h1), COMPARE_MAX_SIZE / Math.max(w2, h2));
      const cw = Math.max(1, Math.floor(Math.max(w1, w2) * scale));
      const ch = Math.max(1, Math.floor(Math.max(h1, h2) * scale));
      canvas.width = cw;
      canvas.height = ch;

      ctx.drawImage(img1, 0, 0, w1, h1, 0, 0, cw, ch);
      const data1 = ctx.getImageData(0, 0, cw, ch);
      ctx.drawImage(img2, 0, 0, w2, h2, 0, 0, cw, ch);
      const data2 = ctx.getImageData(0, 0, cw, ch);

      const diff: boolean[] = [];
      for (let i = 0; i < data1.data.length; i += 4) {
        const r = Math.abs(data1.data[i] - data2.data[i]);
        const g = Math.abs(data1.data[i + 1] - data2.data[i + 1]);
        const b = Math.abs(data1.data[i + 2] - data2.data[i + 2]);
        diff.push(r + g + b > PIXEL_DIFF_THRESHOLD);
      }

      const visited = new Set<number>();
      const components: { minX: number; minY: number; maxX: number; maxY: number }[] = [];

      function flood(x: number, y: number): { minX: number; minY: number; maxX: number; maxY: number } {
        const stack: [number, number][] = [[x, y]];
        let minX = x;
        let minY = y;
        let maxX = x;
        let maxY = y;
        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          const idx = cy * cw + cx;
          if (cx < 0 || cx >= cw || cy < 0 || cy >= ch || visited.has(idx) || !diff[idx]) continue;
          visited.add(idx);
          minX = Math.min(minX, cx);
          minY = Math.min(minY, cy);
          maxX = Math.max(maxX, cx);
          maxY = Math.max(maxY, cy);
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        return { minX, minY, maxX, maxY };
      }

      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          if (diff[y * cw + x] && !visited.has(y * cw + x)) {
            const b = flood(x, y);
            const w = b.maxX - b.minX + 1;
            const h = b.maxY - b.minY + 1;
            if (w >= MIN_BOX_SIZE && h >= MIN_BOX_SIZE) {
              components.push(b);
            }
          }
        }
      }

      const normalized: NormalizedBox[] = components.map((b) => ({
        left: b.minX / cw,
        top: b.minY / ch,
        width: (b.maxX - b.minX + 1) / cw,
        height: (b.maxY - b.minY + 1) / ch,
      }));
      setBoxes(normalized);
    };

    let loaded = 0;
    const check = () => {
      loaded++;
      if (loaded === 2) onBothLoaded();
    };
    img1.onload = check;
    img2.onload = check;
    img1.src = dataUrl1;
    img2.src = dataUrl2;
  }, [dataUrl1, dataUrl2]);

  return boxes;
}

/** Renders one image with optional translucent yellow boxes (same boxes used for both in a pair). */
function ScreenshotWithOverlay({
  dataUrl,
  alt,
  boxes,
}: {
  dataUrl: string;
  alt: string;
  boxes: NormalizedBox[] | null;
}) {
  return (
    <div className="relative inline-block max-w-full">
      <img
        src={dataUrl}
        alt={alt}
        className="w-full h-auto rounded border border-stone-200 dark:border-stone-600 block"
      />
      {boxes && boxes.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {boxes.map((box, i) => (
            <div
              key={i}
              className="absolute bg-yellow-400/40 border border-yellow-500/70 rounded-sm"
              style={{
                left: `${box.left * 100}%`,
                top: `${box.top * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** One comparison row: computes diff when both screenshots exist and renders both columns with yellow boxes. */
function ComparisonRowContent({ row }: { row: ComparisonRow }) {
  const dataUrl1 = row.page1 ? `data:image/jpeg;base64,${row.page1.screenshot}` : null;
  const dataUrl2 = row.page2 ? `data:image/jpeg;base64,${row.page2.screenshot}` : null;
  const boxes = useDiffBoxes(
    row.page1 && row.page2 ? dataUrl1 : null,
    row.page1 && row.page2 ? dataUrl2 : null
  );

  return (
    <>
      <div className="border-r border-stone-200 dark:border-stone-700 p-2 bg-stone-50 dark:bg-stone-900/50 min-h-[120px]">
        <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Website 1</div>
        <div className="font-mono text-sm text-stone-700 dark:text-stone-300 mb-2 break-all">
          {row.page1 ? row.page1.path : "—"}
        </div>
        {row.page1?.screenshot ? (
          <ScreenshotWithOverlay dataUrl={dataUrl1!} alt={row.page1.path} boxes={boxes} />
        ) : (
          <div className="flex items-center justify-center h-32 rounded border border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 text-sm">
            No page
          </div>
        )}
      </div>
      <div className="p-2 bg-stone-50 dark:bg-stone-900/50 min-h-[120px]">
        <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Website 2</div>
        <div className="font-mono text-sm text-stone-700 dark:text-stone-300 mb-2 break-all">
          {row.page2 ? row.page2.path : "—"}
        </div>
        {row.page2?.screenshot ? (
          <ScreenshotWithOverlay dataUrl={dataUrl2!} alt={row.page2.path} boxes={boxes} />
        ) : (
          <div className="flex items-center justify-center h-32 rounded border border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 text-sm">
            No page
          </div>
        )}
      </div>
    </>
  );
}

type PageEntry = {
  path: string;
  screenshot: string;
};

/** One row in the comparison: normalized path with optional page from each site */
type ComparisonRow = {
  normalizedPath: string;
  page1: PageEntry | null;
  page2: PageEntry | null;
};

type CompareResult = {
  url1: string;
  url2: string;
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
  if (s.endsWith("-cc.htm")) s = s.slice(0, -7);
  if (s.endsWith(".html")) s = s.slice(0, -5);
  if (s.endsWith(".htm")) s = s.slice(0, -4);
  return s || "/";
}

/** Build one row per normalized path: same normalizedPath always shown side by side (with null if a site has no page). */
function getComparisonRows(result: CompareResult): ComparisonRow[] {
  const byNormalized1 = new Map<string, PageEntry>();
  for (const p of result.pages1) {
    const key = normalizePathForComparison(p.path);
    if (!byNormalized1.has(key)) byNormalized1.set(key, p);
  }
  const byNormalized2 = new Map<string, PageEntry>();
  for (const p of result.pages2) {
    const key = normalizePathForComparison(p.path);
    if (!byNormalized2.has(key)) byNormalized2.set(key, p);
  }
  const allKeys = new Set([...byNormalized1.keys(), ...byNormalized2.keys()]);
  const rows: ComparisonRow[] = [...allKeys]
    .sort((a, b) =>
      a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)
    )
    .map((normalizedPath) => ({
      normalizedPath,
      page1: byNormalized1.get(normalizedPath) ?? null,
      page2: byNormalized2.get(normalizedPath) ?? null,
    }));
  return rows;
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
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {result.pages1.length} page(s) from Website 1 · {result.pages2.length} page(s) from Website 2. Same normalized path shown side by side.
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Only the last part of each path (after the final &quot;/&quot;) is compared, after removing .htm, .html, or -cc.htm.
            </p>
            <div className="space-y-6">
              {getComparisonRows(result).map((row) => (
                <div
                  key={row.normalizedPath}
                  className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
                >
                  <div className="bg-stone-100 dark:bg-stone-800 px-4 py-2 border-b border-stone-200 dark:border-stone-700">
                    <span className="font-mono text-sm text-stone-700 dark:text-stone-300">
                      {row.normalizedPath === "/" ? "/" : row.normalizedPath}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    <ComparisonRowContent row={row} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
