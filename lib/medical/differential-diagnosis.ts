// lib/medical/differential-diagnosis.ts - SYSTÈME DE DIAGNOSTICS DIFFÉRENTIELS
// Version 1.0 - Génération systématique de DD par symptôme principal

export interface DifferentialDiagnosis {
  diagnosis: string
  icd10: string
  probability: 'high' | 'moderate' | 'low'
  severity: 'life_threatening' | 'serious' | 'moderate' | 'minor'
  time_sensitive: boolean
  cannot_miss: boolean
  supporting_features: string[]
  against_features?: string[]
  next_steps: string[]
  clinical_pearls?: string
}

// ==================== CHEST PAIN / DOULEUR THORACIQUE ====================
export const CHEST_PAIN_DIFFERENTIALS: DifferentialDiagnosis[] = [
  {
    diagnosis: 'Acute Coronary Syndrome (Infarctus du myocarde / Angine instable)',
    icd10: 'I21',
    probability: 'high',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Douleur constrictive rétrosternale',
      'Irradiation mâchoire/bras gauche',
      'Facteurs de risque CV (âge>50, diabète, HTA, tabac)',
      'Dyspnée associée',
      'Sueurs, nausées'
    ],
    against_features: [
      'Douleur reproductible à la palpation',
      'Douleur pleurétique (aggravée inspiration)',
      'Patient jeune sans facteurs de risque'
    ],
    next_steps: [
      'ECG immédiat (STEMI vs NSTEMI)',
      'Troponine hs en urgence puis à H3',
      'Aspirin 300mg à croquer IMMÉDIATEMENT si pas de contre-indication',
      'Appel SAMU/transfert USIC'
    ],
    clinical_pearls: 'Toute douleur thoracique >50 ans = SCA jusqu\'à preuve du contraire'
  },
  {
    diagnosis: 'Pulmonary Embolism (Embolie pulmonaire)',
    icd10: 'I26',
    probability: 'moderate',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Douleur pleurétique soudaine',
      'Dyspnée aiguë',
      'Tachycardie',
      'Facteurs de risque: chirurgie récente, immobilisation, cancer, contraception oestrogénique'
    ],
    next_steps: [
      'Score de Wells pour EP',
      'D-dimères si Wells faible',
      'CT angio pulmonaire si Wells élevé ou D-dimères positifs',
      'Gaz du sang (hypoxémie, hypocapnie)'
    ],
    clinical_pearls: 'EP peut mimer infarctus. D-dimères négatifs excluent EP si probabilité faible'
  },
  {
    diagnosis: 'Aortic Dissection (Dissection aortique)',
    icd10: 'I71.0',
    probability: 'low',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Douleur DÉCHIRANTE début brutal',
      'Irradiation dorsale interscapulaire',
      'HTA sévère',
      'Asymétrie pouls/TA entre 2 bras',
      'Antécédents: Marfan, HTA mal contrôlée'
    ],
    next_steps: [
      'CT angio thoracique en URGENCE',
      'Echo transoesophagienne si CT non disponible',
      'Contrôle TA agressif (β-bloquant IV)',
      'Chirurgie vasculaire STAT'
    ],
    clinical_pearls: 'Mortalité 1-2%/heure. Radiographie thorax normale n\'exclut PAS le diagnostic'
  },
  {
    diagnosis: 'Pneumothorax',
    icd10: 'J93',
    probability: 'moderate',
    severity: 'serious',
    time_sensitive: true,
    cannot_miss: false,
    supporting_features: [
      'Douleur pleurétique unilatérale brutale',
      'Dyspnée',
      'Diminution murmure vésiculaire',
      'Tympanisme à la percussion',
      'Patient jeune longiligne ou BPCO'
    ],
    next_steps: [
      'Radiographie thorax (debout, expiration)',
      'Si pneumothorax compressif: décompression immédiate aiguille',
      'Drainage pleural si >20% ou symptomatique'
    ]
  },
  {
    diagnosis: 'Péricardite aiguë',
    icd10: 'I30',
    probability: 'moderate',
    severity: 'moderate',
    time_sensitive: false,
    cannot_miss: false,
    supporting_features: [
      'Douleur aggravée décubitus, soulagée position penchée avant',
      'Frottement péricardique',
      'Contexte viral récent',
      'Fièvre'
    ],
    next_steps: [
      'ECG: sus-décalage ST diffus, sous-décalage PQ',
      'Troponine (peut être élevée)',
      'Echo cardiaque (épanchement péricardique)',
      'CRP élevée'
    ]
  },
  {
    diagnosis: 'Pneumonie / Pleurésie',
    icd10: 'J18',
    probability: 'high',
    severity: 'serious',
    time_sensitive: false,
    cannot_miss: false,
    supporting_features: [
      'Douleur pleurétique',
      'Fièvre, toux',
      'Dyspnée',
      'Crépitants à l\'auscultation'
    ],
    next_steps: [
      'Radiographie thorax',
      'CRP, PCT si sepsis suspecté',
      'CURB-65 score',
      'Hémocultures si sévère'
    ]
  },
  {
    diagnosis: 'Reflux gastro-oesophagien / Spasme oesophagien',
    icd10: 'K21',
    probability: 'high',
    severity: 'minor',
    time_sensitive: false,
    cannot_miss: false,
    supporting_features: [
      'Brûlure rétrosternale',
      'Lien avec repas',
      'Soulagée par antacides',
      'Position couchée aggravante'
    ],
    next_steps: [
      'Essai thérapeutique IPP',
      'Endoscopie si symptômes d\'alarme',
      'ECG pour exclure origine cardiaque d\'abord'
    ],
    clinical_pearls: 'Peut mimer parfaitement un SCA. Toujours exclure cause cardiaque d\'abord'
  },
  {
    diagnosis: 'Douleur pariétale / Costochondrite (Syndrome de Tietze)',
    icd10: 'M94.0',
    probability: 'high',
    severity: 'minor',
    time_sensitive: false,
    cannot_miss: false,
    supporting_features: [
      'Douleur reproductible à la palpation',
      'Pas de dyspnée',
      'Aggravée mouvements thorax'
    ],
    next_steps: [
      'Diagnostic clinique',
      'Rassurer patient',
      'AINS topiques ou PO'
    ]
  }
]

