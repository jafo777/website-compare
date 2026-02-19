"use client";

import { CompareContent } from "./CompareContent";

export default function Home() {
  return (
    <CompareContent
      viewport="desktop"
      title="Website comparison"
      description="Enter two URLs to crawl both sites and view a screenshot of every page from each website."
      otherViewportHref="/mobile"
      otherViewportLabel="Compare at mobile breakpoint →"
    />
  );
}
