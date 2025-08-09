// src/helpers/saveMedicalReport.ts
export async function saveMedicalReport(payload: any) {
  // coupe l'appel si le flag est activé
  if (process.env.NEXT_PUBLIC_DISABLE_SAVE_MEDICAL_REPORT === '1') {
    return { ok: true, skipped: true };
  }

  // appel protégé + timeout court pour ne jamais bloquer la génération
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch('/api/save-medical-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(t);
    return res.ok ? { ok: true } : { ok: false, ignored: true };
  } catch {
    clearTimeout(t);
    return { ok: false, ignored: true };
  }
}
