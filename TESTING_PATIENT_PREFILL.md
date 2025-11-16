# Testing Guide: Full Consultation with Patient Prefill

## Overview
This guide helps you test the new feature that allows doctors to perform a **full consultation** (with AI questions and complete diagnosis) for an **existing patient**, with automatic pre-filling of demographic data.

---

## Prerequisites

1. **Database with existing patient consultations**
   - At least one patient with a previous consultation saved in Supabase
   - Patient should have complete demographics (name, age, gender, phone, etc.)

2. **Access to Consultation Hub**
   - Navigate to `/consultation-hub`

---

## Test Scenario 1: Basic Patient Prefill

### Steps

1. **Navigate to Consultation Hub**
   ```
   URL: /consultation-hub
   ```

2. **Search for Existing Patient**
   - Enter patient name, email, or phone number
   - Click "Rechercher"
   - System should display patient history

3. **Review Patient Information**
   - Verify patient name is displayed correctly
   - Check number of previous consultations
   - Review last consultation date and type

4. **Select "Nouvelle Consultation"**
   - **IMPORTANT**: Choose "Nouvelle Consultation" option
   - **NOT** "Suivi" (Follow-up)
   - System should redirect to `/consultation`

5. **Verify PatientForm Prefill**
   - Check that the following fields are auto-filled:
     - ✅ First Name (`firstName`)
     - ✅ Last Name (`lastName`)
     - ✅ Date of Birth (`birthDate`)
     - ✅ Age (`age`)
     - ✅ Gender (`gender`)
     - ✅ Phone (`phone`)
     - ✅ Email (`email`)
     - ✅ Address (`address`)
     - ✅ Weight (`weight`)
     - ✅ Height (`height`)
     - ✅ Allergies (`allergies`)
     - ✅ Medical History (`medicalHistory`)
     - ✅ Current Medications (`currentMedicationsText`)

6. **Test Editability**
   - Modify one or more pre-filled fields
   - Verify changes are preserved
   - Click "Next" to proceed

7. **Complete Full Workflow**
   - **Step 1**: Patient Info (pre-filled) → Next
   - **Step 2**: Clinical Data (enter chief complaint, symptoms) → Next
   - **Step 3**: AI Questions (answer generated questions) → Next
   - **Step 4**: Diagnosis (review and validate) → Next
   - **Step 5**: Professional Report (full report generated)

8. **Verify Report Generation**
   - Report should use `/api/generate-consultation-report`
   - Report should be **complete** (not simplified)
   - Should include all sections:
     - Patient Demographics
     - Clinical Evaluation
     - AI-Generated Questions & Answers
     - Diagnosis & Differential Diagnosis
     - Treatment Plan (Medications, Lab Tests, Imaging)
     - Follow-up Plan

---

## Test Scenario 2: Missing Fields Handling

### Purpose
Verify system handles patients with incomplete demographic data gracefully.

### Steps

1. Search for patient with **partial data** (e.g., missing allergies or medical history)
2. Select "Nouvelle Consultation"
3. Navigate to `/consultation`
4. **Verify**:
   - Fields with data are pre-filled
   - Empty fields remain empty (not "undefined" or "null")
   - Form is still functional and can be submitted

### Expected Behavior
- Missing fields should be **empty strings** or **empty arrays**
- No JavaScript errors in console
- User can fill in missing information manually

---

## Test Scenario 3: Data Format Compatibility

### Purpose
Test both Mauritian (French) and English report formats.

### Test Case A: Mauritian Format (`compteRendu`)

1. Search patient with consultation saved in **French format**
2. Select "Nouvelle Consultation"
3. **Verify extraction**:
   - `nomComplet` → `fullName`
   - `prenom` → `firstName`
   - `nom` → `lastName`
   - `dateNaissance` → `dateOfBirth`
   - `sexe` → `gender`
   - `telephone` → `phone`
   - `adresse` → `address`
   - `poids` → `weight`
   - `taille` → `height`
   - `antecedentsMedicaux` → `medicalHistory`

### Test Case B: English Format (`medicalReport`)

1. Search patient with consultation saved in **English format**
2. Select "Nouvelle Consultation"
3. **Verify extraction**:
   - All English field names extracted correctly
   - No transformation errors

---

## Test Scenario 4: SessionStorage Cleanup

### Purpose
Ensure sessionStorage is properly cleaned up and doesn't interfere with other workflows.

### Steps

1. **Before Navigation**
   - Open browser DevTools → Application → Session Storage
   - Verify `consultationPatientData` and `isExistingPatientConsultation` **do not exist**