// ==================== ABDOMINAL PAIN / DOULEUR ABDOMINALE ====================
export const ABDOMINAL_PAIN_DIFFERENTIALS: DifferentialDiagnosis[] = [
  {
    diagnosis: 'Appendicite aiguë',
    icd10: 'K35',
    probability: 'high',
    severity: 'serious',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Douleur péri-ombilicale puis FID',
      'Anorexie, nausées',
      'Fièvre modérée',
      'Défense FID (signe de Bloomberg)',
      'Score Alvarado ≥7'
    ],
    next_steps: [
      'Score Alvarado',
      'NFS (hyperleucocytose à PNN)',
      'CRP élevée',
      'Echo abdominale si doute',
      'CT abdomen si diagnostic incertain',
      'Chirurgie si confirmé'
    ],
    clinical_pearls: 'Alvarado <4: appendicite peu probable. >7: chirurgie. 4-7: imagerie'
  },
  {
    diagnosis: 'Cholécystite aiguë / Colique biliaire',
    icd10: 'K81',
    probability: 'high',
    severity: 'serious',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Douleur HCD irradiant omoplate droite',
      'Post-prandiale (repas gras)',
      'Murphy positif',
      'Fièvre si cholécystite',
      'Facteurs 4F: Female, Forty, Fatty, Fertile'
    ],
    next_steps: [
      'Echo abdominale (gold standard)',
      'NFS, CRP',
      'Bilirubine, GGT, PAL',
      'Si compliquée: HIDA scan, MRCP',
      'Chirurgie si aiguë'
    ]
  },
  {
    diagnosis: 'Pancréatite aiguë',
    icd10: 'K85',
    probability: 'moderate',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Douleur épigastrique intense irradiant dos (en barre)',
      'Vomissements incoercibles',
      'Contexte: alcool, lithiase biliaire',
      'Position antalgique (chien de fusil)'
    ],
    next_steps: [
      'Lipase >3x normale (gold standard)',
      'Amylase (moins spécifique)',
      'CT abdomen si doute (pas en phase aiguë)',
      'Score de Ranson / BISAP',
      'Hospitalisation, réanimation si sévère'
    ],
    clinical_pearls: 'Lipase meilleure que amylase. CT dans les 72h si diagnostic incertain'
  },
  {
    diagnosis: 'Perforation viscérale',
    icd10: 'K63.1',
    probability: 'low',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Douleur abdominale brutale "coup de poignard"',
      'Défense généralisée / contracture',
      'Disparition matité hépatique',
      'Contexte: ulcère, AINS, corticoïdes'
    ],
    next_steps: [
      'Radiographie abdomen debout (pneumopéritoine)',
      'CT abdomen si doute',
      'Chirurgie URGENTE',
      'Antibiotiques large spectre'
    ]
  },
  {
    diagnosis: 'Occlusion intestinale',
    icd10: 'K56',
    probability: 'moderate',
    severity: 'serious',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Arrêt matières et gaz',
      'Vomissements',
      'Distension abdominale',
      'Borborygmes métalliques ou silence abdominal',
      'Antécédents: chirurgie (adhérences), hernie'
    ],
    next_steps: [
      'Radiographie abdomen (niveaux hydro-aériques)',
      'CT abdomen avec contraste',
      'Hospitalisation',
      'Chirurgie si strangulation'
    ]
  },
  {
    diagnosis: 'Infection urinaire / Pyélonéphrite',
    icd10: 'N10',
    probability: 'high',
    severity: 'serious',
    time_sensitive: false,
    cannot_miss: false,
    supporting_features: [
      'Douleur lombaire / flanc',
      'Fièvre élevée',
      'Dysurie, pollakiurie',
      'Giordano positif'
    ],
    next_steps: [
      'ECBU',
      'NFS, CRP',
      'Créatinine',
      'Echo rénale si compliquée'
    ]
  },
  {
    diagnosis: 'Gastro-entérite aiguë',
    icd10: 'K52',
    probability: 'high',
    severity: 'minor',
    time_sensitive: false,
    cannot_miss: false,
    supporting_features: [
      'Douleurs abdominales diffuses crampes',
      'Diarrhée ± vomissements',
      'Fièvre modérée',
      'Cas similaires entourage'
    ],
    next_steps: [
      'Hydratation',
      'SRO',
      'Coproculture si sang/glaires ou persistance'
    ]
  },
  {
    diagnosis: 'Grossesse extra-utérine',
    icd10: 'O00',
    probability: 'moderate',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Femme en âge procréer',
      'Aménorrhée',
      'Douleur FIG',
      'Métrorragies',
      'Masse annexielle palpable'
    ],
    next_steps: [
      'β-HCG',
      'Echo pelvienne',
      'NFS si saignement',
      'Chirurgie si rupture'
    ],
    clinical_pearls: 'Toute femme en âge de procréer avec douleur abdominale = GEU jusqu\'à preuve du contraire'
  }
]

