# 🎯 CONSIGNES TIBOK - INTÉGRATION AI DOCTOR (VERSION FINALE)

**Date**: 2026-01-03  
**Statut**: ✅ PRÊT POUR INTÉGRATION  
**Version**: 1.0

---

## 📋 RÉSUMÉ EXÉCUTIF

**OBJECTIF**: Remplacer les 2 onglets actuels (vidéo + AI Doctor) par UNE SEULE PAGE montrant :
- **Desktop**: Vidéo Daily.co (50%) | AI Doctor iframe (50%) - côte à côte
- **Mobile**: Vidéo collapsible en haut (150px) + AI Doctor en dessous (full screen)

**TEMPS ESTIMÉ**: 2-3 heures d'intégration + 1 heure de tests = **3-4 heures TOTAL**

---

## 🚀 ÉTAPES D'INTÉGRATION CÔTÉ TIBOK

### **ÉTAPE 1: Créer la nouvelle page de consultation unifiée** (1 heure)

#### 1.1 Créer le fichier `/pages/consultation-unifiee.tsx` (ou équivalent)

```tsx
'use client'

import { useState } from 'react'
import DailyVideoCall from '@/components/DailyVideoCall' // Votre composant vidéo existant

export default function ConsultationUnifiee({ consultationId, patientId, doctorId }) {
  const [isVideoExpanded, setIsVideoExpanded] = useState(false)

  // URL de l'iframe AI Doctor
  const aiDoctorUrl = `https://aidoctor.tibok.mu/consultation?embedded=true&consultationId=${consultationId}&patientId=${patientId}&doctorId=${doctorId}&source=tibok`

  return (
    <div className="consultation-container">
      {/* Desktop: 50% vidéo | 50% AI Doctor */}
      <div className="desktop-layout">
        {/* VIDÉO DAILY.CO */}
        <div className="video-panel">
          <DailyVideoCall consultationId={consultationId} />
        </div>

        {/* AI DOCTOR IFRAME */}
        <div className="ai-doctor-panel">
          <iframe
            src={aiDoctorUrl}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            allow="clipboard-read; clipboard-write; microphone"
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="AI Doctor Medical Assistant"
          />
        </div>
      </div>

      {/* Mobile: Vidéo collapsible + AI Doctor */}
      <div className="mobile-layout">
        {/* VIDÉO COLLAPSIBLE */}
        <div 
          className={`mobile-video ${isVideoExpanded ? 'expanded' : 'collapsed'}`}
          onClick={() => setIsVideoExpanded(!isVideoExpanded)}
        >
          <DailyVideoCall consultationId={consultationId} />
          <button className="toggle-video">
            {isVideoExpanded ? '▼ Réduire' : '▲ Agrandir'}
          </button>
        </div>

        {/* AI DOCTOR IFRAME */}
        <div className="mobile-ai-doctor">
          <iframe
            src={aiDoctorUrl}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            allow="clipboard-read; clipboard-write; microphone"
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="AI Doctor Medical Assistant"
          />
        </div>
      </div>

      {/* CSS STYLES */}
      <style jsx>{`
        .consultation-container {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        /* DESKTOP LAYOUT (≥1024px) */
        @media (min-width: 1024px) {
          .desktop-layout {
            display: flex;
            width: 100%;
            height: 100vh;
          }

          .video-panel {
            width: 50%;
            height: 100%;
            border-right: 2px solid #e5e7eb;
          }

          .ai-doctor-panel {
            width: 50%;
            height: 100%;
          }

          .mobile-layout {
            display: none;
          }
        }

        /* MOBILE LAYOUT (<1024px) */
        @media (max-width: 1023px) {
          .desktop-layout {
            display: none;
          }

          .mobile-layout {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100vh;
          }

          .mobile-video {
            width: 100%;
            position: relative;
            cursor: pointer;
          }

          .mobile-video.collapsed {
            height: 150px;
          }

          .mobile-video.expanded {
            height: 400px;
          }

          .toggle-video {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 20px;
            font-size: 12px;
          }

          .mobile-ai-doctor {
            flex: 1;
            width: 100%;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  )
}
```

#### 1.2 Modifier le routing pour utiliser cette nouvelle page

**Avant** (2 onglets séparés):
```
/consultation/video?id=123        → Onglet 1: Vidéo
/consultation/ai-doctor?id=123    → Onglet 2: AI Doctor
```

**Après** (1 page unifiée):
```
/consultation/unifiee?id=123      → Page unique: Vidéo + AI Doctor
```

---

### **ÉTAPE 2: Paramètres de l'URL AI Doctor** (15 minutes)

L'URL de l'iframe AI Doctor DOIT contenir ces paramètres :

```
https://aidoctor.tibok.mu/consultation?embedded=true&consultationId={ID}&patientId={PATIENT_ID}&doctorId={DOCTOR_ID}&source=tibok
```

**Exemple réel**:
```
https://aidoctor.tibok.mu/consultation?embedded=true&consultationId=abc123&patientId=456&doctorId=789&source=tibok
```

**Paramètres obligatoires**:
| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `embedded` | `true` | Active le mode iframe (masque header/footer) |
| `consultationId` | ID de votre consultation | Identifiant unique de la consultation TIBOK |
| `patientId` | ID du patient | Identifiant unique du patient |
| `doctorId` | ID du médecin | Identifiant unique du médecin |
| `source` | `tibok` | Indique que la requête vient de TIBOK |

---

### **ÉTAPE 3: Tests obligatoires** (1 heure)

#### Test 1: Desktop Chrome (15 min)
1. Ouvrir la nouvelle page `/consultation-unifiee`
2. **Vérifier**:
   - ✅ Vidéo Daily.co à gauche (50%)
   - ✅ AI Doctor iframe à droite (50%)
   - ✅ Pas de header/footer dans l'iframe
   - ✅ Formulaires AI Doctor fonctionnels
   - ✅ Pas d'erreur "Refused to display"

#### Test 2: Desktop Safari (15 min)
1. Répéter le Test 1 sur Safari
2. **Vérifier**: idem Chrome

#### Test 3: Mobile iOS Safari (15 min)
1. Ouvrir sur iPhone/iPad
2. **Vérifier**:
   - ✅ Vidéo en haut (150px)
   - ✅ Bouton "▲ Agrandir" / "▼ Réduire" fonctionne
   - ✅ AI Doctor en dessous (prend tout l'espace)
   - ✅ Scroll fluide dans AI Doctor
   - ✅ Dictaphone fonctionne (si applicable)

#### Test 4: Mobile Android Chrome (15 min)
1. Ouvrir sur Android
2. **Vérifier**: idem iOS

---

## 🔧 TROUBLESHOOTING

### Problème 1: "Refused to display in a frame"
**Cause**: Headers CORS/CSP mal configurés  
**Solution**: Vérifier que l'URL contient `embedded=true`

```bash
# Test curl (doit contenir frame-ancestors)
curl -I https://aidoctor.tibok.mu/consultation?embedded=true
```

**Résultat attendu**:
```
Content-Security-Policy: frame-ancestors 'self' https://www.tibok.mu https://staging.tibok.mu https://*.vercel.app http://localhost:*
```

### Problème 2: L'iframe ne charge pas
**Solution**: Vérifier les attributs `sandbox` et `allow`

```html
<!-- Attributs obligatoires -->
<iframe
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
  allow="clipboard-read; clipboard-write; microphone"
/>
```

### Problème 3: Le scroll ne fonctionne pas sur mobile
**Solution**: Ajouter `-webkit-overflow-scrolling: touch`

```css
.mobile-ai-doctor {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
```

### Problème 4: La vidéo ne se redimensionne pas
**Solution**: Utiliser `flex` et `height: 100%`

```css
.ai-doctor-panel {
  height: 100%;
  display: flex;
}
```

---

## 📞 SUPPORT & QUESTIONS

**Si vous rencontrez un problème**:
1. Vérifier les tests ci-dessus
2. Ouvrir la console navigateur (F12) et copier les erreurs
3. Contacter l'équipe AI Doctor avec:
   - Description du problème
   - Navigateur/device utilisé
   - Capture d'écran de l'erreur console
   - URL testée

**Documentation complète**:
- `TIBOK_IFRAME_INTEGRATION.md` (détails techniques)
- `GUIDE_TEST_RAPIDE_TIBOK.md` (tests rapides)
- `test-tibok-complete.html` (page de test standalone)

---

## ✅ CHECKLIST FINALE

Avant de déployer en production :

- [ ] Page de consultation unifiée créée
- [ ] URL avec `embedded=true` configurée
- [ ] Tests Desktop Chrome réussis
- [ ] Tests Desktop Safari réussis
- [ ] Tests Mobile iOS réussis
- [ ] Tests Mobile Android réussis
- [ ] Vidéo Daily.co fonctionne dans les 2 layouts
- [ ] AI Doctor iframe charge sans erreur
- [ ] Formulaires AI Doctor fonctionnels
- [ ] Scroll mobile fluide
- [ ] Bouton "Agrandir/Réduire" vidéo fonctionne sur mobile

---

## 🎯 RÉSUMÉ POUR DÉVELOPPEUR TIBOK

**3 ACTIONS SIMPLES**:

1. **Créer** `/pages/consultation-unifiee.tsx` avec le code fourni ci-dessus
2. **Intégrer** l'iframe avec l'URL:
   ```
   https://aidoctor.tibok.mu/consultation?embedded=true&consultationId={ID}&patientId={PID}&doctorId={DID}&source=tibok
   ```
3. **Tester** sur Desktop (Chrome + Safari) et Mobile (iOS + Android)

**C'EST TOUT !** 🎉

---

## 📊 STATUT ACTUEL

| Composant | Statut | Responsable |
|-----------|--------|-------------|
| AI Doctor (backend) | ✅ PRÊT | AI Doctor Team |
| Headers CORS/CSP | ✅ PRÊT | AI Doctor Team |
| Mode embedded | ✅ PRÊT | AI Doctor Team |
| **Page unifiée TIBOK** | ⏳ **À FAIRE** | **TIBOK Team** |
| **Tests intégration** | ⏳ **À FAIRE** | **TIBOK Team** |

**AI Doctor est 100% PRÊT côté backend/iframe.**  
**TIBOK doit maintenant créer la page de consultation unifiée.**

---

**Dernière mise à jour**: 2026-01-03  
**Version**: 1.0 - FINALE  
**Commit**: 4e02ac4
