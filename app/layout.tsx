import type { Metadata } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReminderEngine from "@/components/ReminderEngine";
import ReminderModal from "@/components/ReminderModal";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "devanagari"],
});

export const metadata: Metadata = {
  title: "CareCompanion AI — Medication reminders and caregiver support",
  description: "Medication schedules, spoken reminders and caregiver visibility for older adults. Phase-1 academic prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${notoSans.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Light by default; dark only when the user picked it with the toggle (not from the OS setting).
                  var storedTheme = localStorage.getItem('cc_theme');
                  if (storedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg antialiased">
        <AppProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-fg focus:shadow-lg"
          >
            Skip to main content
          </a>
          <Navbar />
          <ReminderEngine />
          <ReminderModal />
          <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
