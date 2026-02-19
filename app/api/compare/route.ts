import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

const MAX_PAGES_PER_SITE = 100;
const PAGE_NAVIGATION_TIMEOUT_MS = 5000;

function normalizeUrl(url: URL): string {
  const path = url.pathname.replace(/\/$/, "") || "/";
  return path + (url.search || "");
}

function isSameSite(base: URL, candidate: URL): boolean {
  return base.hostname === candidate.hostname && base.port === candidate.port;
}

function toNormalizedFullUrl(url: URL): string {
  const path = url.pathname.replace(/\/$/, "") || "/";
  return `${url.origin}${path}${url.search || ""}`;
}

async function crawlAndScreenshot(
  startUrl: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const start = new URL(startUrl);
  const toVisit = new Set<string>([toNormalizedFullUrl(start)]);
  const visited = new Set<string>();

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });

    while (toVisit.size > 0 && visited.size < MAX_PAGES_PER_SITE) {
      const url = toVisit.values().next().value as string;
      toVisit.delete(url);
      const normalizedUrl = toNormalizedFullUrl(new URL(url));
      if (visited.has(normalizedUrl)) continue;
      visited.add(normalizedUrl);

      let pathKey = normalizeUrl(new URL(url));
      try {
        const page = await context.newPage();
        await page.goto(url, {
          waitUntil: "load",
          timeout: PAGE_NAVIGATION_TIMEOUT_MS,
        });
        const finalUrl = page.url();
        const finalNormalized = toNormalizedFullUrl(new URL(finalUrl));
        if (finalNormalized !== normalizedUrl) {
          visited.add(finalNormalized);
          pathKey = normalizeUrl(new URL(finalUrl));
        }
        await page.waitForTimeout(1500);

        // Hide OneTrust cookie consent banner so it doesn't appear in screenshots
        await page.addStyleTag({
          content: [
            "#onetrust-consent-sdk { display: none !important; }",
            "#onetrust-banner-sdk { display: none !important; }",
            ".onetrust-pc-dark-filter { display: none !important; }",
            "#ot-sdk-btn-floating { display: none !important; }",
          ].join("\n"),
        });

        const screenshot = await page.screenshot({
          type: "jpeg",
          quality: 85,
          fullPage: true,
        });
        results.set(pathKey, (screenshot as Buffer).toString("base64"));

        if (visited.size < MAX_PAGES_PER_SITE) {
          const links = await page.$$eval("a[href]", (anchors) =>
            anchors
              .map((a) => (a as HTMLAnchorElement).href)
              .filter((href) => href && !href.startsWith("javascript:") && !href.startsWith("mailto:") && !href.startsWith("tel:"))
          );
          await page.close();

          for (const href of links) {
            try {
              const parsed = new URL(href);
              if (!isSameSite(start, parsed)) continue;
              const normalized = toNormalizedFullUrl(parsed);
              if (!visited.has(normalized) && !toVisit.has(normalized)) {
                toVisit.add(normalized);
              }
            } catch {
              // skip invalid URLs
            }
          }
        } else {
          await page.close();
        }
      } catch (err) {
        console.error(`Failed to screenshot ${url}:`, err);
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url1 = body?.url1?.trim();
    const url2 = body?.url2?.trim();

    if (!url1 || !url2) {
      return NextResponse.json(
        { error: "Both url1 and url2 are required" },
        { status: 400 }
      );
    }

    try {
      new URL(url1);
      new URL(url2);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const [screenshots1, screenshots2] = await Promise.all([
      crawlAndScreenshot(url1),
      crawlAndScreenshot(url2),
    ]);

    const sortPaths = (paths: string[]) =>
      [...paths].sort((a, b) =>
        a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)
      );

    const pages1 = sortPaths([...screenshots1.keys()]).map((path) => ({
      path: path || "/",
      screenshot: screenshots1.get(path) ?? "",
    }));

    const pages2 = sortPaths([...screenshots2.keys()]).map((path) => ({
      path: path || "/",
      screenshot: screenshots2.get(path) ?? "",
    }));

    const matchingPaths = [...screenshots1.keys()].filter((path) =>
      screenshots2.has(path)
    );
    const pairs = sortPaths(matchingPaths).map((path) => ({
      path: path || "/",
      screenshot1: screenshots1.get(path) ?? "",
      screenshot2: screenshots2.get(path) ?? "",
    }));

    return NextResponse.json({
      url1,
      url2,
      pairs,
      pages1,
      pages2,
    });
  } catch (err) {
    console.error("Compare API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Comparison failed" },
      { status: 500 }
    );
  }
}
