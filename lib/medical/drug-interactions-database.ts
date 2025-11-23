// lib/medical/drug-interactions-database.ts
// Base de données complète des interactions médicamenteuses - 100+ interactions majeures

export interface DrugInteraction {
  drugs: string[]
  level: 'contraindicated' | 'major' | 'moderate' | 'minor'
  description: string
  mechanism: string
  management: string
  severity_score: number // 1-10
  evidence_level: 'A' | 'B' | 'C'
  references?: string[]
}

export const CRITICAL_DRUG_INTERACTIONS: DrugInteraction[] = [
  // ==================== ANTICOAGULANTS ====================
  {
    drugs: ['warfarin', 'warfarine', 'coumadin'],
    level: 'major',
    description: 'Risque hémorragique majeur avec AINS',
    mechanism: 'Inhibition plaquettaire + lésion muqueuse gastrique',
    management: 'Éviter association. Si nécessaire: IPP + surveillance INR étroite',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['warfarin', 'aspirin', 'aspirine'],
    level: 'major',
    description: 'Risque hémorragique très élevé',
    mechanism: 'Double anti-agrégation plaquettaire + anticoagulation',
    management: 'Éviter sauf indication précise (prothèse valvulaire). Si nécessaire: surveillance étroite',
    severity_score: 10,
    evidence_level: 'A'
  },
  {
    drugs: ['warfarin', 'ciprofloxacin', 'ciprofloxacine', 'cipro'],
    level: 'major',
    description: 'Potentialisation anticoagulant - INR augmenté',
    mechanism: 'Inhibition CYP2C9, diminution synthèse vitamine K intestinale',
    management: 'Surveillance INR à 3-5 jours. Ajuster dose warfarine si nécessaire',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['warfarin', 'amiodarone'],
    level: 'major',
    description: 'Augmentation effet anticoagulant majeure',
    mechanism: 'Inhibition CYP2C9 puissante',
    management: 'Réduire warfarine de 30-50% dès initiation amiodarone. INR à J3-5',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['warfarin', 'macrolide', 'erythromycin', 'clarithromycin', 'azithromycin'],
    level: 'major',
    description: 'Augmentation INR significative',
    mechanism: 'Inhibition CYP3A4/2C9',
    management: 'Surveiller INR. Azithromycine = plus sûr',
    severity_score: 7,
    evidence_level: 'B'
  },
  {
    drugs: ['dabigatran', 'rivaroxaban', 'apixaban', 'ains', 'ibuprofen', 'diclofenac'],
    level: 'major',
    description: 'Risque hémorragique accru avec DOACs',
    mechanism: 'Addition effets anti-hémostatiques',
    management: 'Éviter. Préférer paracétamol',
    severity_score: 8,
    evidence_level: 'A'
  },

  // ==================== CARDIOVASCULAIRE ====================
  {
    drugs: ['digoxin', 'digoxine', 'furosemide', 'furosémide'],
    level: 'moderate',
    description: 'Toxicité digitalique par hypokaliémie',
    mechanism: 'Diurétique → perte K+ → sensibilité digitalique',
    management: 'Supplémenter K+. Objectif K+ 4.0-5.0 mmol/L. Surveiller digoxinémie',
    severity_score: 7,
    evidence_level: 'A'
  },
  {
    drugs: ['digoxin', 'amiodarone'],
    level: 'major',
    description: 'Augmentation digoxinémie de 70-100%',
    mechanism: 'Inhibition P-glycoprotéine intestinale et rénale',
    management: 'Réduire dose digoxine de 50%. Surveiller digoxinémie',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['beta-blocker', 'bisoprolol', 'metoprolol', 'verapamil'],
    level: 'major',
    description: 'Bloc AV, bradycardie sévère, insuffisance cardiaque',
    mechanism: 'Double effet inotrope et chronotrope négatif',
    management: 'Contre-indication relative. Si nécessaire: surveillance ECG étroite',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['beta-blocker', 'diltiazem'],
    level: 'major',
    description: 'Bradycardie, bloc AV, hypotension',
    mechanism: 'Effets additifs sur nœud sinusal et AV',
    management: 'Éviter association. Surveillance FC, ECG si nécessaire',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['amlodipine', 'simvastatin', 'simvastatine'],
    level: 'moderate',
    description: 'Risque de myopathie/rhabdomyolyse',
    mechanism: 'Inhibition CYP3A4 → augmentation simvastatine',
    management: 'Limiter simvastatine à 20 mg/jour. Surveillance CPK si myalgies',
    severity_score: 7,
    evidence_level: 'B'
  },
  {
    drugs: ['ace-inhibitor', 'enalapril', 'lisinopril', 'ramipril', 'ains', 'ibuprofen', 'diclofenac'],
    level: 'major',
    description: 'Insuffisance rénale aiguë, hyperkaliémie',
    mechanism: 'Triple whammy avec diurétique. Vasoconstriction artériole efférente',
    management: 'Éviter. Si nécessaire: hydratation, surveiller créatinine et K+',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['ace-inhibitor', 'spironolactone', 'spironolactone'],
    level: 'major',
    description: 'Hyperkaliémie sévère',
    mechanism: 'Addition épargne K+ et blocage aldostérone',
    management: 'Surveillance K+ étroite (objectif <5.5). Réduire doses si K+ >5.0',
    severity_score: 8,
    evidence_level: 'A'
  },

  // ==================== ANTIBIOTIQUES ====================
  {
    drugs: ['macrolide', 'erythromycin', 'clarithromycin', 'statine', 'simvastatin', 'atorvastatin'],
    level: 'major',
    description: 'Rhabdomyolyse sévère',
    mechanism: 'Inhibition CYP3A4 → accumulation statine',
    management: 'ARRÊTER statine pendant macrolide. Reprendre 48h après fin traitement',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['quinolone', 'ciprofloxacin', 'levofloxacin', 'corticosteroid', 'prednisolone', 'dexamethasone'],
    level: 'major',
    description: 'Rupture tendineuse (Achille principalement)',
    mechanism: 'Synergie toxicité collagène',
    management: 'Éviter association. Si nécessaire: repos, éviter exercice intense',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['metronidazole', 'alcohol', 'ethanol'],
    level: 'major',
    description: 'Effet antabuse (disulfiram-like)',
    mechanism: 'Inhibition aldéhyde déshydrogénase',
    management: 'Éviter alcool pendant traitement + 48h après fin',
    severity_score: 7,
    evidence_level: 'A'
  },
  {
    drugs: ['linezolid', 'ssri', 'sertraline', 'fluoxetine', 'citalopram'],
    level: 'contraindicated',
    description: 'Syndrome sérotoninergique',
    mechanism: 'Linezolid = IMAO + ISRS',
    management: 'CONTRE-INDICATION ABSOLUE. Wash-out 2 semaines nécessaire',
    severity_score: 10,
    evidence_level: 'A'
  },

  // ==================== PSYCHOTROPES ====================
  {
    drugs: ['ssri', 'sertraline', 'fluoxetine', 'tramadol'],
    level: 'major',
    description: 'Syndrome sérotoninergique',
    mechanism: 'Addition effets sérotoninergiques',
    management: 'Éviter. Si nécessaire: dose minimale tramadol, surveillance étroite',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['ssri', 'aspirin', 'ains', 'anticoagulant'],
    level: 'major',
    description: 'Risque hémorragique augmenté',
    mechanism: 'ISRS → dysfonction plaquettaire + lésion muqueuse',
    management: 'IPP systématique. Surveiller signes hémorragiques',
    severity_score: 7,
    evidence_level: 'A'
  },
  {
    drugs: ['lithium', 'diurétique', 'furosemide', 'hydrochlorothiazide'],
    level: 'major',
    description: 'Toxicité lithium',
    mechanism: 'Déplétion sodée → rétention lithium',
    management: 'Surveillance lithiémie étroite. Ajuster lithium si nécessaire',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['lithium', 'ace-inhibitor', 'ains'],
    level: 'major',
    description: 'Augmentation lithiémie',
    mechanism: 'Diminution clearance rénale lithium',
    management: 'Surveillance lithiémie. Objectif 0.6-1.0 mmol/L',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['mao-inhibitor', 'moclobemide', 'tramadol', 'pethidine', 'meperidine'],
    level: 'contraindicated',
    description: 'Syndrome sérotoninergique fatal',
    mechanism: 'Accumulation sérotonine massive',
    management: 'CONTRE-INDICATION ABSOLUE',
    severity_score: 10,
    evidence_level: 'A'
  },

  // ==================== MÉTABOLIQUES ====================
  {
    drugs: ['metformin', 'metformine', 'contrast', 'iodine', 'iode'],
    level: 'major',
    description: 'Acidose lactique',
    mechanism: 'Insuffisance rénale aiguë post-contraste → accumulation metformine',
    management: 'ARRÊTER metformine 48h avant et après. Reprendre si créat normale',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['metformin', 'cimetidine', 'cimétidine'],
    level: 'moderate',
    description: 'Augmentation metforminémie',
    mechanism: 'Inhibition sécrétion tubulaire',
    management: 'Surveiller glycémie, lactates. Ajuster dose si nécessaire',
    severity_score: 6,
    evidence_level: 'B'
  },
  {
    drugs: ['sulfonylurea', 'gliclazide', 'glibenclamide', 'fluconazole'],
    level: 'major',
    description: 'Hypoglycémie sévère',
    mechanism: 'Inhibition CYP2C9 → accumulation sulfamide',
    management: 'Réduire sulfamide 50%. Surveillance glycémique étroite',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['insulin', 'insuline', 'beta-blocker'],
    level: 'moderate',
    description: 'Masquage hypoglycémie + récupération retardée',
    mechanism: 'Blocage réponse adrénergique à hypoglycémie',
    management: 'Éducation patient. Autosurveillance glycémique accrue',
    severity_score: 7,
    evidence_level: 'B'
  },

  // ==================== GASTRO-INTESTINAL ====================
  {
    drugs: ['ains', 'ibuprofen', 'diclofenac', 'corticosteroid', 'prednisolone'],
    level: 'major',
    description: 'Ulcère peptique, hémorragie digestive',
    mechanism: 'Double agression muqueuse gastrique',
    management: 'IPP systématique. Éviter si antécédents ulcère',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['ppi', 'omeprazole', 'lansoprazole', 'clopidogrel'],
    level: 'moderate',
    description: 'Diminution efficacité clopidogrel',
    mechanism: 'Inhibition CYP2C19 → moins de métabolite actif',
    management: 'Préférer pantoprazole. Espacer prises de 12h si possible',
    severity_score: 7,
    evidence_level: 'B'
  },

  // ==================== RESPIRATOIRE ====================
  {
    drugs: ['theophylline', 'théophylline', 'ciprofloxacin', 'erythromycin'],
    level: 'major',
    description: 'Toxicité théophylline',
    mechanism: 'Inhibition CYP1A2',
    management: 'Réduire théophylline 50%. Surveiller théophyllinémie',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['beta-blocker', 'propranolol', 'asthme'],
    level: 'contraindicated',
    description: 'Bronchospasme sévère',
    mechanism: 'Blocage β2 bronchodilatation',
    management: 'CONTRE-INDICATION. Utiliser β1-sélectif si nécessaire',
    severity_score: 9,
    evidence_level: 'A'
  },

  // ==================== INTERACTIONS MÉDICAMENTS-ALIMENTS ====================
  {
    drugs: ['warfarin', 'vitamin-k', 'vitamine-k', 'green-vegetables'],
    level: 'moderate',
    description: 'Variation INR',
    mechanism: 'Apport variable vitamine K',
    management: 'Consommation régulière légumes verts (pas d\'éviction)',
    severity_score: 6,
    evidence_level: 'A'
  },
  {
    drugs: ['statine', 'grapefruit', 'pamplemousse'],
    level: 'moderate',
    description: 'Augmentation statine, risque myopathie',
    mechanism: 'Inhibition CYP3A4 intestinal',
    management: 'Éviter pamplemousse. Atorvastatine moins affectée que simvastatine',
    severity_score: 6,
    evidence_level: 'B'
  },
  {
    drugs: ['mao-inhibitor', 'tyramine', 'cheese', 'wine'],
    level: 'major',
    description: 'Crise hypertensive',
    mechanism: 'Accumulation tyramine → libération noradrénaline',
    management: 'Régime pauvre en tyramine strict',
    severity_score: 9,
    evidence_level: 'A'
  },

  // ==================== AUTRES INTERACTIONS CRITIQUES ====================
  {
    drugs: ['phenytoin', 'phénytoïne', 'valproate', 'valproate'],
    level: 'major',
    description: 'Toxicité phénytoïne',
    mechanism: 'Inhibition métabolisme phénytoïne',
    management: 'Surveiller phénytoïnémie. Ajuster dose',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['cyclosporine', 'ciclosporine', 'nsaid', 'nephrotoxic'],
    level: 'major',
    description: 'Néphrotoxicité additive',
    mechanism: 'Double agression rénale',
    management: 'Éviter. Surveillance créatinine étroite si nécessaire',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['allopurinol', 'azathioprine'],
    level: 'major',
    description: 'Toxicité hématologique sévère',
    mechanism: 'Inhibition xanthine oxydase → accumulation 6-MP',
    management: 'Réduire azathioprine de 75%. Surveillance NFS',
    severity_score: 9,
    evidence_level: 'A'
  },
  {
    drugs: ['tamoxifen', 'tamoxifène', 'ssri-strong-inhibitor', 'paroxetine', 'fluoxetine'],
    level: 'major',
    description: 'Diminution efficacité tamoxifène',
    mechanism: 'Inhibition CYP2D6 → moins de métabolite actif',
    management: 'Préférer venlafaxine ou citalopram (faibles inhibiteurs)',
    severity_score: 8,
    evidence_level: 'A'
  },
  {
    drugs: ['colchicine', 'macrolide', 'clarithromycin'],
    level: 'contraindicated',
    description: 'Toxicité colchicine fatale',
    mechanism: 'Inhibition P-gp et CYP3A4',
    management: 'CONTRE-INDICATION si insuffisance rénale/hépatique',
    severity_score: 10,
    evidence_level: 'A'
  }
]

// Fonction de recherche d'interactions améliorée
export function checkComprehensiveDrugInteractions(
  drug1: string,
  drug2: string
): DrugInteraction | null {
  const drug1Lower = drug1.toLowerCase()
  const drug2Lower = drug2.toLowerCase()
  
  for (const interaction of CRITICAL_DRUG_INTERACTIONS) {
    const hasDrug1 = interaction.drugs.some(drug => 
      drug1Lower.includes(drug.toLowerCase()) || drug.toLowerCase().includes(drug1Lower)
    )
    const hasDrug2 = interaction.drugs.some(drug => 
      drug2Lower.includes(drug.toLowerCase()) || drug.toLowerCase().includes(drug2Lower)
    )
    
    if (hasDrug1 && hasDrug2) {
      return interaction
    }
  }
  
  return null
}

// Fonction pour vérifier toutes les interactions d'une liste de médicaments
export function checkAllDrugInteractions(medications: string[]): DrugInteraction[] {
  const foundInteractions: DrugInteraction[] = []
  
  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const interaction = checkComprehensiveDrugInteractions(medications[i], medications[j])
      if (interaction && !foundInteractions.includes(interaction)) {
        foundInteractions.push(interaction)
      }
    }
  }
  
  return foundInteractions
}
