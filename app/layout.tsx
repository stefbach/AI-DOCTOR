import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PatientDataLoader } from "@/components/patient-data-loader"
import { LanguageProvider } from "@/contexts/language-context"
import { Header } from "@/components/header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TIBOK IA DOCTOR - Assistant Médical Intelligent",
  description: "Assistant médical intelligent pour le diagnostic clinique avec IA",
  keywords: "médecine, diagnostic, IA, intelligence artificielle, santé",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white`}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem 
          disableTransitionOnChange
          forcedTheme="dark"
        >
          <LanguageProvider>
            <PatientDataLoader />
            <Header />
            <main className="min-h-screen bg-black">
              {children}
            </main>
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
