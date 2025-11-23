# Dermatology Workflow Testing Guide

## 🧪 How to Test the Fixes

### Test Scenario 1: Verify Medication Names Appear

**Steps**:
1. Start a new dermatology consultation
2. Upload skin images (e.g., melanoma, acne, eczema)
3. Answer all dermatology-specific questions
4. Wait for diagnosis generation
5. Navigate to professional report

**Expected Result** ✅:
- Medication section shows **medication names** (not just count)
- Each medication displays:
  - ✅ Nom (name): "Hydrocortisone 1% cream"
  - ✅ Dénomination commune (generic): "Hydrocortisone"
  - ✅ Dosage: "100mg" (for oral) or empty (for topical)
  - ✅ Forme: "cream" / "tablet"
  - ✅ Posologie: "BD" / "OD"
  - ✅ Mode d'administration: "Topical application" / "Oral route"
  - ✅ Durée du traitement: "7-14 days"

**Check Logs** (Browser Console → Network → dermatology-diagnosis → Response):
```json
{
  "medications": [
    {
      "nom": "Hydrocortisone 1% cream",      ← Should see French field names
      "denominationCommune": "Hydrocortisone",
      "posologie": "BD",
      ...
    }
  ]
}
```

---

### Test Scenario 2: Verify Laboratory Tests Count

**Steps**:
1. Complete dermatology consultation (as above)
2. Check diagnosis section for recommended investigations
3. Navigate to professional report
4. Check investigations section

**Expected Result** ✅:
- Investigations section shows:
  - ✅ Laboratory tests: **2-4 tests** (should match diagnosis count)
  - ✅ Each test has name and indication
  - ✅ Imaging tests: **1-2 tests** (dermoscopy, etc.)

**Check Logs** (Browser Console → Network):

**dermatology-diagnosis Response**:
```json
{
  "expertAnalysis": {
    "expert_investigations": {
      "immediate_priority": [
        {
          "examination": "Complete Blood Count",
          "category": "Laboratory",       ← Check category is correct
          "urgency": "routine",
          "indication": "..."
        }
      ]
    }
  }
}
```

**generate-consultation-report Logs** (Browser Console):
```
✅ DERMATOLOGY: Using top-level expertAnalysis (NORMALIZED FORMAT)
   - Investigations extracted: 5
   - Categories: Laboratory, Laboratory, Imaging, Dermatology, Laboratory
   - Laboratory: 3, Imaging: 1, Dermatology: 1

📊 DERMATOLOGY TESTS CATEGORIZED: 4 lab, 1 imaging
```

---

### Test Scenario 3: Verify Different Medication Types

**Test Case 3a: Topical Medications**
- Upload images of eczema or contact dermatitis
- Expected: Topical cream/ointment prescribed
- Check: `forme: "cream"`, `modeAdministration: "Topical application"`

**Test Case 3b: Oral Medications**
- Upload images of severe acne or systemic condition
- Expected: Oral antibiotics or anti-inflammatories
- Check: `forme: "tablet"`, `modeAdministration: "Oral route"`, `dosage: "100mg"`

**Test Case 3c: Mixed (Topical + Oral)**
- Upload images of moderate-severe acne
- Expected: Both topical (benzoyl peroxide) and oral (doxycycline)
- Check: Array contains both types with correct fields

---

### Test Scenario 4: Verify Current Medications

**Setup**:
1. In patient data, add current medications:
   ```json
   {
     "currentMedications": [
       {
         "nom": "Aspirin 100mg",
         "denominationCommune": "Aspirin",
         "dosage": "100mg",
         "posologie": "OD"
       }
     ]
   }
   ```

**Expected Result** ✅:
- `currentMedicationsValidated` should show 1+ medications
- Combined prescription should include both current + new medications

**If currentMedicationsValidated = 0**:
- Check if patient has no current medications (valid scenario)
- Or investigate GPT-4 prompt for current medication validation

---

## 🔍 Debugging Checklist

### If Medication Names Still Missing:

1. **Check dermatology-diagnosis Response** (Browser → Network):
   - ✅ Does `medications` array exist at top level?
   - ✅ Does first medication have `nom` field (not `medication`)?
   - ✅ Does first medication have `denominationCommune` field (not `dci`)?

2. **Check generate-consultation-report Logs**:
   - ✅ Does it say "Using top-level medications array"?
   - ❌ If it says "Falling back to nested treatmentPlan" → Check why top-level is empty

