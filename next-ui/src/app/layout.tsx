import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Expressive AAC Board",
  description: "Accessible nose-controlled AAC with Fish Audio profiles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize Module.arguments_ BEFORE any MediaPipe scripts load
              // This must run synchronously in the head to prevent MediaPipe errors
              (function() {
                if (typeof window !== 'undefined') {
                  if (!window.Module) {
                    window.Module = { arguments_: [] };
                  }
                  if (!window.Module.arguments_) {
                    window.Module.arguments_ = [];
                  }
                  // Ensure arguments property does NOT exist (MediaPipe will error if it does)
                  try {
                    if (window.Module && 'arguments' in window.Module) {
                      delete window.Module.arguments;
                    }
                  } catch (e) {
                    // Ignore
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium" scaling="100%">
          {children}
        </Theme>
      </body>
    </html>
  );
}
