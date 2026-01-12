import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../styles/embedded.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PatientDataLoader } from "@/components/patient-data-loader"
import { EmbeddedModeProvider } from "@/components/embedded-mode-provider"

const inter = Inter({ subsets: ["latin"] })

// Separate viewport export (Next.js 13+ requirement)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "TIBOK IA DOCTOR - Assistant Médical Intelligent",
  description: "Assistant médical intelligent pour le diagnostic clinique avec IA",
  keywords: "médecine, diagnostic, IA, intelligence artificielle, santé",
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem 
          disableTransitionOnChange
        >
          <EmbeddedModeProvider>
            <PatientDataLoader />
            {children}
            <Toaster />
          </EmbeddedModeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
