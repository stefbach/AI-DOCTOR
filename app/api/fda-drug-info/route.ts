import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 FDA Drug Info API - Début")

    let requestData: {
      medications?: string[]
      drugName?: string
    }

    try {
      requestData = await request.json()
      console.log("📝 Médicaments reçus FDA:", requestData.medications || requestData.drugName)
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON FDA:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { medications = [], drugName } = requestData

    // Normalisation des médicaments
    let drugList: string[] = []
    if (medications && Array.isArray(medications)) {
      drugList = medications.filter(Boolean)
    } else if (drugName && typeof drugName === "string") {
      drugList = [drugName]
    } else if (medications && typeof medications === "string") {
      drugList = [medications]
    }

    if (drugList.length === 0) {
      console.log("⚠️ Aucun médicament fourni")
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        drugs: [],
        metadata: {
          totalDrugs: 0,
          source: "FDA OpenFDA (simulé)",
          message: "Aucun médicament fourni",
        },
      })
    }

    console.log(`🔍 Recherche FDA pour: ${drugList.join(", ")}`)

    // Recherche d'informations FDA
    const drugInfos = searchFDADrugInfo(drugList)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      drugs: drugInfos,
      medications: drugInfos, // Ajouter cette ligne pour compatibilité
      metadata: {
        totalDrugs: drugInfos.length,
        searchedMedications: drugList,
        source: "FDA OpenFDA (simulé)",
        searchDate: new Date().toISOString(),
        disclaimer: "Données simulées à des fins de démonstration",
      },
    }

    console.log(`✅ ${drugInfos.length} médicaments FDA trouvés`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur FDA API:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la recherche FDA",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function searchFDADrugInfo(medications: string[]) {
  // Base de données FDA simulée
  const fdaDatabase = {
    // Antihypertenseurs
    amlodipine: {
      genericName: "Amlodipine",
      brandNames: ["Norvasc", "Amlor"],
      drugClass: "Calcium Channel Blocker",
      indications: ["Hypertension", "Angina"],
      contraindications: ["Hypersensibilité à l'amlodipine", "Choc cardiogénique"],
      sideEffects: ["Œdème périphérique", "Fatigue", "Palpitations", "Flush"],
      interactions: ["Simvastatine (risque de myopathie)", "Ciclosporine"],
      dosage: "5-10 mg une fois par jour",
      warnings: ["Surveillance de la fonction hépatique", "Risque d'hypotension"],
      fdaApprovalDate: "1987-07-31",
      pregnancyCategory: "C",
    },
    lisinopril: {
      genericName: "Lisinopril",
      brandNames: ["Prinivil", "Zestril"],
      drugClass: "ACE Inhibitor",
      indications: ["Hypertension", "Insuffisance cardiaque", "Post-infarctus"],
      contraindications: ["Grossesse", "Antécédent d'angio-œdème", "Sténose artérielle rénale bilatérale"],
      sideEffects: ["Toux sèche", "Hyperkaliémie", "Hypotension", "Angio-œdème"],
      interactions: ["Diurétiques épargneurs de potassium", "AINS", "Lithium"],
      dosage: "10-40 mg une fois par jour",
      warnings: ["Surveillance de la fonction rénale", "Contrôle de la kaliémie"],
      fdaApprovalDate: "1987-12-29",
      pregnancyCategory: "D",
    },

    // Antidiabétiques
    metformin: {
      genericName: "Metformin",
      brandNames: ["Glucophage", "Stagid"],
      drugClass: "Biguanide",
      indications: ["Diabète type 2"],
      contraindications: ["Insuffisance rénale sévère", "Acidose métabolique", "Insuffisance cardiaque sévère"],
      sideEffects: ["Troubles digestifs", "Diarrhée", "Nausées", "Goût métallique"],
      interactions: ["Produits de contraste iodés", "Alcool"],
      dosage: "500-2000 mg par jour en 2-3 prises",
      warnings: ["Surveillance de la fonction rénale", "Risque d'acidose lactique"],
      fdaApprovalDate: "1994-12-29",
      pregnancyCategory: "B",
    },

    // Antibiotiques
    amoxicillin: {
      genericName: "Amoxicillin",
      brandNames: ["Amoxil", "Clamoxyl"],
      drugClass: "Beta-lactam Antibiotic",
      indications: ["Infections bactériennes", "Pneumonie", "Otite", "Sinusite"],
      contraindications: ["Allergie aux pénicillines", "Mononucléose infectieuse"],
      sideEffects: ["Diarrhée", "Nausées", "Rash cutané", "Candidose"],
      interactions: ["Méthotrexate", "Warfarine"],
      dosage: "250-500 mg toutes les 8 heures",
      warnings: ["Risque de colite pseudomembraneuse", "Surveillance des signes allergiques"],
      fdaApprovalDate: "1974-01-18",
      pregnancyCategory: "B",
    },

    // Anti-inflammatoires
    ibuprofen: {
      genericName: "Ibuprofen",
      brandNames: ["Advil", "Nurofen", "Brufen"],
      drugClass: "NSAID",
      indications: ["Douleur", "Inflammation", "Fièvre"],
      contraindications: ["Ulcère gastroduodénal actif", "Insuffisance cardiaque sévère", "Grossesse (3e trimestre)"],
      sideEffects: ["Troubles digestifs", "Ulcération gastrique", "Rétention hydrosodée"],
      interactions: ["Anticoagulants", "IEC", "Diurétiques", "Méthotrexate"],
      dosage: "400-800 mg toutes les 6-8 heures",
      warnings: ["Surveillance digestive", "Risque cardiovasculaire", "Fonction rénale"],
      fdaApprovalDate: "1961-09-13",
      pregnancyCategory: "C/D",
    },

    // Statines
    atorvastatin: {
      genericName: "Atorvastatin",
      brandNames: ["Lipitor", "Tahor"],
      drugClass: "HMG-CoA Reductase Inhibitor",
      indications: ["Hypercholestérolémie", "Prévention cardiovasculaire"],
      contraindications: ["Maladie hépatique active", "Grossesse", "Allaitement"],
      sideEffects: ["Myalgie", "Élévation des transaminases", "Troubles digestifs"],
      interactions: ["Ciclosporine", "Gemfibrozil", "Inhibiteurs du CYP3A4"],
      dosage: "10-80 mg une fois par jour le soir",
      warnings: ["Surveillance hépatique", "Risque de rhabdomyolyse"],
      fdaApprovalDate: "1996-12-17",
      pregnancyCategory: "X",
    },

    // Antidépresseurs
    sertraline: {
      genericName: "Sertraline",
      brandNames: ["Zoloft", "Lustral"],
      drugClass: "SSRI",
      indications: ["Dépression", "Troubles anxieux", "TOC"],
      contraindications: ["IMAO", "Pimozide", "Hypersensibilité"],
      sideEffects: ["Nausées", "Insomnie", "Somnolence", "Dysfonction sexuelle"],
      interactions: ["IMAO", "Warfarine", "Tramadol"],
      dosage: "50-200 mg une fois par jour",
      warnings: ["Risque suicidaire", "Syndrome sérotoninergique", "Sevrage progressif"],
      fdaApprovalDate: "1991-12-30",
      pregnancyCategory: "C",
    },

    // Anticoagulants
    warfarin: {
      genericName: "Warfarin",
      brandNames: ["Coumadin", "Warfilone"],
      drugClass: "Vitamin K Antagonist",
      indications: ["Fibrillation auriculaire", "Thrombose veineuse", "Embolie pulmonaire"],
      contraindications: ["Hémorragie active", "Grossesse", "HTA sévère non contrôlée"],
      sideEffects: ["Hémorragie", "Nécrose cutanée", "Alopécie"],
      interactions: ["AINS", "Antibiotiques", "Amiodarone", "Alcool"],
      dosage: "2-10 mg par jour selon INR",
      warnings: ["Surveillance INR régulière", "Risque hémorragique", "Interactions nombreuses"],
      fdaApprovalDate: "1954-04-14",
      pregnancyCategory: "X",
    },
  }

  const results = []

  for (const medication of medications) {
    const drugKey = medication.toLowerCase().trim()

    // Recherche exacte
    if (fdaDatabase[drugKey]) {
      results.push({
        searchTerm: medication,
        found: true,
        ...fdaDatabase[drugKey],
        lastUpdated: new Date().toISOString(),
        fdaUrl: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${Math.floor(Math.random() * 999999)}`,
      })
      continue
    }

    // Recherche partielle
    let found = false
    for (const [key, drugInfo] of Object.entries(fdaDatabase)) {
      if (
        key.includes(drugKey) ||
        drugKey.includes(key) ||
        drugInfo.brandNames.some((brand) => brand.toLowerCase().includes(drugKey))
      ) {
        results.push({
          searchTerm: medication,
          found: true,
          ...drugInfo,
          matchType: "partial",
          lastUpdated: new Date().toISOString(),
          fdaUrl: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${Math.floor(Math.random() * 999999)}`,
        })
        found = true
        break
      }
    }

    // Si aucune correspondance trouvée
    if (!found) {
      results.push({
        searchTerm: medication,
        found: false,
        message: `Aucune information FDA trouvée pour ${medication}`,
        suggestions: ["Vérifier l'orthographe", "Utiliser le nom générique", "Consulter la base FDA directement"],
        fdaSearchUrl: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm`,
      })
    }
  }

  return results
}