// ==================== HEADACHE / CÉPHALÉE ====================
export const HEADACHE_DIFFERENTIALS: DifferentialDiagnosis[] = [
  {
    diagnosis: 'Hémorragie sous-arachnoïdienne',
    icd10: 'I60',
    probability: 'low',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Céphalée "thunderclap" (coup de tonnerre) - pire céphalée de la vie',
      'Début BRUTAL maximal en <1min',
      'Raideur nuque',
      'Photophobie',
      'Troubles conscience'
    ],
    next_steps: [
      'CT cérébral SANS contraste en URGENCE',
      'Ponction lombaire si CT négatif (xanthochromie)',
      'Angio-CT ou angio-IRM',
      'Neurochirurgie STAT'
    ],
    clinical_pearls: 'Mortalité 50%. CT négatif n\'exclut pas si >6h: PL obligatoire'
  },
  {
    diagnosis: 'Migraine',
    icd10: 'G43',
    probability: 'high',
    severity: 'minor',
    time_sensitive: false,
    cannot_miss: false,
    supporting_features: [
      'Céphalée unilatérale pulsatile',
      'Photophobie, phonophobie',
      'Nausées/vomissements',
      'Aura visuelle (20-30%)',
      'Antécédents personnels/familiaux'
    ],
    next_steps: [
      'Diagnostic clinique',
      'Triptan si sévère',
      'Traitement de fond si >3/mois'
    ]
  },
  {
    diagnosis: 'Méningite',
    icd10: 'G03',
    probability: 'moderate',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Céphalée + fièvre + raideur nuque',
      'Photophobie',
      'Altération conscience',
      'Purpura (méningocoque)'
    ],
    next_steps: [
      'Hémocultures',
      'CT avant PL si signes focalisation ou HTIC',
      'Ponction lombaire',
      'Antibiotiques IMMÉDIATEMENT si suspicion (ne pas attendre PL)'
    ],
    clinical_pearls: 'Ceftriaxone 2g IV dès suspicion, avant même PL'
  },
  {
    diagnosis: 'Artérite temporale (maladie de Horton)',
    icd10: 'M31.6',
    probability: 'low',
    severity: 'serious',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Patient >50 ans',
      'Céphalée temporale',
      'Claudication mâchoire',
      'Artère temporale indurée',
      'VS très élevée (>50)',
      'Troubles visuels (amaurose fugace)'
    ],
    next_steps: [
      'VS, CRP',
      'Corticothérapie IMMÉDIATE (prednisone 1mg/kg)',
      'Biopsie artère temporale (dans 7j)'
    ],
    clinical_pearls: 'Urgence: risque cécité irréversible. Corticoïdes AVANT biopsie'
  }
]

