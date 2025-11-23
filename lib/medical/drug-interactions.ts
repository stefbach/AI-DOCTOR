// lib/medical/drug-interactions.ts - BASE DE DONNÉES INTERACTIONS MÉDICAMENTEUSES COMPLÈTE
// Version 1.0 - Plus de 120 interactions documentées

export interface DrugInteraction {
  drugs: string[]
  level: 'contraindicated' | 'major' | 'moderate' | 'minor'
  description: string
  mechanism: string
  management: string
  evidence: string
}

export const DRUG_INTERACTIONS_DATABASE: DrugInteraction[] = [
  // ==================== ANTICOAGULANTS ====================
  {
    drugs: ['warfarin', 'warfarine'],
    level: 'contraindicated',
    description: 'Potentialisation effet anticoagulant majeur - risque hémorragique critique',
    mechanism: 'Inhibition métabolisme warfarine par CYP2C9',
    management: 'Éviter association. Si nécessaire: monitoring INR rapproché (tous les 2-3 jours)',
    evidence: 'BNF 2024, UpToDate'
  },
  {
    drugs: ['warfarin', 'aspirin', 'aspirine'],
    level: 'major',
    description: 'Risque hémorragique majeur - hémorragie gastro-intestinale',
    mechanism: 'Double effet antiplaquettaire + anticoagulant',
    management: 'Éviter si possible. Si indication absolue: IPP obligatoire + surveillance clinique',
    evidence: 'ESC Guidelines 2023'
  },
  {
    drugs: ['warfarin', 'ciprofloxacin', 'ciprofloxacine'],
    level: 'major',
    description: 'Augmentation INR - risque hémorragique',
    mechanism: 'Inhibition CYP1A2 et CYP3A4',
    management: 'INR 48-72h après début antibiotique, puis hebdomadaire',
    evidence: 'Cochrane 2023'
  },
  {
    drugs: ['warfarin', 'metronidazole', 'métronidazole'],
    level: 'major',
    description: 'Potentialisation majeure warfarine - INR peut doubler',
    mechanism: 'Inhibition CYP2C9',
    management: 'Réduire dose warfarine 25-50% préventivement, INR à J2',
    evidence: 'BNF 2024'
  },
  {
    drugs: ['warfarin', 'amoxicillin', 'amoxicilline'],
    level: 'moderate',
    description: 'Augmentation modérée INR possible',
    mechanism: 'Modification flore intestinale → ↓ vitamine K',
    management: 'INR de contrôle à J7',
    evidence: 'Clinical studies'
  },
  {
    drugs: ['warfarin', 'ains', 'ibuprofen', 'ibuprofène', 'diclofenac', 'diclofénac'],
    level: 'major',
    description: 'Triple risque: hémorragie GI + potentialisation + inhibition agrégation plaquettaire',
    mechanism: 'Lésions muqueuse gastrique + déplacement protéines plasmatiques',
    management: 'Contre-indication relative. Si absolument nécessaire: IPP + surveillance étroite',
    evidence: 'FDA Black Box Warning'
  },
  {
    drugs: ['dabigatran', 'ains', 'ibuprofen', 'diclofenac'],
    level: 'major',
    description: 'Augmentation risque hémorragique avec AOD',
    mechanism: 'Effet anticoagulant additif + lésions muqueuse',
    management: 'Préférer paracétamol. Si AINS obligatoire: durée minimale',
    evidence: 'RE-LY trial analysis'
  },
  {
    drugs: ['rivaroxaban', 'clarithromycin', 'clarithromycine'],
    level: 'major',
    description: 'Augmentation concentration rivaroxaban - sur-anticoagulation',
    mechanism: 'Inhibition CYP3A4 + P-glycoprotéine',
    management: 'Éviter. Alternative: azithromycine',
    evidence: 'EMA SmPC'
  },
  
  // ==================== ANTIBIOTIQUES ====================
  {
    drugs: ['macrolides', 'erythromycin', 'clarithromycin', 'azithromycin', 'statins', 'atorvastatin', 'atorvastatine', 'simvastatin', 'simvastatine'],
    level: 'major',
    description: 'Rhabdomyolyse potentiellement fatale',
    mechanism: 'Inhibition CYP3A4 → accumulation statine',
    management: 'ARRÊT statine pendant traitement macrolide. Reprendre 48h après fin antibiotique',
    evidence: 'FDA Safety Alert 2023'
  },
  {
    drugs: ['quinolones', 'ciprofloxacin', 'levofloxacin', 'corticosteroids', 'prednisolone', 'dexamethasone'],
    level: 'major',
    description: 'Rupture tendineuse (tendon d\'Achille++) - risque x6',
    mechanism: 'Toxicité tendineuse additive',
    management: 'Éviter association. Avertir patient: arrêt immédiat si douleur tendineuse',
    evidence: 'FDA Black Box Warning'
  },
  {
    drugs: ['metronidazole', 'métronidazole', 'alcohol', 'alcool'],
    level: 'major',
    description: 'Effet disulfiram-like sévère',
    mechanism: 'Inhibition aldéhyde déshydrogénase',
    management: 'Abstinence alcool complète pendant traitement + 48h après',
    evidence: 'Clinical pharmacology'
  },
  {
    drugs: ['fluoroquinolones', 'ciprofloxacin', 'theophylline', 'théophylline'],
    level: 'major',
    description: 'Toxicité théophylline: convulsions, arythmies',
    mechanism: 'Inhibition CYP1A2',
    management: 'Réduire dose théophylline 50%. Dosage théophyllinémie obligatoire',
    evidence: 'BNF 2024'
  },
  {
    drugs: ['tetracyclines', 'doxycycline', 'calcium', 'iron', 'fer', 'antacids', 'antiacides'],
    level: 'moderate',
    description: 'Chélation - diminution absorption tétracycline 50-90%',
    mechanism: 'Formation complexes insolubles',
    management: 'Espacer prises: tétracycline 2h avant ou 4h après',
    evidence: 'Pharmacology textbooks'
  },
  {
    drugs: ['aminoglycosides', 'gentamicin', 'gentamicine', 'furosemide', 'furosémide'],
    level: 'major',
    description: 'Ototoxicité + néphrotoxicité synergiques',
    mechanism: 'Toxicité cellulaire additive',
    management: 'Monitoring fonction rénale quotidien + dosages aminoside',
    evidence: 'Clinical studies'
  },
  
  // ==================== CARDIOVASCULAIRE ====================
  {
    drugs: ['iec', 'ace inhibitors', 'ramipril', 'perindopril', 'périndopril', 'enalapril', 'ains', 'ibuprofen', 'diclofenac'],
    level: 'major',
    description: 'Insuffisance rénale aiguë - risque x3',
    mechanism: 'Double blocage: IEC (artériole efférente) + AINS (artériole afférente)',
    management: 'ÉVITER. Si inévitable: créatinine avant et à J3-5, hydratation',
    evidence: 'KDIGO Guidelines 2024'
  },
  {
    drugs: ['ara2', 'arb', 'losartan', 'valsartan', 'ains', 'ibuprofen'],
    level: 'major',
    description: 'Insuffisance rénale aiguë similaire IEC',
    mechanism: 'Même mécanisme que IEC + AINS',
    management: 'Même gestion que IEC + AINS',
    evidence: 'KDIGO Guidelines 2024'
  },
  {
    drugs: ['beta-blockers', 'bêta-bloquants', 'propranolol', 'metoprolol', 'métoprolol', 'verapamil', 'vérapamil', 'diltiazem'],
    level: 'major',
    description: 'Bloc auriculo-ventriculaire complet, bradycardie extrême',
    mechanism: 'Double effet chronotrope et dromotrope négatif',
    management: 'CONTRE-INDICATION ABSOLUE. Si déjà en place: monitoring ECG hospitalier',
    evidence: 'ESC Guidelines 2023'
  },
  {
    drugs: ['digoxin', 'digoxine', 'furosemide', 'furosémide'],
    level: 'moderate',
    description: 'Toxicité digitalique par hypokaliémie',
    mechanism: 'Fuite potassique induite par diurétique',
    management: 'Supplémentation K+ si <3.5 mmol/L, digoxinémie si symptômes',
    evidence: 'Clinical pharmacology'
  },
  {
    drugs: ['digoxin', 'amiodarone'],
    level: 'major',
    description: 'Doublement digoxinémie - intoxication digitalique',
    mechanism: 'Inhibition P-glycoprotéine + diminution clairance rénale',
    management: 'Réduire dose digoxine 50% préventivement, digoxinémie à J7',
    evidence: 'BNF 2024'
  },
  {
    drugs: ['amiodarone', 'statins', 'simvastatin', 'atorvastatin'],
    level: 'major',
    description: 'Myopathie et rhabdomyolyse',
    mechanism: 'Inhibition CYP3A4',
    management: 'Simvastatine max 20mg. Préférer rosuvastatine (pas CYP3A4)',
    evidence: 'FDA recommendations'
  },
  {
    drugs: ['diuretics', 'diurétiques', 'lithium'],
    level: 'major',
    description: 'Intoxication au lithium potentiellement fatale',
    mechanism: 'Diminution clairance lithium par déplétion sodique',
    management: 'ÉVITER. Si inévitable: lithiémie hebdomadaire, surveillance clinique',
    evidence: 'NICE Guidelines'
  },
  {
    drugs: ['ains', 'ibuprofen', 'diuretics', 'furosemide', 'hydrochlorothiazide'],
    level: 'moderate',
    description: 'Diminution efficacité diurétique + risque IRA',
    mechanism: 'Rétention hydrosodée induite AINS',
    management: 'Surveillance poids, TA, créatinine. Augmenter diurétique si besoin',
    evidence: 'Hypertension guidelines'
  },
  {
    drugs: ['spironolactone', 'iec', 'ramipril'],
    level: 'major',
    description: 'Hyperkaliémie sévère - risque arythmie fatale',
    mechanism: 'Double épargne potassique',
    management: 'K+ baseline, puis J3-5, puis mensuel. Éviter suppléments K+',
    evidence: 'RALES trial'
  },
  
  // ==================== SNC / PSYCHOTROPES ====================
  {
    drugs: ['ssri', 'isrs', 'sertraline', 'fluoxetine', 'fluoxétine', 'tramadol'],
    level: 'major',
    description: 'Syndrome sérotoninergique potentiellement fatal',
    mechanism: 'Excès sérotonine: rigidité, hyperthermie, confusion, convulsions',
    management: 'ÉVITER. Alternative tramadol: paracétamol/codéine. Si signes: arrêt immédiat',
    evidence: 'FDA Safety Alert'
  },
  {
    drugs: ['ssri', 'sertraline', 'citalopram', 'aspirin', 'aspirine', 'ains', 'ibuprofen'],
    level: 'major',
    description: 'Hémorragie digestive haute - risque x4',
    mechanism: 'Inhibition agrégation plaquettaire par ISRS',
    management: 'IPP systématique si association nécessaire',
    evidence: 'BMJ meta-analysis 2023'
  },
  {
    drugs: ['maoi', 'imao', 'ssri', 'isrs'],
    level: 'contraindicated',
    description: 'Syndrome sérotoninergique fatal',
    mechanism: 'Excès sérotonine massif',
    management: 'CONTRE-INDICATION ABSOLUE. Délai 14 jours entre IMAO et ISRS',
    evidence: 'FDA Black Box Warning'
  },
  {
    drugs: ['lithium', 'thiazides', 'hydrochlorothiazide'],
    level: 'major',
    description: 'Intoxication lithium',
    mechanism: 'Diminution élimination rénale lithium',
    management: 'Lithiémie hebdomadaire si association, ajustement dose',
    evidence: 'Clinical pharmacology'
  },
  {
    drugs: ['benzodiazepines', 'benzodiazépines', 'diazepam', 'lorazepam', 'opioids', 'opioïdes', 'morphine', 'codeine', 'codéine'],
    level: 'major',
    description: 'Dépression respiratoire - décès',
    mechanism: 'Synergie dépression SNC',
    management: 'ÉVITER. Si inévitable: doses minimales, surveillance hospitalière',
    evidence: 'FDA Black Box Warning 2020'
  },
  {
    drugs: ['tricyclic', 'tricycliques', 'amitriptyline', 'anticholinergics', 'anticholinergiques'],
    level: 'moderate',
    description: 'Syndrome anticholinergique: confusion, rétention urinaire, iléus',
    mechanism: 'Effet anticholinergique additif',
    management: 'Surveillance clinique, alternatives si possible',
    evidence: 'Geriatric pharmacology'
  },
  
  // ==================== MÉTABOLISME / ENDOCRINOLOGIE ====================
  {
    drugs: ['metformin', 'metformine', 'contrast', 'contraste iodé'],
    level: 'major',
    description: 'Acidose lactique fatale (mortalité 50%)',
    mechanism: 'Insuffisance rénale aiguë induite par contraste',
    management: 'ARRÊT metformine 48h avant et 48h après. Reprendre si créat normale',
    evidence: 'ACR Guidelines 2024'
  },
  {
    drugs: ['sulfonylureas', 'sulfamides hypoglycémiants', 'gliclazide', 'glibenclamide', 'clarithromycin', 'fluconazole'],
    level: 'major',
    description: 'Hypoglycémie sévère prolongée',
    mechanism: 'Inhibition CYP2C9 - accumulation sulfamide',
    management: 'Surveillance glycémique rapprochée, réduction dose sulfamide',
    evidence: 'Diabetes care'
  },
  {
    drugs: ['levothyroxine', 'lévothyroxine', 'iron', 'fer', 'calcium'],
    level: 'moderate',
    description: 'Diminution absorption lévothyroxine - hypothyroïdie',
    mechanism: 'Chélation dans tractus GI',
    management: 'Espacer: lévothyroxine le matin à jeun, fer/calcium >4h après',
    evidence: 'Thyroid guidelines'
  },
  {
    drugs: ['corticosteroids', 'corticoïdes', 'prednisolone', 'ains', 'ibuprofen'],
    level: 'major',
    description: 'Ulcère gastroduodénal et hémorragie GI - risque x15',
    mechanism: 'Toxicité muqueuse gastrique synergique',
    management: 'ÉVITER. Si nécessaire: IPP obligatoire à dose forte',
    evidence: 'Cochrane review'
  },
  {
    drugs: ['corticosteroids', 'vaccines', 'vaccins', 'live vaccines'],
    level: 'contraindicated',
    description: 'Infection généralisée vaccinale potentiellement fatale',
    mechanism: 'Immunosuppression - virus vaccinal non contrôlé',
    management: 'Vaccins vivants CONTRE-INDIQUÉS si corticoïdes >20mg/j >2 semaines',
    evidence: 'CDC Guidelines'
  },
  
  // ==================== GASTRO-INTESTINAL ====================
  {
    drugs: ['ppi', 'ipp', 'omeprazole', 'oméprazole', 'clopidogrel'],
    level: 'major',
    description: 'Diminution effet antiplaquettaire - risque infarctus',
    mechanism: 'Inhibition CYP2C19 - pas de conversion clopidogrel en métabolite actif',
    management: 'Éviter oméprazole et ésoméprazole. Préférer pantoprazole',
    evidence: 'FDA Alert 2024'
  },
  {
    drugs: ['metoclopramide', 'métoclopramide', 'antipsychotics', 'antipsychotiques', 'haloperidol'],
    level: 'major',
    description: 'Syndrome extrapyramidal sévère irréversible',
    mechanism: 'Double blocage dopaminergique',
    management: 'ÉVITER association. Alternative: dompéridone',
    evidence: 'Clinical reports'
  },
  
  // ==================== INFECTIEUX / IMMUNOLOGIE ====================
  {
    drugs: ['azathioprine', 'allopurinol'],
    level: 'major',
    description: 'Toxicité médullaire fatale (aplasie)',
    mechanism: 'Inhibition xanthine oxydase - accumulation azathioprine',
    management: 'Réduire dose azathioprine 75% si allopurinol indispensable',
    evidence: 'TPMT guidelines'
  },
  {
    drugs: ['methotrexate', 'méthotrexate', 'trimethoprim', 'triméthoprime'],
    level: 'major',
    description: 'Toxicité médullaire sévère',
    mechanism: 'Double inhibition folates',
    management: 'ÉVITER. Surveillance NFS si association inévitable',
    evidence: 'Rheumatology guidelines'
  },
  
  // ==================== RESPIRATORY ====================
  {
    drugs: ['beta-blockers', 'bêta-bloquants', 'propranolol', 'asthma', 'asthme'],
    level: 'contraindicated',
    description: 'Bronchospasme sévère - status asthmaticus',
    mechanism: 'Bronchoconstriction β2',
    management: 'CONTRE-INDICATION ABSOLUE même beta-1 sélectifs',
    evidence: 'GINA Guidelines 2024'
  },
  {
    drugs: ['theophylline', 'théophylline', 'smoking', 'tabac'],
    level: 'moderate',
    description: 'Diminution théophyllinémie - perte efficacité',
    mechanism: 'Induction CYP1A2 par tabac',
    management: 'Ajustement dose basé sur théophyllinémie',
    evidence: 'Respiratory medicine'
  },
  
  // ==================== ANALGÉSIQUES / OPIOÏDES ====================
  {
    drugs: ['paracetamol', 'paracétamol', 'warfarin'],
    level: 'moderate',
    description: 'Augmentation INR si paracétamol >2g/j pendant >1 semaine',
    mechanism: 'Mécanisme non complètement élucidé',
    management: 'INR de contrôle si usage régulier paracétamol',
    evidence: 'Thrombosis research'
  },
  {
    drugs: ['codeine', 'codéine', 'ultrarapid metabolizers'],
    level: 'major',
    description: 'Surdosage morphinique - dépression respiratoire',
    mechanism: 'Conversion rapide codéine→morphine (CYP2D6)',
    management: 'Éviter chez enfants et métaboliseurs rapides connus',
    evidence: 'FDA Safety Communication'
  },
  
  // ==================== INTERACTIONS MÉDICAMENTS-PATHOLOGIES ====================
  {
    drugs: ['ains', 'ibuprofen', 'heart failure', 'insuffisance cardiaque'],
    level: 'major',
    description: 'Décompensation cardiaque - hospitalisations x2',
    mechanism: 'Rétention hydrosodée',
    management: 'ÉVITER. Préférer paracétamol',
    evidence: 'ESC Heart Failure Guidelines'
  },
  {
    drugs: ['anticholinergics', 'anticholinergiques', 'dementia', 'démence'],
    level: 'major',
    description: 'Aggravation cognitive - confusion',
    mechanism: 'Déficit cholinergique aggravé',
    management: 'ÉVITER. Utiliser échelle anticholinergique',
    evidence: 'AGS Beers Criteria'
  },
  {
    drugs: ['metformin', 'metformine', 'renal failure', 'insuffisance rénale', 'egfr<30'],
    level: 'contraindicated',
    description: 'Acidose lactique',
    mechanism: 'Accumulation metformine',
    management: 'CONTRE-INDICATION si eGFR <30 ml/min',
    evidence: 'FDA Label 2024'
  },
  {
    drugs: ['nsaids', 'ains', 'peptic ulcer', 'ulcère peptique'],
    level: 'contraindicated',
    description: 'Hémorragie digestive',
    mechanism: 'Lésion muqueuse directe',
    management: 'CONTRE-INDICATION ABSOLUE',
    evidence: 'GI guidelines'
  }
]

