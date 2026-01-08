// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// For production use - these are public keys (safe to expose)
const supabaseUrl = 'https://yyxmqositmmyyeyuryln.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5eG1xb3NpdG1teXlleXVyeWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzcwODUsImV4cCI6MjA4MzI1MzA4NX0.JaBP3MYI_d283bSQetYxJ4cj9ZCqDiQQ-xfPq0EuG2E'

// Create client with proper headers to avoid 406 errors
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
    },
  }
)

// Test connection on initialization
if (typeof window !== 'undefined') {
  supabase
    .from('consultations')
    .select('count')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase connection failed:', error)
      } else {
        console.log('✅ Supabase connected successfully!')
      }
    })
}