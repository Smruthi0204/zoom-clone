import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoom | Home",
  description: "Meet, connect, and collaborate with your team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
