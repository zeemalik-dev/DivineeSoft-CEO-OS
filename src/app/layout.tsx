import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { ReduxProvider } from "@/redux/ReduxProvider";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "DivineeSoft CEO OS",
  description: "Company operations, one screen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
