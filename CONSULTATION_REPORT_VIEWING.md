# Guide: Accès aux Rapports de Consultation

## 📋 Vue d'Ensemble

Ce guide explique comment accéder aux informations, comptes rendus et synthèses des consultations précédentes d'un patient existant.

---

## 🎯 Cas d'Usage

### Vous êtes médecin et vous devez:
- ✅ Consulter le dernier rapport médical d'un patient
- ✅ Voir l'historique complet des consultations
- ✅ Télécharger un rapport pour impression ou archivage
- ✅ Comparer l'évolution du patient entre consultations

---

## 🔍 Méthode 1: Accès Rapide au Dernier Rapport

### Étapes:

1. **Aller au Hub de Consultation**
   ```
   Navigation: /consultation-hub
   ```

2. **Rechercher le Patient**
   - Entrer nom, email ou téléphone
   - Cliquer sur "Rechercher"

3. **Patient Trouvé ✅**
   - Le système affiche un résumé avec:
     - Identité du patient
     - Date de dernière consultation
     - Dernier diagnostic
     - Dernières constantes vitales

4. **Cliquer sur "Voir Dernier Rapport"**
   - Bouton bleu en bas du résumé
   - Ouvre le rapport dans un nouvel onglet
   - Format professionnel, prêt à imprimer

### Résultat:
```
┌─────────────────────────────────────┐
│  RAPPORT MÉDICAL COMPLET            │
├─────────────────────────────────────┤
│  • Format professionnel             │
│  • Titres en gras                   │
│  • Sections bien organisées         │
│  • Boutons Télécharger + Imprimer  │
└─────────────────────────────────────┘
```

---

## 📚 Méthode 2: Navigation dans l'Historique Complet

### Étapes:

1. **Depuis le Résumé Patient**
   - Cliquer sur "Historique Complet"

2. **Liste des Consultations s'affiche**
   - Timeline visuelle
   - Tri chronologique (plus récent en premier)
   - Badge "Most Recent" sur la dernière

3. **Informations Affichées pour Chaque Consultation:**
   - 📅 Date (format: "Nov 15, 2024")
   - ⏱️ Il y a combien de temps ("2 days ago")
   - 🩺 Type de consultation (Normale, Dermatologie, Chronique)
   - 📝 Chief Complaint
   - 🔬 Diagnostic
   - 💊 Médicaments prescrits (3 premiers)
   - 📊 Signes vitaux (TA, Poids, Température)
   - 📷 Images (si dermatologie)

4. **Cliquer sur une Consultation**
   - Modal s'ouvre avec détails complets
   - Sections dépliables
   - Toutes les informations cliniques

5. **Dans la Modal - Voir le Rapport**
   - Section "Rapport Médical Complet"
   - Aperçu (premiers 800 caractères)
   - Deux boutons:
     - **"Voir le Rapport Complet"** → Page dédiée
     - **"Télécharger PDF"** → Fichier texte (.txt)

---

## 🖨️ Méthode 3: Impression et Téléchargement

### Depuis la Page de Rapport (`/view-report/[id]`)

#### Option A: Imprimer
```
1. Cliquer sur bouton "Imprimer"
2. Dialogue d'impression du navigateur s'ouvre
3. Choisir imprimante ou "Enregistrer en PDF"
4. Mise en page automatique (marges 2cm)
5. En-tête et navigation cachés automatiquement
```

#### Option B: Télécharger
```
1. Cliquer sur bouton "Télécharger"
2. Fichier texte (.txt) téléchargé
3. Nom: Medical_Report_[ID]_[Date].txt
4. Contient le rapport formaté complet
5. Peut être ouvert dans n'importe quel éditeur
```

**Note:** Génération PDF via API disponible prochainement

---

## 📊 Formats de Rapport Supportés

### 1. **Format Anglais (Professional)**
```
CONSULTATION REPORT

═══════════════════════════════════════

DOCUMENT INFORMATION
Document ID: REF-2024-001
Date: November 15, 2024
Physician: Dr. John Smith

═══════════════════════════════════════

PATIENT IDENTIFICATION
Name: Jean Dupont
Age: 45 years
Gender: Male

═══════════════════════════════════════
...
```

### 2. **Format Mauricien (Français)**
```
COMPTE RENDU DE CONSULTATION

Patient: Jean Dupont
Âge: 45 ans
Sexe: Masculin

Motif de Consultation:
...

Diagnostic:
...
```

### 3. **Format Structuré**
- En-tête avec référence
- Informations patient
- Évaluation clinique
- Résumé diagnostic
- Plan de traitement

### 4. **Fallback JSON**
- Si format inconnu
- Données brutes affichées
- Pour support technique

---

## 🎨 Interface Utilisateur

### Page de Rapport Professionnel