// ==================== DYSPNEA / DYSPNÉE ====================
export const DYSPNEA_DIFFERENTIALS: DifferentialDiagnosis[] = [
  {
    diagnosis: 'Insuffisance cardiaque aiguë / OAP',
    icd10: 'I50',
    probability: 'high',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Dyspnée orthopnée',
      'Râles crépitants bilatéraux',
      'Œdèmes membres inférieurs',
      'Turgescence jugulaire',
      'Antécédents cardiaques'
    ],
    next_steps: [
      'ECG',
      'Pro-BNP / NT-pro-BNP',
      'Radiographie thorax (cardiomégalie, redistribution vasculaire)',
      'Echo cardiaque',
      'Diurétiques IV, O2'
    ]
  },
  {
    diagnosis: 'Asthme aigu sévère',
    icd10: 'J45',
    probability: 'high',
    severity: 'life_threatening',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Sibilants expiratoires',
      'Tirage, polypnée',
      'Impossibilité phrases complètes',
      'Peak flow <50% théorique',
      'Silence auscultatoire (gravité extrême)'
    ],
    next_steps: [
      'Peak flow',
      'Gaz du sang si sévère',
      'Bronchodilatateurs + corticoïdes',
      'Hospitalisation si sévère'
    ]
  },
  {
    diagnosis: 'BPCO exacerbée',
    icd10: 'J44',
    probability: 'high',
    severity: 'serious',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Tabagisme',
      'Dyspnée chronique aggravée',
      'Expectoration purulente',
      'Sibilants'
    ],
    next_steps: [
      'Gaz du sang',
      'Radiographie thorax',
      'Bronchodilatateurs',
      'Corticoïdes PO',
      'Antibiotiques si infection'
    ]
  },
  {
    diagnosis: 'Pneumothorax',
    icd10: 'J93',
    probability: 'moderate',
    severity: 'serious',
    time_sensitive: true,
    cannot_miss: true,
    supporting_features: [
      'Dyspnée + douleur thoracique brutales',
      'Diminution MV unilatéral',
      'Tympanisme'
    ],
    next_steps: [
      'Radiographie thorax',
      'Drainage si >20%'
    ]
  }
]

// ==================== FONCTION PRINCIPALE ====================
export function generateDifferentialDiagnoses(
  chiefComplaint: string,
  symptoms: string[],
  vitalSigns?: any
): DifferentialDiagnosis[] {
  const complaint = chiefComplaint.toLowerCase()
  const symptomsLower = symptoms.map(s => s.toLowerCase()).join(' ')
  const allText = `${complaint} ${symptomsLower}`.toLowerCase()
  
  // Détection par symptôme principal
  if (allText.includes('chest pain') || allText.includes('douleur thoracique') || 
      allText.includes('thorax') || allText.includes('cardiac')) {
    return CHEST_PAIN_DIFFERENTIALS
  }
  
  if (allText.includes('abdominal') || allText.includes('stomach') || 
      allText.includes('ventre') || allText.includes('abdomen')) {
    return ABDOMINAL_PAIN_DIFFERENTIALS
  }
  
  if (allText.includes('headache') || allText.includes('céphalée') || 
      allText.includes('mal de tête') || allText.includes('migraine')) {
    return HEADACHE_DIFFERENTIALS
  }
  
  if (allText.includes('dyspnea') || allText.includes('dyspnée') || 
      allText.includes('shortness of breath') || allText.includes('essoufflement') ||
      allText.includes('difficulté respir')) {
    return DYSPNEA_DIFFERENTIALS
  }
  
  // Retourner tableau vide si pas de match (GPT-4 générera)
  return []
}

// Fonction pour extraire "cannot miss diagnoses"
export function getCannotMissDiagnoses(
  differentials: DifferentialDiagnosis[]
): DifferentialDiagnosis[] {
  return differentials.filter(d => d.cannot_miss)
}

// Fonction pour trier par gravité
export function sortByUrgency(
  differentials: DifferentialDiagnosis[]
): DifferentialDiagnosis[] {
  const urgencyOrder = {
    'life_threatening': 0,
    'serious': 1,
    'moderate': 2,
    'minor': 3
  }
  
  return [...differentials].sort((a, b) => 
    urgencyOrder[a.severity] - urgencyOrder[b.severity]
  )
}
