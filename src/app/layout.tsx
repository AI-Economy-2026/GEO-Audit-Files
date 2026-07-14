import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gatha — Be Seen in AI Search",
    template: "%s · Gatha",
  },
  description:
    "See where your brand shows up across ChatGPT, Claude, Gemini, Perplexity, Grok, and Google AI — and where it doesn't. The GEO audit built for agencies.",
  applicationName: "Gatha",
  openGraph: {
    title: "Gatha — Be Seen in AI Search",
    description:
      "See where your brand shows up across every major AI engine — and where it doesn't.",
    siteName: "Gatha",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gatha — Be Seen in AI Search",
    description:
      "See where your brand shows up across every major AI engine — and where it doesn't.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
