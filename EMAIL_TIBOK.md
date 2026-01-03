# 📧 EMAIL POUR L'ÉQUIPE TIBOK

---

**De**: Équipe AI Doctor  
**À**: Équipe Développement TIBOK  
**Objet**: ✅ Intégration AI Doctor iframe - PRÊT POUR INTÉGRATION  
**Date**: 2026-01-03

---

Bonjour l'équipe TIBOK,

## 🎉 Bonne nouvelle : l'intégration AI Doctor en mode iframe est TERMINÉE et DÉPLOYÉE !

Vous pouvez maintenant intégrer AI Doctor directement dans votre interface de consultation pour remplacer les 2 onglets actuels (vidéo + AI Doctor) par **UNE SEULE PAGE** montrant :

- **Desktop** : Vidéo Daily.co (50%) | AI Doctor (50%) - côte à côte
- **Mobile** : Vidéo collapsible (150px) + AI Doctor en plein écran

---

## 🚀 CE QUI EST PRÊT CÔTÉ AI DOCTOR

✅ **Mode embedded activé** : L'interface AI Doctor s'adapte automatiquement quand elle est chargée dans une iframe  
✅ **Headers CORS/CSP configurés** : Autorise les domaines TIBOK (production + staging + Vercel)  
✅ **Header/Footer masqués** : Interface optimisée pour l'iframe (pas de header/footer en mode embedded)  
✅ **Responsive mobile** : Optimisé pour iOS et Android (touches 44px, scroll fluide)  
✅ **Performance optimisée** : CSS spécifique, will-change, GPU acceleration  
✅ **Tests validés** : Desktop (Chrome, Safari) + Mobile (iOS, Android)

---

## 🎯 CE QUE VOUS DEVEZ FAIRE (3-4 HEURES)

### ÉTAPE 1 : Créer la nouvelle page de consultation unifiée (1-2 heures)

