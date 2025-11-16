# Patient Prefill Workflow - Visual Documentation

## 🎯 Problem Statement

**Before this feature:**
```
┌─────────────────────────────────────────────────────────┐
│  Existing Patient Workflows                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ NEW Patient → Initial Consultation                  │
│     └─ Patient Info → Clinical → AI Q → Diagnosis       │
│                                                          │
│  ✅ EXISTING Patient → Simplified Follow-up             │
│     └─ Minimal form → Direct report (NO AI questions)   │
│                                                          │
│  ❌ EXISTING Patient → FULL Consultation                │
│     └─ NOT POSSIBLE - Would require re-entering         │
│        ALL patient data manually                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**The Gap:**
No way to do a **complete diagnostic workflow** (with AI questions and full diagnosis) for a patient who already exists in the system, without manually re-entering all their demographic information.

---

## ✅ Solution Architecture

### High-Level Flow

```
┌───────────────┐
│ Consultation  │
│     Hub       │ ← User searches for existing patient
└───────┬───────┘
        │
        ├─ Patient Found ✓
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  Workflow Selection                                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Option 1: Suivi (Follow-up)                         │
│  └─ Quick report, no AI questions                    │
│                                                       │
│  Option 2: Nouvelle Consultation (Full)  ← NEW!      │
│  └─ Complete workflow WITH patient prefill           │
│                                                       │
└───────────────┬───────────────────────────────────────┘
                │
                │ User selects "Nouvelle Consultation"
                │
                ▼
        ┌───────────────┐
        │  Extract       │
        │  Demographics  │ ← extractPatientDemographicsFromHistory()
        └───────┬────────┘
                │
                ▼
        ┌───────────────┐
        │ sessionStorage │
        │    Bridge      │ ← consultationPatientData
        └───────┬────────┘
                │
                ▼
        ┌───────────────┐
        │   Redirect     │
        │ /consultation  │
        └───────┬────────┘
                │
                ▼
        ┌───────────────┐
        │  PatientForm   │
        │  AUTO-FILLED   │ ← Data merged from sessionStorage
        └───────┬────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│  Complete 5-Step Workflow                     │
├───────────────────────────────────────────────┤
│  Step 1: Patient Info (pre-filled ✓)         │
│  Step 2: Clinical Data (manual entry)         │
│  Step 3: AI Questions (generated)             │
│  Step 4: Diagnosis (AI-powered)               │
│  Step 5: Full Professional Report             │
└───────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Hub Workflow Selector (hub-workflow-selector.tsx)          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  handleProceed() {                                           │
│    if (!path.includes('/follow-up') && hasHistory) {        │
│                                                              │
│      // 1. Extract demographics                             │
│      const demographics =                                    │
│        extractPatientDemographicsFromHistory(                │
│          consultationHistory                                 │
│        )                                                     │
│                                                              │
│      // 2. Format for PatientForm                           │
│      const prefillData = {                                   │
│        firstName, lastName, birthDate,                       │
│        gender, phone, email, address,                        │
│        weight, height, allergies,                            │
│        medicalHistory, currentMedications                    │
│      }                                                       │
│                                                              │
│      // 3. Store in sessionStorage                          │
│      sessionStorage.setItem(                                 │
│        'consultationPatientData',                            │
│        JSON.stringify(prefillData)                           │
│      )                                                       │
│      sessionStorage.setItem(                                 │
│        'isExistingPatientConsultation',                      │
│        'true'                                                │
│      )                                                       │
│    }                                                         │
│                                                              │
│    router.push(selectedPath)                                │
│  }                                                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Navigation
                       │
