# 🚀 Deployment Guide - AI Doctor Platform

## 📋 Prerequisites

Before deploying to Vercel (or any other platform), you need to configure the following environment variables.

---

## 🔑 Required Environment Variables

### 1. **OpenAI API Key**
```bash
OPENAI_API_KEY=sk-proj-...
```

**Where to get it:**
- Go to https://platform.openai.com/api-keys
- Create a new API key
- Copy the key (starts with `sk-proj-` or `sk-`)

**Used for:**
- AI-powered medical report generation
- Follow-up consultation analysis
- Document generation (prescriptions, lab tests)
- Clinical reasoning and recommendations

---

### 2. **Supabase Configuration**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to get it:**
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy the "Project URL" and "anon public" key

**Used for:**
- Patient consultation history storage
- Patient demographics database
- Medical report archiving
- User authentication (if implemented)

---

## 🔧 Vercel Deployment Setup

### Step 1: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `OPENAI_API_KEY` | `sk-proj-...` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://...` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Production, Preview, Development |

4. Click **Save**

### Step 2: Redeploy

After adding environment variables:
```bash
git push origin main
```

Or manually trigger a redeploy in Vercel dashboard.

---

## 🏗️ Build Configuration

The project uses Next.js 15.2.4 with the following build settings:

**Framework Preset:** Next.js
**Build Command:** `npm run build`
**Output Directory:** `.next`
**Install Command:** `npm install`
**Node Version:** 18.x or higher

---

## ⚠️ Common Build Issues

### Issue 1: "Missing credentials" Error

**Error:**
```
Error: Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.
```

**Solution:**
- Ensure `OPENAI_API_KEY` is set in Vercel environment variables
- Make sure it's applied to all environments (Production, Preview, Development)
- Redeploy after adding the variable

---

### Issue 2: "Module not found" Errors

**Error:**
```
Module not found: Can't resolve 'date-fns'
Module not found: Can't resolve '@/components/ui/dialog'
```

**Solution:**
These should be fixed automatically by npm install. If not:
```bash
npm install date-fns @radix-ui/react-dialog @radix-ui/react-scroll-area
```

---

### Issue 3: Supabase Connection Failed

**Error:**
```
Error: Invalid Supabase URL or Key
```

**Solution:**
- Double-check your Supabase URL format (should start with `https://`)
- Verify you're using the **anon public** key, not the service role key
- Ensure the key hasn't expired or been revoked

---

## 🧪 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/stefbach/AI-DOCTOR.git
cd AI-DOCTOR
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env.local` file
```bash
cp .env.example .env.local
```

### 4. Add your credentials to `.env.local`
```bash
OPENAI_API_KEY=sk-proj-your-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📦 Dependencies

### Core Dependencies
- **Next.js 15.2.4** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

### AI & Backend
- **@ai-sdk/openai** - OpenAI integration
- **ai** - Vercel AI SDK
- **@supabase/supabase-js** - Supabase client

### UI Components
- **@radix-ui/react-*** - Primitive UI components
- **lucide-react** - Icons
- **date-fns** - Date formatting

---

## 🗃️ Database Schema (Supabase)

The application expects the following tables in Supabase:

### `consultations` table
```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  patient_name TEXT NOT NULL,
  patient_email TEXT,
  patient_phone TEXT,
  patient_age INTEGER,
  patient_gender TEXT,
  consultation_type TEXT,
  chief_complaint TEXT,
  diagnosis TEXT,
  full_report JSONB,
  medications JSONB,
  vital_signs JSONB,
  images JSONB
);
```

### Indexes
```sql
CREATE INDEX idx_consultations_patient_name ON consultations(patient_name);
CREATE INDEX idx_consultations_patient_email ON consultations(patient_email);
CREATE INDEX idx_consultations_created_at ON consultations(created_at DESC);
```

---

## 🔐 Security Best Practices

1. **Never commit `.env.local` or `.env` files** to git
2. **Rotate API keys regularly** (every 90 days recommended)
3. **Use Supabase Row Level Security (RLS)** for data protection
4. **Enable Vercel Authentication** for production deployments
5. **Monitor API usage** to prevent unexpected costs

---

## 📊 Monitoring & Logs

### Vercel Logs
View real-time logs in Vercel dashboard:
- **Runtime Logs:** Monitor API errors and performance
- **Build Logs:** Check deployment status

### OpenAI Usage
Monitor API usage at:
https://platform.openai.com/usage

### Supabase Logs
View database queries and errors:
https://app.supabase.com/project/[your-project]/logs

---

## 🆘 Support

If you encounter issues during deployment:

1. Check Vercel deployment logs for specific errors
2. Verify all environment variables are correctly set
3. Ensure your OpenAI API key has sufficient credits
4. Confirm Supabase project is active and accessible

---

## 📝 Version History

- **v3.0.0** - Added follow-up documents phase (prescriptions, lab tests, sick leave)
- **v2.0.0** - Added consultation hub with patient history
- **v1.0.0** - Initial release with 3 consultation types

---

**Last Updated:** November 14, 2025
**Platform:** Vercel
**Framework:** Next.js 15.2.4