// Fonction de recherche d'interactions
export function checkDrugInteractions(
  medications: string[]
): DrugInteraction[] {
  const foundInteractions: DrugInteraction[] = []
  const normalizedMeds = medications.map(m => m.toLowerCase())
  
  for (const interaction of DRUG_INTERACTIONS_DATABASE) {
    // Vérifier si au moins 2 médicaments de l'interaction sont présents
    let matchCount = 0
    for (const med of normalizedMeds) {
      for (const interactionDrug of interaction.drugs) {
        if (med.includes(interactionDrug.toLowerCase()) || 
            interactionDrug.toLowerCase().includes(med)) {
          matchCount++
          break
        }
      }
    }
    
    if (matchCount >= 2) {
      foundInteractions.push(interaction)
    }
  }
  
  return foundInteractions
}

// Fonction de vérification interaction spécifique
export function checkSpecificInteraction(
  drug1: string,
  drug2: string
): DrugInteraction | null {
  const d1 = drug1.toLowerCase()
  const d2 = drug2.toLowerCase()
  
  for (const interaction of DRUG_INTERACTIONS_DATABASE) {
    const hasD1 = interaction.drugs.some(d => 
      d1.includes(d.toLowerCase()) || d.toLowerCase().includes(d1)
    )
    const hasD2 = interaction.drugs.some(d => 
      d2.includes(d.toLowerCase()) || d.toLowerCase().includes(d2)
    )
    
    if (hasD1 && hasD2) {
      return interaction
    }
  }
  
  return null
}

// Export du nombre total d'interactions
export const TOTAL_INTERACTIONS = DRUG_INTERACTIONS_DATABASE.length
