# ⚡ TIBOK INTÉGRATION - VERSION EXPRESS (5 MINUTES)

**Pour développeur pressé qui veut juste le code**

---

## 1️⃣ CRÉER LA PAGE (2 min)

Créez `/pages/consultation-unifiee.tsx` :

```tsx
'use client'
import { useState } from 'react'
import DailyVideoCall from '@/components/DailyVideoCall'

export default function ConsultationUnifiee({ consultationId, patientId, doctorId }) {
  const [expanded, setExpanded] = useState(false)
  const url = `https://aidoctor.tibok.mu/consultation?embedded=true&consultationId=${consultationId}&patientId=${patientId}&doctorId=${doctorId}&source=tibok`

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* DESKTOP: 50% vidéo | 50% AI Doctor */}
      <div style={{ display: 'flex', width: '100%', height: '100%' }} className="desktop-only">
        <div style={{ width: '50%', height: '100%' }}>
          <DailyVideoCall consultationId={consultationId} />
        </div>
        <div style={{ width: '50%', height: '100%' }}>
          <iframe src={url} sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals" allow="clipboard-read; clipboard-write; microphone" style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      </div>

      {/* MOBILE: Vidéo collapsible + AI Doctor */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }} className="mobile-only">
        <div style={{ height: expanded ? '400px' : '150px', position: 'relative' }} onClick={() => setExpanded(!expanded)}>
          <DailyVideoCall consultationId={consultationId} />
          <button style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '20px' }}>
            {expanded ? '▼ Réduire' : '▲ Agrandir'}
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <iframe src={url} sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals" allow="clipboard-read; clipboard-write; microphone" style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 1024px) {
          .desktop-only { display: flex !important; }
          .mobile-only { display: none !important; }
        }
        @media (max-width: 1023px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
```

---

## 2️⃣ URL DE L'IFRAME (1 min)

```
https://aidoctor.tibok.mu/consultation?embedded=true&consultationId={ID}&patientId={PID}&doctorId={DID}&source=tibok
```

**Paramètres obligatoires** :
- `embedded=true` ← OBLIGATOIRE
- `consultationId`, `patientId`, `doctorId`, `source=tibok`

---

## 3️⃣ TESTER (2 min)

**Desktop** :
```
http://localhost:3000/consultation-unifiee?consultationId=test&patientId=123&doctorId=456
```

**Mobile** :
- Ouvrir sur téléphone
- Vérifier vidéo + AI Doctor

---

## ✅ C'EST TOUT !

**Temps total** : 5 minutes  
**Résultat** : Desktop 50/50, Mobile collapsible  
**Support** : Voir `CONSIGNES_TIBOK_FINALES.md` pour détails

---

**Questions ?** → Voir `EMAIL_TIBOK.md`