```
┌─────────────────────────────────────────────────┐
│  [← Retour]  Rapport Médical                    │
│              Consultation ID: CHR-2024-001      │
│                                                  │
│              [Télécharger]  [Imprimer]          │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │  RAPPORT MÉDICAL COMPLET                  │  │
│  │                                           │  │
│  │  ═══════════════════════════════════════  │  │
│  │                                           │  │
│  │  DOCUMENT INFORMATION                     │  │
│  │  Date: November 15, 2024                  │  │
│  │  ...                                      │  │
│  │                                           │  │
│  │  PATIENT IDENTIFICATION                   │  │
│  │  Name: Jean Dupont                        │  │
│  │  ...                                      │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Sécurité & Confidentialité

### Mesures Implémentées:
- ✅ **Accès sécurisé**: Nécessite recherche patient valide
- ✅ **Nouvel onglet**: Ne perd pas le contexte de travail
- ✅ **HTML escaping**: Protection contre XSS
- ✅ **Données sensibles**: Affichées uniquement en mode sécurisé
- ✅ **Téléchargement local**: Pas de stockage cloud non autorisé

### Bonnes Pratiques:
- 🔒 Fermer l'onglet après consultation
- 🔒 Ne pas partager les liens de rapport
- 🔒 Utiliser impression sécurisée
- 🔒 Supprimer fichiers téléchargés après usage

---

## 📱 Responsive Design

### Desktop (≥ 1024px)
- Largeur max: 1280px (5xl container)
- Deux colonnes pour informations patient
- Navigation latérale visible

### Tablet (768px - 1024px)
- Colonnes empilées
- Navigation compacte
- Boutons pleine largeur

### Mobile (< 768px)
- Vue liste verticale
- Boutons empilés
- Timeline simplifiée

---

## 🚀 Raccourcis Clavier (À venir)

| Raccourci | Action |
|-----------|--------|
| `Ctrl + P` | Imprimer rapport |
| `Ctrl + S` | Télécharger |
| `Escape` | Fermer modal |
| `←` | Retour historique |
| `→` | Consultation suivante |

---

## 🐛 Résolution de Problèmes

### Problème: "Rapport non trouvé"

**Causes possibles:**
- Consultation ID invalide
- Rapport pas encore enregistré dans Supabase
- Problème de connexion réseau

**Solutions:**
1. Vérifier ID consultation
2. Rafraîchir la page
3. Retourner au Hub et rechercher à nouveau
4. Contacter support si persiste

---

### Problème: "Format d'affichage incorrect"

**Causes possibles:**
- Format de rapport non standard
- Données corrompues
- Incompatibilité version

**Solutions:**
1. Utiliser le fallback JSON
2. Télécharger le rapport brut
3. Signaler au support technique

---

### Problème: "Impression ne fonctionne pas"

**Causes possibles:**
- Bloqueur de popup
- Pilote imprimante
- Paramètres navigateur

**Solutions:**
1. Autoriser popups pour le site
2. Vérifier imprimante par défaut
3. Utiliser "Enregistrer en PDF" comme alternative
4. Essayer autre navigateur

---

## 📈 Statistiques d'Usage (Admin)

### Métriques Collectées:
- Nombre de rapports consultés par jour
- Temps moyen de consultation
- Format de rapport le plus courant
- Taux d'impression vs téléchargement
- Consultations les plus anciennes consultées

### Dashboard Admin (à venir):
```
┌─────────────────────────────────────┐
│  Rapports Consultés: 342            │
│  Téléchargements: 89                │
│  Impressions: 156                   │
│  Format Principal: English (78%)    │
└─────────────────────────────────────┘
```

---

## 🔄 Workflow Complet

```
┌────────────────────────────────────────────────┐
│  ACCÈS RAPIDE                                  │
├────────────────────────────────────────────────┤
│  1. /consultation-hub                          │
│  2. Rechercher patient                         │
│  3. "Voir Dernier Rapport" (bouton bleu)      │
│  4. Rapport s'ouvre dans nouvel onglet         │
│  5. Imprimer ou Télécharger                    │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  NAVIGATION HISTORIQUE                         │
├────────────────────────────────────────────────┤
│  1. /consultation-hub                          │
│  2. Rechercher patient                         │
│  3. "Historique Complet"                       │
│  4. Parcourir timeline                         │
│  5. Cliquer sur consultation                   │
│  6. Modal détails s'ouvre                      │
│  7. "Voir le Rapport Complet"                  │
│  8. Page dédiée avec options                   │
└────────────────────────────────────────────────┘
```

---

## 🎓 Formation Utilisateur

### Vidéo Tutorial (Recommandé)
- **Durée:** 5 minutes
- **Contenu:**
  - Recherche patient
  - Navigation historique
  - Consultation rapport
  - Impression
  - Téléchargement

### Session de Formation
- **Durée:** 15 minutes
- **Format:** Démo en direct
- **Inclus:** Q&A

---

## 💡 Conseils Pro

### 1. **Marquer Consultations Importantes**
   - Utiliser notes personnelles (à venir)
   - Exporter rapports critiques
   - Créer dossiers patients

### 2. **Optimiser Performance**
   - Fermer onglets inutilisés
   - Vider cache navigateur régulièrement
   - Utiliser connexion stable

### 3. **Organisation**
   - Nommer fichiers téléchargés clairement
   - Créer structure dossiers
   - Archiver anciens rapports

---

## 📞 Support

### Besoin d'aide?
- 📧 Email: support@tibok-ai.com
- 📱 Téléphone: +230 XXX XXXX
- 💬 Chat: Disponible 24/7
- 📚 Documentation: docs.tibok-ai.com

---

## 🔮 Fonctionnalités Futures

### En Développement:
- [ ] Génération PDF via API (haute qualité)
- [ ] Email direct du rapport au patient
- [ ] Comparaison entre consultations
- [ ] Annotations et commentaires
- [ ] Signature électronique
- [ ] Export bundle multi-rapports
- [ ] Templates personnalisables
- [ ] Recherche full-text dans rapports
- [ ] Graphiques d'évolution automatiques
- [ ] Intégration calendrier

### Demandé par Utilisateurs:
- [ ] Mode sombre pour lecture nocturne
- [ ] Synthèse vocale (text-to-speech)
- [ ] Traduction automatique FR ↔ EN
- [ ] Export Word/Excel
- [ ] Archivage cloud sécurisé

---

**Version:** 1.0.0  
**Dernière Mise à Jour:** 2025-11-16  
**Auteur:** AI-DOCTOR Development Team  
**Status:** ✅ Production Ready
