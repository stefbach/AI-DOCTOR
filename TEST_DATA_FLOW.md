# TEST DATA FLOW - Current Medications

## Problem Reported by User
**"LE TRAITEMENT ACTUEL N EST PAS DU TOUT RECUPERER NULLE PART"**
- Current medications are NOT retrieved in ANY consultation type
- Not in general consultations
- Not in dermatology consultations  
- Not in chronic disease consultations

## Data Flow Analysis

### 1. Patient Form Collection ✅
**File**: `components/patient-form.tsx`
**Lines**: 428-444

```typescript
currentMedications: (() => {
  const parsed = data.currentMedicationsText 
    ? data.currentMedicationsText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    : []
  return parsed
})(),

current_medications: data.currentMedicationsText 
  ? data.currentMedicationsText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  : [],
```

**Status**: ✅ **CORRECT** - Creates both `currentMedications` and `current_medications` arrays

---

### 2. App Page Data Passing ✅
**File**: `app/page.tsx`
**Lines**: 417-427

```typescript
case 3:  // DiagnosisForm step
  return {
    ...commonProps,
    patientData,        // ✅ Passes entire patientData object
    clinicalData,
    questionsData,
    data: diagnosisData,
    onDataChange: setDiagnosisData,
    onNext: handleNext,
    onPrevious: handlePrevious,
  }
```

**Status**: ✅ **CORRECT** - Passes entire `patientData` to DiagnosisForm

---

### 3. Diagnosis Form API Call ✅
**File**: `components/diagnosis-form.tsx`
**Lines**: 796-810

```typescript
console.log("📡 Calling API /api/openai-diagnosis...")

const requestBody = {
  patientData,         // ✅ Sends entire patientData object
  clinicalData,
  questionsData: questionsData?.responses || [],
  language,
}

const response = await fetch("/api/openai-diagnosis", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
})
```

**Status**: ✅ **CORRECT** - Sends entire `patientData` object to API

---

### 4. OpenAI Diagnosis API Reception ❓
**File**: `app/api/openai-diagnosis/route.ts`
**Lines**: 2509-2545

```typescript
// Line 2509: Anonymizes patient data
const { anonymized: anonymizedPatientData, originalIdentity } = anonymizePatientData(body.patientData)

// Lines 2513-2515: DEBUG LOGS
console.log('   - body.patientData.currentMedications:', body.patientData?.currentMedications)
console.log('   - body.patientData.current_medications:', body.patientData?.current_medications)
console.log('   - body.patientData.currentMedicationsText:', body.patientData?.currentMedicationsText)

// Line 2529: Extracts current_medications for context
const patientContext: PatientContext = {
  // ...
  current_medications: anonymizedPatientData?.currentMedications || [],  // ⚠️ Uses currentMedications (plural)
  // ...
}

// Line 1144-1146: Formats for prompt
const currentMedsFormatted = patientContext.current_medications.length > 0 
  ? patientContext.current_medications.join(', ')
  : 'Aucun médicament actuel'
```

**Status**: ❓ **NEEDS INVESTIGATION** - 
- API expects `anonymizedPatientData.currentMedications` (line 2529)
- But patient-form sends both `currentMedications` AND `current_medications`
- **QUESTION**: Does `anonymizePatientData()` preserve these fields?

---

## 🔍 CRITICAL INVESTIGATION NEEDED

### Check `anonymizePatientData()` function
**Need to verify**:
1. Does `anonymizePatientData()` preserve the `currentMedications` field?
2. Does it preserve the `current_medications` field?
3. Or does it strip them out?

**Location**: Find this function in `app/api/openai-diagnosis/route.ts`

---

## Hypothesis

**Most Likely Cause**: The `anonymizePatientData()` function is NOT preserving the medication fields. It probably only preserves specific fields and strips out `currentMedications` and `current_medications`.

**Evidence**:
- User reports medications are not retrieved at ALL
- Frontend code looks correct
- API reception logic looks correct
- The only unknown is the anonymization step

**Next Step**: Read the `anonymizePatientData()` function to confirm.