2. **After Selecting "Nouvelle Consultation"**
   - Check Session Storage **immediately after** clicking button
   - Keys should exist **briefly** before redirect

3. **After Page Load**
   - On `/consultation` page, check Session Storage
   - Keys should be **removed** after data is loaded
   - Verify console log: `"✅ Prefill data loaded:"`

4. **Refresh Page Test**
   - Refresh `/consultation` page
   - Verify prefill data is **NOT** loaded again
   - Form should be empty (normal behavior)

---

## Test Scenario 5: Follow-Up vs Full Consultation

### Purpose
Ensure follow-up workflow is **not affected** by the new feature.

### Steps

1. Search existing patient
2. Select **"Suivi"** (Follow-up) option
3. Navigate to follow-up page (e.g., `/follow-up/normal`)
4. **Verify**:
   - sessionStorage **NOT** set (no prefill keys)
   - Follow-up workflow functions normally
   - No interference from new feature

---

## Console Logs to Monitor

When testing, watch for these console messages:

### In `hub-workflow-selector.tsx`:
```
📋 Preparing patient data for prefill...
✅ Demographics extracted: {...}
💾 Prefill data stored in sessionStorage
```

### In `app/page.tsx`:
```
📋 Loading prefill data from sessionStorage...
✅ Prefill data loaded: {...}
```

### Expected Errors (should NOT appear):
```
❌ Error loading prefill data
⚠️ Could not extract demographics from consultation history
```

---

## Edge Cases to Test

### 1. **Patient with Multiple Consultations**
- Most recent consultation data should be used
- Verify by checking dates

### 2. **Patient with Array vs String Fields**
- Allergies: Can be `["Penicillin", "Aspirin"]` or `"Penicillin, Aspirin"`
- Medical History: Can be array or string
- Both formats should work

### 3. **Special Characters in Names**
- Names with accents (é, è, ç)
- Hyphenated names
- Multiple spaces

### 4. **Date Format Variations**
- `YYYY-MM-DD`
- `DD/MM/YYYY`
- ISO 8601 format
- All should be handled correctly

---

## Performance Checks

1. **Navigation Speed**
   - From Consultation Hub → Consultation should be fast
   - No noticeable delay from sessionStorage read

2. **Memory Leaks**
   - SessionStorage cleaned up after use
   - No persistent data accumulation

3. **Browser Compatibility**
   - Test in Chrome, Firefox, Safari
   - SessionStorage support is universal

---

## Rollback Plan

If issues are found:

1. **Disable Prefill** (Quick Fix)
   ```typescript
   // In hub-workflow-selector.tsx, comment out storage logic
   // if (!selectedPath.includes('/follow-up') && consultationHistory.length > 0) {
   //   ... sessionStorage.setItem(...)
   // }
   ```

2. **Revert Commit**
   ```bash
   git revert 5b1dc27
   ```

3. **Feature Flag** (Future Enhancement)
   - Add environment variable `ENABLE_PATIENT_PREFILL`
   - Check before enabling feature

---

## Success Criteria

✅ All test scenarios pass without errors  
✅ Patient data pre-fills correctly  
✅ Data remains editable  
✅ Full workflow completes successfully  
✅ Follow-up workflow unaffected  
✅ SessionStorage cleaned up properly  
✅ No console errors  
✅ No memory leaks  
✅ Compatible with both data formats  

---

## Known Limitations

1. **Only works from Consultation Hub**
   - Direct navigation to `/consultation` won't have prefill
   - This is by design (normal behavior for new patients)

2. **Most Recent Consultation Only**
   - Uses first item in consultation history array
   - Could be enhanced to allow selection in future

3. **sessionStorage Only**
   - Data not persisted across browser sessions
   - Closing tab clears the data
   - This is intentional for security

---

## Reporting Issues

If you find bugs, please report with:

1. **Browser and Version** (e.g., Chrome 120)
2. **Console Error Messages** (full stack trace)
3. **Steps to Reproduce**
4. **Expected vs Actual Behavior**
5. **Patient Data Format** (Mauritian or English)
6. **Screenshots** (if applicable)

---

## Additional Notes

- This feature is **backward compatible**
- Existing workflows remain unchanged
- No database schema changes required
- Works with existing patient data
- No API changes needed

---

**Last Updated**: 2025-11-16  
**Feature Version**: 1.0.0  
**Tested By**: [Your Name]  
**Status**: ✅ Ready for Testing
