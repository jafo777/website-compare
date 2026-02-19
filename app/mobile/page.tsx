"use client";

import { CompareContent } from "../CompareContent";

export default function MobileComparePage() {
  return (
    <CompareContent
      viewport="mobile"
      title="Mobile comparison"
      description="Same comparison at a mobile viewport (375×812). Enter two URLs to crawl both sites and view mobile screenshots of every page."
      otherViewportHref="/"
      otherViewportLabel="← Compare at desktop"
    />
  );
}
