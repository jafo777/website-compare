import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mobile comparison",
  description: "Compare two websites at a mobile viewport (375×812)",
};

export default function MobileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
