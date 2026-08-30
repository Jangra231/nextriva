import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexriva | Events worth showing up for",
  description: "Discover, create and manage memorable events across India.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