┌──────────────────────▼───────────────────────────────────────┐
│  Main Consultation Page (app/page.tsx)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  useEffect(() => {                                           │
│    // 4. Read sessionStorage on mount                       │
│    const savedData = sessionStorage.getItem(                │
│      'consultationPatientData'                               │
│    )                                                         │
│    const isExisting = sessionStorage.getItem(               │
│      'isExistingPatientConsultation'                         │
│    )                                                         │
│                                                              │
│    if (savedData && isExisting === 'true') {                │
│      // 5. Parse and set prefill data                       │
│      const patientData = JSON.parse(savedData)              │
│      setPrefillData(patientData)                             │
│                                                              │
│      // 6. Cleanup sessionStorage                           │
│      sessionStorage.removeItem('consultationPatientData')   │
│      sessionStorage.removeItem(                              │
│        'isExistingPatientConsultation'                       │
│      )                                                       │
│    }                                                         │
│  }, [])                                                      │
│                                                              │
│  // 7. Merge with PatientForm data                          │
│  getCurrentStepProps() {                                     │
│    case 0:                                                   │
│      return {                                                │
│        data: Object.keys(prefillData).length > 0            │
│          ? { ...patientData, ...prefillData }              │
│          : patientData                                       │
│      }                                                       │
│  }                                                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Props passed
                       │
┌──────────────────────▼───────────────────────────────────────┐
│  PatientForm (components/patient-form.tsx)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  const [formData, setFormData] = useState(() => ({          │
│    ...INITIAL_FORM_DATA,                                     │
│    ...data  // ← Prefill data merged here                   │
│  }))                                                         │
│                                                              │
│  // 8. Form displays with pre-filled values                 │
│  // 9. User can edit if needed                              │
│  // 10. Submit proceeds to Clinical step                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Sequence

```
Consultation Hub
     │
     │ [User selects patient + "Nouvelle Consultation"]
     ▼
┌─────────────────────────────────────────────────┐
│ consultationHistory: [                          │
│   {                                              │
│     id: "...",                                   │
│     date: "2024-11-01",                          │
│     fullReport: {                                │
│       medicalReport: {                           │
│         patient: {                               │
│           firstName: "Jean",                     │
│           lastName: "Dupont",                    │
│           age: "45",                             │
│           gender: "Male",                        │
│           phone: "+230 123 4567",                │
│           email: "jean@example.com",             │
│           weight: "75",                          │
│           height: "175",                         │
│           allergies: ["Penicillin"],             │
│           medicalHistory: ["Hypertension"],      │
│           currentMedications: "Amlodipine 5mg"   │
│         }                                        │
│       }                                          │
│     }                                            │
│   }                                              │
│ ]                                                │
└─────────────────────────────────────────────────┘
     │
     │ extractPatientDemographicsFromHistory()
     ▼
┌─────────────────────────────────────────────────┐
│ demographics = {                                 │
│   fullName: "Jean Dupont",                       │
│   firstName: "Jean",                             │
│   lastName: "Dupont",                            │
│   age: "45",                                     │
│   dateOfBirth: "1979-01-15",                     │
│   gender: "Male",                                │
│   address: "Port Louis, Mauritius",              │
│   phone: "+230 123 4567",                        │
│   email: "jean@example.com",                     │
│   weight: "75",                                  │
│   height: "175",                                 │
│   allergies: ["Penicillin"],                     │
│   medicalHistory: ["Hypertension"],              │
│   currentMedications: "Amlodipine 5mg"           │
│ }                                                │
└─────────────────────────────────────────────────┘
     │
     │ Format for PatientForm
     ▼
┌─────────────────────────────────────────────────┐
│ prefillData = {                                  │
│   firstName: "Jean",                             │
│   lastName: "Dupont",                            │
│   birthDate: "1979-01-15",                       │
│   age: "45",                                     │
│   gender: "Male",                                │
│   phone: "+230 123 4567",                        │
│   email: "jean@example.com",                     │
│   address: "Port Louis, Mauritius",              │
│   weight: "75",                                  │
│   height: "175",                                 │
│   allergies: ["Penicillin"],                     │
│   otherAllergies: "",                            │
│   medicalHistory: ["Hypertension"],              │
│   otherMedicalHistory: "",                       │
│   currentMedicationsText: "Amlodipine 5mg"       │
│ }                                                │
└─────────────────────────────────────────────────┘
     │
     │ Store in sessionStorage
     ▼
┌─────────────────────────────────────────────────┐
│ sessionStorage {                                 │
│   consultationPatientData: JSON.stringify(       │
│     prefillData                                  │
│   ),                                             │
│   isExistingPatientConsultation: "true"          │
│ }                                                │
└─────────────────────────────────────────────────┘
     │
     │ router.push('/consultation')
     ▼
┌─────────────────────────────────────────────────┐
│ /consultation page loads                         │
│                                                  │
│ useEffect runs:                                  │
│   - Reads sessionStorage                         │
│   - Parses JSON                                  │
│   - Sets prefillData state                       │
│   - REMOVES sessionStorage keys (cleanup)        │
└─────────────────────────────────────────────────┘
     │
     │ getCurrentStepProps() for step 0
     ▼
┌─────────────────────────────────────────────────┐
│ PatientForm receives:                            │
│                                                  │
│ data = {                                         │
│   ...patientData,  // (empty initially)          │
│   ...prefillData   // (from sessionStorage)      │
│ }                                                │
│                                                  │
│ Result: All fields pre-filled!                   │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Data Format Compatibility

### Supports Multiple Report Structures

```typescript
// Format 1: Mauritian (compteRendu)
{
  compteRendu: {
    patient: {
      nomComplet: "Jean Dupont",      → fullName
      prenom: "Jean",                  → firstName
      nom: "Dupont",                   → lastName
      dateNaissance: "1979-01-15",     → dateOfBirth
      sexe: "Masculin",                → gender
      telephone: "+230 123 4567",      → phone
      adresse: "Port Louis",           → address
      poids: "75",                     → weight
      taille: "175",                   → height
      antecedentsMedicaux: [...],      → medicalHistory
      medicamentsActuels: "..."        → currentMedications
    }
  }
}

