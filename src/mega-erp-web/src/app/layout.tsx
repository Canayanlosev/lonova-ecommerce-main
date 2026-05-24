import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "CanayanWeb | Kurumsal Ticaret Platformu",
  description: "Türkiye'nin en güçlü kurumsal ticaret ve yönetim platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const themeStore = JSON.parse(localStorage.getItem('app-theme') || '{}');
                const mode = themeStore.state?.themeMode || 'system';
                const accent = themeStore.state?.accentColor || 'blue';
                document.documentElement.setAttribute('data-accent', accent);
                if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.add('light');
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
