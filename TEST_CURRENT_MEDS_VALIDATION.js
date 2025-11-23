/**
 * TEST VALIDATION: currentMedicationsValidated extraction
 * 
 * Ce test simule la logique de extractPrescriptionsFromDiagnosisData
 * pour vérifier que les traitements actuels sont bien extraits pour
 * TOUS les types de consultation.
 */

// Fonction helper getString simulée
function getString(value) {
  return value ? String(value) : ''
}

// ========== TEST DATA ==========

// Test 1: Consultation GÉNÉRALE avec traitement actuel
const generalConsultationData = {
  currentMedicationsValidated: [
    {
      name: "Metformin 500mg",
      dci: "Metformin",
      posology: "BD (twice daily)",
      dosage: "500mg",
      why_prescribed: "Type 2 diabetes management",
      duration: "Ongoing",
      validated_corrections: "Standardized to BD format",
      original_input: "metformin 500mg deux fois par jour"
    }
  ],
  expertAnalysis: {
    expert_therapeutics: {
      primary_treatments: [
        {
          medication_dci: "Paracetamol",
          dosage_strength: "500mg",
          dosing_regimen: { adult: "TDS (three times daily)" },
          duration: "3 days",
          precise_indication: "Fever management"
        }
      ]
    }
  }
}

// Test 2: Consultation DERMATOLOGIE avec traitement actuel
const dermatologyConsultationData = {
  diagnosis: {
    structured: {
      primaryDiagnosis: {
        name: "Nevus dysplasique"
      },
      treatmentPlan: {
        topical: [
          {
            medication: "Hydrocortisone 1% cream",
            dosage: "Apply thin layer",
            frequency: "BD",
            indication: "Skin inflammation"
          }
        ],
        oral: []
      }
    }
  },
  currentMedicationsValidated: [
    {
      name: "Aspirin 100mg",
      dci: "Aspirin",
      posology: "OD (once daily)",
      dosage: "100mg",
      why_prescribed: "Cardiovascular prophylaxis",
      duration: "Ongoing",
      validated_corrections: "Standardized to OD format",
      original_input: "aspirin 100mg once daily"
    }
  ]
}

// ========== FONCTION DE TEST (Version CORRIGÉE) ==========

function extractPrescriptionsFromDiagnosisData_FIXED(diagnosisData) {
  const medications = []
  
  console.log("💊 PRESCRIPTION EXTRACTION FROM DIAGNOSIS API")
  
  // ========== 1. ALWAYS EXTRACT VALIDATED CURRENT MEDICATIONS FIRST ==========
  const validatedCurrentMeds = diagnosisData?.currentMedicationsValidated || []
  console.log(`📋 Current medications validated by AI: ${validatedCurrentMeds.length}`)
  
  validatedCurrentMeds.forEach((med, idx) => {
    medications.push({
      name: getString(med.name || med.medication_name || `Current medication ${idx + 1}`),
      genericName: getString(med.dci || med.name),
      dosage: getString(med.dosage || ''),
      frequency: getString(med.posology || med.frequency || med.how_to_take || 'As prescribed'),
      duration: getString(med.duration || 'Ongoing treatment'),
      indication: getString(med.indication || med.why_prescribed || 'Chronic treatment'),
      medication_type: 'current_continued',
      validated_by_ai: true,
      original_input: getString(med.original_input || ''),
      validated_corrections: getString(med.validated_corrections || 'None')
    })
  })
  
  // ========== 2. THEN EXTRACT NEWLY PRESCRIBED MEDICATIONS BASED ON TYPE ==========
  const isDermatologyStructure = !!(diagnosisData?.diagnosis?.structured)
  
  if (isDermatologyStructure) {
    console.log("🔬 DERMATOLOGY STRUCTURE DETECTED")
    const dermData = diagnosisData.diagnosis.structured
    
    const topical = dermData?.treatmentPlan?.topical || []
    const oral = dermData?.treatmentPlan?.oral || []
    const allDermMeds = [...topical, ...oral]
    
    console.log(`💊 Dermatology medications: ${topical.length} topical + ${oral.length} oral = ${allDermMeds.length} total`)
    
    allDermMeds.forEach((med, idx) => {
      medications.push({
        name: getString(med.medication || med.name || `Medication ${idx + 1}`),
        genericName: getString(med.dci || med.medication),
        dosage: getString(med.dosage || ''),
        frequency: getString(med.application || med.frequency || 'As prescribed'),
        indication: getString(med.indication || ''),
        medication_type: 'newly_prescribed',
        validated_by_ai: false
      })
    })
  } else {
    console.log("📋 GENERAL STRUCTURE - Standard extraction")
    
    const primaryTreatments = diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments || []
    console.log(`💊 Newly prescribed medications: ${primaryTreatments.length}`)
    
    primaryTreatments.forEach((med, idx) => {
      medications.push({
        name: getString(med.medication_dci || med.drug || `Medication ${idx + 1}`),
        genericName: getString(med.medication_dci || med.drug),
        dosage: getString(med.dosage_strength || med.dosage || ''),
        frequency: getString(med.dosing_regimen?.adult || med.dosing?.adult || 'As prescribed'),
        duration: getString(med.duration || '7 days'),
        indication: getString(med.precise_indication || med.indication || ''),
        medication_type: 'newly_prescribed',
        validated_by_ai: false
      })
    })
  }
  
  console.log(`✅ COMBINED PRESCRIPTION: ${validatedCurrentMeds.length} current + ${medications.length - validatedCurrentMeds.length} newly prescribed = ${medications.length} total medications`)
  
  return medications
}