// Format 2: English (medicalReport)
{
  medicalReport: {
    patient: {
      fullName: "Jean Dupont",         → fullName
      firstName: "Jean",               → firstName
      lastName: "Dupont",              → lastName
      dateOfBirth: "1979-01-15",       → dateOfBirth
      gender: "Male",                  → gender
      phone: "+230 123 4567",          → phone
      address: "Port Louis",           → address
      weight: "75",                    → weight
      height: "175",                   → height
      medicalHistory: [...],           → medicalHistory
      currentMedications: "..."        → currentMedications
    }
  }
}

// Format 3: Fallback (vitalSigns only)
{
  vitalSigns: {
    weight: 75,                        → weight
    height: 175                        → height
  }
}
// Other fields remain empty
```

---

## 🛡️ Security & Data Handling

### SessionStorage Lifecycle

```
┌─────────────────────────────────────────────────────┐
│  Timeline of sessionStorage Keys                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  t=0  │ User in Consultation Hub                    │
│       │ sessionStorage: {}  (empty)                 │
│       │                                              │
│  t=1  │ User clicks "Nouvelle Consultation"         │
│       │ sessionStorage: {                            │
│       │   consultationPatientData: "{...}",         │
│       │   isExistingPatientConsultation: "true"     │
│       │ }                                            │
│       │                                              │
│  t=2  │ Navigation to /consultation                 │
│       │ (sessionStorage persists during navigation) │
│       │                                              │
│  t=3  │ /consultation page mounts                   │
│       │ useEffect reads sessionStorage              │
│       │                                              │
│  t=4  │ Data parsed and stored in React state       │
│       │ sessionStorage CLEANED UP:                  │
│       │ sessionStorage: {}  (empty again)           │
│       │                                              │
│  t=5+ │ User interacts with form                    │
│       │ Data lives in React state only              │
│       │ No persistent storage                       │
│       │                                              │
└─────────────────────────────────────────────────────┘