Créez `/pages/consultation-unifiee.tsx` (ou équivalent) avec ce code :

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
        <div className="video-panel">
          <DailyVideoCall consultationId={consultationId} />
        </div>
        <div className="ai-doctor-panel">
          <iframe
            src={aiDoctorUrl}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            allow="clipboard-read; clipboard-write; microphone"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="AI Doctor Medical Assistant"
          />
        </div>
      </div>

      {/* Mobile: Vidéo collapsible + AI Doctor */}
      <div className="mobile-layout">
        <div 
          className={`mobile-video ${isVideoExpanded ? 'expanded' : 'collapsed'}`}
          onClick={() => setIsVideoExpanded(!isVideoExpanded)}
        >
          <DailyVideoCall consultationId={consultationId} />
          <button className="toggle-video">
            {isVideoExpanded ? '▼ Réduire' : '▲ Agrandir'}
          </button>
        </div>
        <div className="mobile-ai-doctor">
          <iframe
            src={aiDoctorUrl}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            allow="clipboard-read; clipboard-write; microphone"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="AI Doctor Medical Assistant"
          />
        </div>
      </div>

      {/* CSS STYLES */}
      <style jsx>{`
        .consultation-container { width: 100vw; height: 100vh; overflow: hidden; }

        /* DESKTOP */
        @media (min-width: 1024px) {
          .desktop-layout { display: flex; width: 100%; height: 100vh; }
          .video-panel { width: 50%; height: 100%; border-right: 2px solid #e5e7eb; }
          .ai-doctor-panel { width: 50%; height: 100%; }
          .mobile-layout { display: none; }
        }

        /* MOBILE */
        @media (max-width: 1023px) {
          .desktop-layout { display: none; }
          .mobile-layout { display: flex; flex-direction: column; width: 100%; height: 100vh; }
          .mobile-video { width: 100%; position: relative; cursor: pointer; }
          .mobile-video.collapsed { height: 150px; }
          .mobile-video.expanded { height: 400px; }
          .toggle-video {
            position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
            padding: 8px 16px; background: rgba(0,0,0,0.7); color: white;
            border: none; border-radius: 20px; font-size: 12px;
          }
          .mobile-ai-doctor {
            flex: 1; width: 100%; overflow: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  )
}
```

### ÉTAPE 2 : Utiliser l'URL correcte (5 minutes)

```
https://aidoctor.tibok.mu/consultation?embedded=true&consultationId={ID}&patientId={PID}&doctorId={DID}&source=tibok
```

**Paramètres obligatoires** :
- `embedded=true` → Active le mode iframe
- `consultationId={ID}` → ID unique de la consultation
- `patientId={PID}` → ID du patient
- `doctorId={DID}` → ID du médecin
- `source=tibok` → Indique que la requête vient de TIBOK

### ÉTAPE 3 : Tests (1 heure)

Testez sur :
- ✅ Desktop Chrome
- ✅ Desktop Safari
- ✅ Mobile iOS Safari
- ✅ Mobile Android Chrome

**Checklist de test** :
- [ ] L'iframe se charge sans erreur "Refused to display"
- [ ] Pas de header/footer visible dans l'iframe
- [ ] Formulaires AI Doctor fonctionnels
- [ ] Vidéo Daily.co fonctionne
- [ ] Scroll fluide sur mobile
- [ ] Bouton "Agrandir/Réduire" fonctionne sur mobile

---

## 📁 FICHIERS FOURNIS

Nous avons créé plusieurs fichiers pour vous aider :

1. **CONSIGNES_TIBOK_FINALES.md** → Guide complet d'intégration (ce document)
2. **test-tibok-complete.html** → Page de test standalone (à ouvrir dans un navigateur)
3. **TIBOK_IFRAME_INTEGRATION.md** → Documentation technique complète
4. **GUIDE_TEST_RAPIDE_TIBOK.md** → Tests rapides pour valider

**Tous ces fichiers sont disponibles dans le repo AI Doctor** :  
👉 https://github.com/stefbach/AI-DOCTOR

---

## 🐛 TROUBLESHOOTING

### Problème : "Refused to display in a frame"
**Solution** : Vérifier que l'URL contient `embedded=true`

### Problème : L'iframe ne charge pas
**Solution** : Vérifier les attributs `sandbox` et `allow` :
```html
<iframe
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
  allow="clipboard-read; clipboard-write; microphone"
/>
```

### Problème : Le scroll ne fonctionne pas sur mobile
**Solution** : Ajouter `-webkit-overflow-scrolling: touch`

---

## 📞 BESOIN D'AIDE ?

Si vous rencontrez un problème :
1. Vérifier les tests ci-dessus
2. Ouvrir la console navigateur (F12) et copier les erreurs
3. Répondre à cet email avec :
   - Description du problème
   - Navigateur/device utilisé
   - Capture d'écran de l'erreur console
   - URL testée

---

## ✅ STATUT ACTUEL

| Composant | Statut | Responsable |
|-----------|--------|-------------|
| AI Doctor backend | ✅ **PRÊT** | AI Doctor Team |
| Headers CORS/CSP | ✅ **PRÊT** | AI Doctor Team |
| Mode embedded | ✅ **PRÊT** | AI Doctor Team |
| **Page unifiée TIBOK** | ⏳ **À FAIRE** | **TIBOK Team** |
| **Tests intégration** | ⏳ **À FAIRE** | **TIBOK Team** |

**AI Doctor est 100% PRÊT côté backend/iframe.**  
**TIBOK doit maintenant créer la page de consultation unifiée.**

---

## 🎯 RÉSUMÉ EN 3 POINTS

1. **Créer** `/pages/consultation-unifiee.tsx` avec le code fourni
2. **Intégrer** l'iframe avec l'URL : `https://aidoctor.tibok.mu/consultation?embedded=true&...`
3. **Tester** sur Desktop et Mobile

**Temps estimé total : 3-4 heures**

---

Merci et bon développement ! 🚀

**Équipe AI Doctor**

---

**P.S.** : Vous pouvez tester dès maintenant avec le fichier `test-tibok-complete.html` fourni. Ouvrez-le dans un navigateur pour voir le résultat final attendu.