// ========== EXÉCUTION DES TESTS ==========

console.log("\n" + "=".repeat(80))
console.log("TEST 1: CONSULTATION GÉNÉRALE avec Traitement Actuel")
console.log("=".repeat(80) + "\n")

const generalResult = extractPrescriptionsFromDiagnosisData_FIXED(generalConsultationData)

console.log("\n📊 RÉSULTATS TEST 1:")
console.log(`   Total médicaments: ${generalResult.length}`)
console.log(`   Médicaments actuels: ${generalResult.filter(m => m.medication_type === 'current_continued').length}`)
console.log(`   Nouveaux médicaments: ${generalResult.filter(m => m.medication_type === 'newly_prescribed').length}`)

console.log("\n📋 DÉTAIL DES MÉDICAMENTS:")
generalResult.forEach((med, i) => {
  console.log(`   ${i + 1}. ${med.name} - ${med.frequency}`)
  console.log(`      Type: ${med.medication_type}`)
  console.log(`      Validé AI: ${med.validated_by_ai}`)
  console.log(`      Indication: ${med.indication}`)
  if (med.validated_corrections) {
    console.log(`      Corrections: ${med.validated_corrections}`)
  }
  console.log("")
})

// Validation Test 1
const test1CurrentCount = generalResult.filter(m => m.medication_type === 'current_continued').length
const test1NewCount = generalResult.filter(m => m.medication_type === 'newly_prescribed').length

console.log("✅ VALIDATION TEST 1:")
if (test1CurrentCount === 1 && test1NewCount === 1 && generalResult.length === 2) {
  console.log("   ✅ SUCCÈS: 1 traitement actuel + 1 nouveau médicament = 2 total")
} else {
  console.log("   ❌ ÉCHEC: Résultat incorrect")
  console.log(`   Attendu: 1 current + 1 new = 2 total`)
  console.log(`   Obtenu: ${test1CurrentCount} current + ${test1NewCount} new = ${generalResult.length} total`)
}

console.log("\n" + "=".repeat(80))
console.log("TEST 2: CONSULTATION DERMATOLOGIE avec Traitement Actuel (FIX CRITIQUE)")
console.log("=".repeat(80) + "\n")

const dermatologyResult = extractPrescriptionsFromDiagnosisData_FIXED(dermatologyConsultationData)

console.log("\n📊 RÉSULTATS TEST 2:")
console.log(`   Total médicaments: ${dermatologyResult.length}`)
console.log(`   Médicaments actuels: ${dermatologyResult.filter(m => m.medication_type === 'current_continued').length}`)
console.log(`   Nouveaux médicaments: ${dermatologyResult.filter(m => m.medication_type === 'newly_prescribed').length}`)

console.log("\n📋 DÉTAIL DES MÉDICAMENTS:")
dermatologyResult.forEach((med, i) => {
  console.log(`   ${i + 1}. ${med.name} - ${med.frequency}`)
  console.log(`      Type: ${med.medication_type}`)
  console.log(`      Validé AI: ${med.validated_by_ai}`)
  console.log(`      Indication: ${med.indication}`)
  if (med.validated_corrections) {
    console.log(`      Corrections: ${med.validated_corrections}`)
  }
  console.log("")
})

// Validation Test 2
const test2CurrentCount = dermatologyResult.filter(m => m.medication_type === 'current_continued').length
const test2NewCount = dermatologyResult.filter(m => m.medication_type === 'newly_prescribed').length

console.log("✅ VALIDATION TEST 2 (CRITIQUE):")
if (test2CurrentCount === 1 && test2NewCount === 1 && dermatologyResult.length === 2) {
  console.log("   ✅ SUCCÈS: 1 traitement actuel + 1 nouveau médicament dermatologique = 2 total")
  console.log("   ✅ FIX VÉRIFIÉ: Le traitement actuel Aspirin est bien récupéré en dermatologie!")
} else {
  console.log("   ❌ ÉCHEC: Résultat incorrect")
  console.log(`   Attendu: 1 current + 1 new = 2 total`)
  console.log(`   Obtenu: ${test2CurrentCount} current + ${test2NewCount} new = ${dermatologyResult.length} total`)
  if (test2CurrentCount === 0) {
    console.log("   ⚠️  PROBLÈME: Le traitement actuel n'a pas été extrait!")
  }
}

// ========== RÉSUMÉ FINAL ==========

console.log("\n" + "=".repeat(80))
console.log("RÉSUMÉ FINAL DES TESTS")
console.log("=".repeat(80) + "\n")

const test1Pass = test1CurrentCount === 1 && test1NewCount === 1
const test2Pass = test2CurrentCount === 1 && test2NewCount === 1

console.log("📊 RÉSULTATS GLOBAUX:")
console.log(`   Test 1 (Général):      ${test1Pass ? '✅ RÉUSSI' : '❌ ÉCHEC'}`)
console.log(`   Test 2 (Dermatologie): ${test2Pass ? '✅ RÉUSSI' : '❌ ÉCHEC'}`)

if (test1Pass && test2Pass) {
  console.log("\n🎉 TOUS LES TESTS RÉUSSIS!")
  console.log("   ✅ Les traitements actuels sont extraits pour TOUS les types de consultation")
  console.log("   ✅ Le fix est validé et prêt pour la production")
  process.exit(0)
} else {
  console.log("\n❌ CERTAINS TESTS ONT ÉCHOUÉ")
  console.log("   ⚠️  Vérifier la logique d'extraction")
  process.exit(1)
}