Benefits:
✓ Temporary bridge only (not persistent)
✓ Automatic cleanup after read
✓ No sensitive data left in browser
✓ No cross-tab interference
✓ Cleared on browser close
```

---

## 📈 Usage Statistics Tracking (Future Enhancement)

```typescript
// Potential analytics to add:

interface PrefillMetrics {
  totalPrefillUsage: number           // How many times used
  fieldsFilled: {                      // Which fields were pre-filled
    firstName: number
    lastName: number
    email: number
    phone: number
    // ... etc
  }
  fieldsEdited: {                      // Which fields users changed
    firstName: number
    lastName: number
    // ... etc
  }
  conversionRate: number               // % who complete workflow
  timesSaved: number                   // Estimated time saved (seconds)
}

// Track in analytics:
// - When prefill is triggered
// - Which fields are modified by user
// - Completion rate of full workflow
// - Time to complete vs non-prefilled
```

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Multiple Consultation Selection**
   ```
   Instead of always using most recent, allow user to select
   which consultation to extract data from:
   
   [x] 2024-11-01 - Diabetes Follow-up
   [ ] 2024-10-15 - Annual Check-up  ← Select this one
   [ ] 2024-09-20 - Hypertension Review
   ```

2. **Partial Prefill Options**
   ```
   Allow user to choose which data to prefill:
   
   [x] Demographics (name, age, gender)
   [x] Contact Info (phone, email, address)
   [ ] Medical History (let user re-enter)
   [ ] Current Medications (might have changed)
   ```

3. **Smart Update Detection**
   ```
   Highlight fields that have changed since last consultation:
   
   Weight: 75 kg → 78 kg ⚠️ (changed)
   BP: 120/80 → 140/90 ⚠️ (increased)
   ```

4. **Prefill from Tibok Data**
   ```
   If patient also exists in Tibok system, merge data:
   - Demographic from Tibok
   - Medical history from AI-DOCTOR
   - Best of both systems
   ```

---

## 📝 Developer Notes

### Adding New Prefill Fields

To add a new field to prefill:

1. **Update extraction** in `history-fetcher.ts`:
   ```typescript
   return {
     // ... existing fields
     newField: patient.newField || ''
   }
   ```

2. **Update storage** in `hub-workflow-selector.tsx`:
   ```typescript
   const prefillData = {
     // ... existing fields
     newField: demographics.newField || ''
   }
   ```

3. **Update merge** in `app/page.tsx`:
   ```typescript
   // Already handled automatically by spread operator
   data: { ...patientData, ...prefillData }
   ```

4. **Update form** in `patient-form.tsx`:
   ```typescript
   // Already handles new fields via data prop
   const [formData, setFormData] = useState(() => ({
     ...INITIAL_FORM_DATA,
     ...data  // newField will be included
   }))
   ```

### Debugging Tips

```typescript
// Add console logs at each stage:

// In hub-workflow-selector.tsx
console.log('📋 Demographics extracted:', demographics)
console.log('💾 Storing in sessionStorage:', prefillData)

// In app/page.tsx
console.log('📋 Loading from sessionStorage...')
console.log('✅ Prefill data loaded:', patientData)
console.log('🔄 Merged data:', { ...patientData, ...prefillData })

// In patient-form.tsx
console.log('📝 Form initialized with:', formData)
```

---

## ✅ Checklist for Production

- [x] Extraction function handles both data formats
- [x] SessionStorage cleanup implemented
- [x] Form editability preserved
- [x] Follow-up workflow unaffected
- [x] Console logs for debugging
- [x] Error handling for missing data
- [x] TypeScript types defined
- [x] Build passes without errors
- [x] Testing guide created
- [ ] User acceptance testing completed
- [ ] Performance testing done
- [ ] Security audit passed
- [ ] Documentation reviewed

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-16  
**Status**: ✅ Implemented and Ready for Testing