3. **Check professional-report State**:
   - Open React DevTools
   - Find ProfessionalReport component
   - Check `diagnosisData.medications` array
   - Verify each medication has French field names

---

### If Laboratory Tests Show 0:

1. **Check dermatology-diagnosis Response**:
   - ✅ Does `expertAnalysis.expert_investigations.immediate_priority` exist?
   - ✅ Does it contain investigations with `category: "Laboratory"`?

2. **Check generate-consultation-report Logs**:
   - ✅ Does it say "Using top-level expertAnalysis"?
   - ✅ Does "Investigations extracted" count match diagnosis count?
   - ✅ Check "DERMATOLOGY: Categorizing X investigations" logs
   - ✅ Verify each test is categorized correctly

3. **Check Categorization Logic**:
   - Look for: "Categorized as LABORATORY TEST"
   - If test is categorized as IMAGING instead, check why
   - Verify `test.category` field is exactly "Laboratory" (case-sensitive)

---

## 📊 Expected vs Actual

### Medications:

| Metric | Before Fix | After Fix | Your Result |
|--------|------------|-----------|-------------|
| Medication count | 2 | 2 | ? |
| Medication names visible | ❌ No | ✅ Yes | ? |
| French field names | ❌ No | ✅ Yes | ? |
| Dosage information | ❌ Missing | ✅ Present | ? |
| Administration route | ❌ Missing | ✅ Present | ? |

### Investigations:

| Metric | Before Fix | After Fix | Your Result |
|--------|------------|-----------|-------------|
| Lab tests (diagnosis) | 2 | 2 | ? |
| Lab tests (report) | 0 | 2 | ? |
| Imaging tests | 1 | 1 | ? |
| Test names visible | Partial | ✅ Yes | ? |
| Correct categorization | ❌ No | ✅ Yes | ? |

---

## 🚨 Common Issues and Solutions

### Issue 1: "Medications array is empty"
**Cause**: GPT-4 didn't generate treatmentPlan
**Solution**: Check GPT-4 response, verify prompt includes treatment section

### Issue 2: "Still seeing English field names"
**Cause**: Transformation code not applied
**Solution**: Verify commit 84bc627 is deployed, check logs for transformation messages

### Issue 3: "Lab tests still showing 0"
**Cause**: Extraction checking nested structure before top-level
**Solution**: Verify extraction priority order in generate-consultation-report

### Issue 4: "Top-level normalized fields don't exist"
**Cause**: Old API response cached or not normalized
**Solution**: Clear cache, restart API, verify dermatology-diagnosis returns normalized structure

---

## 📝 Test Report Template

```markdown
## Dermatology Workflow Test Report

**Date**: 2025-11-23
**Tester**: [Your Name]
**Commit**: 84bc627

### Test Results:

#### Medications:
- [ ] Medication names appear in report
- [ ] French field names used (nom, denominationCommune, posologie)
- [ ] Topical medications have correct forme (cream/ointment)
- [ ] Oral medications have correct dosage (mg)
- [ ] All medication details visible

**Medication Count**:
- Diagnosis: ___
- Report: ___
- Match: Yes / No

**Sample Medication Fields**:
- nom: _______________
- denominationCommune: _______________
- posologie: _______________

#### Investigations:
- [ ] Laboratory tests count matches diagnosis
- [ ] Imaging tests displayed correctly
- [ ] Test names visible
- [ ] Correct categorization (lab vs imaging vs dermatology)

**Investigation Count**:
- Lab (diagnosis): ___
- Lab (report): ___
- Imaging (diagnosis): ___
- Imaging (report): ___
- Match: Yes / No

#### Logs:
- [ ] dermatology-diagnosis shows "Medications transformed"
- [ ] generate-consultation-report shows "Using top-level medications"
- [ ] generate-consultation-report shows "Using top-level expertAnalysis"
- [ ] Categorization logs show correct assignments

#### Issues Found:
1. _______________________________________________
2. _______________________________________________

#### Overall Status:
- [ ] All tests pass ✅
- [ ] Some issues found ⚠️
- [ ] Critical issues ❌
```

---

## 🎯 Success Criteria

The dermatology workflow is **FIXED** when:

1. ✅ Medication names appear in professional report
2. ✅ All medication fields display correctly (French format)
3. ✅ Laboratory tests count matches diagnosis count
4. ✅ Investigations categorized correctly (lab, imaging, dermatology)
5. ✅ Logs show "Using top-level normalized format"
6. ✅ No fallback to nested structure (unless testing backward compatibility)

---

*Generated: 2025-11-23*
*Test with commit: 84bc627*
