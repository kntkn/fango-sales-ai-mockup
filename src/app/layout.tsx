import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FANGO 営業AI",
  description: "AI-assisted real estate sales chat tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
