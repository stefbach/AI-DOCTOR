import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TIBOK IA DOCTOR - Assistant Médical Intelligent",
  description: "Système d'aide au diagnostic médical avec intelligence artificielle - TIBOK IA DOCTOR",
  keywords: "médecine, diagnostic, IA, intelligence artificielle, santé, médical, TIBOK",
  authors: [{ name: "TIBOK IA DOCTOR Team" }],
  robots: "index, follow",
  openGraph: {
    title: "TIBOK IA DOCTOR - Assistant Médical Intelligent",
    description: "Système d'aide au diagnostic médical avec intelligence artificielle",
    type: "website",
    locale: "fr_FR",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">{children}</div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
