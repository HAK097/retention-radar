import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Retention Radar: concept demo",
  description:
    "Concept demo: scores post-placement check-in replies for early-exit risk so consultants know who to call first. Fictional data.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const themeScript = `try{var t=localStorage.getItem('rr-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme='dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${instrument.variable}`}>{children}</body>
    </html>
  );
}
