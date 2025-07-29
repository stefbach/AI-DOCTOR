// lib/test-patients-data.ts

export interface TestPatient {
  id: string
  patientData: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    gender: 'male' | 'female'
    age: number
    height: number // cm
    weight: number // kg
    address: string
    city: string
    country: string
    emergencyContact: string
    emergencyPhone: string
  }
  clinicalData: {
    bloodPressure: string
    heartRate: number
    temperature: number
    respiratoryRate: number
    oxygenSaturation: number
    chiefComplaint: string
    historyOfPresentIllness: string
    pastMedicalHistory: string
    medications: string
    allergies: string
    familyHistory: string
    socialHistory: string
    reviewOfSystems: string
    physicalExamination: string
  }
  expectedConditions?: string[] // Pour validation des diagnostics
  category: 'cardiology' | 'respiratory' | 'gastro' | 'neurology' | 'endocrine' | 'infection' | 'trauma' | 'psychiatry'
  severity: 'mild' | 'moderate' | 'severe'
  description: string
}

export const testPatients: TestPatient[] = [
  // Cas 1: Hypertension artérielle
  {
    id: 'test-001',
    category: 'cardiology',
    severity: 'moderate',
    description: 'Hypertension artérielle non contrôlée',
    expectedConditions: ['Hypertension artérielle', 'Risque cardiovasculaire'],
    patientData: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@test.com',
      phone: '+230 5123 4567',
      dateOfBirth: '1968-03-15',
      gender: 'male',
      age: 56,
      height: 175,
      weight: 85,
      address: '123 Rue des Flamboyants',
      city: 'Port Louis',
      country: 'Mauritius',
      emergencyContact: 'Marie Dupont',
      emergencyPhone: '+230 5123 4568'
    },
    clinicalData: {
      bloodPressure: '165/95',
      heartRate: 82,
      temperature: 36.8,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      chiefComplaint: 'Maux de tête fréquents depuis 2 semaines',
      historyOfPresentIllness: 'Patient se plaint de céphalées matinales, vertiges occasionnels, et fatigue. Pas de douleur thoracique.',
      pastMedicalHistory: 'Diabète type 2 depuis 5 ans, dyslipidémie',
      medications: 'Metformine 850mg 2x/jour',
      allergies: 'Aucune',
      familyHistory: 'Père décédé d\'AVC à 72 ans, mère diabétique',
      socialHistory: 'Non-fumeur, alcool occasionnel, sédentaire',
      reviewOfSystems: 'Négatif sauf pour les symptômes mentionnés',
      physicalExamination: 'Patient en surpoids, pas de souffle cardiaque, pouls régulier, pas d\'œdème des membres inférieurs'
    }
  },

  // Cas 2: Pneumonie communautaire
  {
    id: 'test-002',
    category: 'respiratory',
    severity: 'moderate',
    description: 'Pneumonie communautaire typique',
    expectedConditions: ['Pneumonie', 'Infection respiratoire basse'],
    patientData: {
      firstName: 'Sophie',
      lastName: 'Martin',
      email: 'sophie.martin@test.com',
      phone: '+230 5234 5678',
      dateOfBirth: '1990-07-22',
      gender: 'female',
      age: 34,
      height: 165,
      weight: 62,
      address: '45 Avenue des Palmiers',
      city: 'Curepipe',
      country: 'Mauritius',
      emergencyContact: 'Pierre Martin',
      emergencyPhone: '+230 5234 5679'
    },
    clinicalData: {
      bloodPressure: '120/75',
      heartRate: 102,
      temperature: 38.9,
      respiratoryRate: 24,
      oxygenSaturation: 93,
      chiefComplaint: 'Toux productive et fièvre depuis 3 jours',
      historyOfPresentIllness: 'Début brutal avec frissons, toux avec expectorations jaunâtres, douleur thoracique à la toux, essoufflement à l\'effort',
      pastMedicalHistory: 'Asthme léger',
      medications: 'Salbutamol en cas de crise',
      allergies: 'Pénicilline (éruption cutanée)',
      familyHistory: 'Sans particularité',
      socialHistory: 'Non-fumeuse, enseignante',
      reviewOfSystems: 'Fatigue importante, perte d\'appétit, sueurs nocturnes',
      physicalExamination: 'Crépitants base droite, matité à la percussion, souffle tubaire'
    }
  },

  // Cas 3: Diabète décompensé
  {
    id: 'test-003',
    category: 'endocrine',
    severity: 'severe',
    description: 'Diabète type 2 mal contrôlé avec complications',
    expectedConditions: ['Diabète décompensé', 'Hyperglycémie', 'Risque de complications'],
    patientData: {
      firstName: 'Rajesh',
      lastName: 'Patel',
      email: 'rajesh.patel@test.com',
      phone: '+230 5345 6789',
      dateOfBirth: '1965-11-30',
      gender: 'male',
      age: 59,
      height: 170,
      weight: 92,
      address: '78 Rue Royale',
      city: 'Quatre Bornes',
      country: 'Mauritius',
      emergencyContact: 'Priya Patel',
      emergencyPhone: '+230 5345 6790'
    },
    clinicalData: {
      bloodPressure: '145/90',
      heartRate: 88,
      temperature: 37.1,
      respiratoryRate: 18,
      oxygenSaturation: 97,
      chiefComplaint: 'Vision floue et soif intense',
      historyOfPresentIllness: 'Polyurie et polydipsie depuis 2 semaines, vision trouble intermittente, perte de poids de 3kg, picotements dans les pieds',
      pastMedicalHistory: 'Diabète type 2 depuis 10 ans, hypertension, dyslipidémie',
      medications: 'Metformine 1000mg 2x/jour, Gliclazide 80mg/jour, Amlodipine 5mg/jour',
      allergies: 'Aucune',
      familyHistory: 'Parents diabétiques, frère avec insuffisance rénale',
      socialHistory: 'Non-fumeur, sédentaire, régime non suivi',
      reviewOfSystems: 'Fatigue chronique, cicatrisation lente',
      physicalExamination: 'Obésité abdominale, diminution de la sensibilité des pieds, réflexes achilléens diminués'
    }
  },

  // Cas 4: Gastro-entérite aiguë
  {
    id: 'test-004',
    category: 'gastro',
    severity: 'mild',
    description: 'Gastro-entérite virale typique',
    expectedConditions: ['Gastro-entérite aiguë', 'Déshydratation légère'],
    patientData: {
      firstName: 'Marie',
      lastName: 'Lebreton',
      email: 'marie.lebreton@test.com',
      phone: '+230 5456 7890',
      dateOfBirth: '1995-02-14',
      gender: 'female',
      age: 29,
      height: 168,
      weight: 58,
      address: '12 Impasse des Roses',
      city: 'Grand Baie',
      country: 'Mauritius',
      emergencyContact: 'Paul Lebreton',
      emergencyPhone: '+230 5456 7891'
    },
    clinicalData: {
      bloodPressure: '110/70',
      heartRate: 95,
      temperature: 37.8,
      respiratoryRate: 16,
      oxygenSaturation: 99,
      chiefComplaint: 'Diarrhée et vomissements depuis 24h',
      historyOfPresentIllness: 'Début brutal hier soir avec nausées puis vomissements (5 épisodes), diarrhée aqueuse (8 selles), crampes abdominales',
      pastMedicalHistory: 'Aucun',
      medications: 'Contraception orale',
      allergies: 'Fruits de mer',
      familyHistory: 'Sans particularité',
      socialHistory: 'Non-fumeuse, travaille dans le tourisme',
      reviewOfSystems: 'Fatigue, légère céphalée, pas de sang dans les selles',
      physicalExamination: 'Légère déshydratation, abdomen souple, bruits hydroaériques augmentés'
    }
  },

  // Cas 5: Migraine
  {
    id: 'test-005',
    category: 'neurology',
    severity: 'moderate',
    description: 'Migraine avec aura classique',
    expectedConditions: ['Migraine avec aura', 'Céphalées vasculaires'],
    patientData: {
      firstName: 'Camille',
      lastName: 'Rousseau',
      email: 'camille.rousseau@test.com',
      phone: '+230 5567 8901',
      dateOfBirth: '1988-09-05',
      gender: 'female',
      age: 36,
      height: 172,
      weight: 65,
      address: '34 Boulevard Victoria',
      city: 'Phoenix',
      country: 'Mauritius',
      emergencyContact: 'Marc Rousseau',
      emergencyPhone: '+230 5567 8902'
    },
    clinicalData: {
      bloodPressure: '125/80',
      heartRate: 72,
      temperature: 36.7,
      respiratoryRate: 14,
      oxygenSaturation: 99,
      chiefComplaint: 'Maux de tête sévères avec troubles visuels',
      historyOfPresentIllness: 'Céphalée pulsatile hémicrânienne droite précédée de scotomes scintillants 30min avant, photophobie, phonophobie, nausées',
      pastMedicalHistory: 'Migraines depuis l\'adolescence',
      medications: 'Sumatriptan en cas de crise',
      allergies: 'Aucune',
      familyHistory: 'Mère migraineuse',
      socialHistory: 'Non-fumeuse, stress professionnel important',
      reviewOfSystems: 'Fatigue lors des crises, troubles du sommeil',
      physicalExamination: 'Examen neurologique normal entre les crises'
    }
  },

  // Cas 6: Anxiété généralisée
  {
    id: 'test-006',
    category: 'psychiatry',
    severity: 'moderate',
    description: 'Trouble anxieux généralisé',
    expectedConditions: ['Trouble anxieux généralisé', 'Anxiété'],
    patientData: {
      firstName: 'Thomas',
      lastName: 'Bernard',
      email: 'thomas.bernard@test.com',
      phone: '+230 5678 9012',
      dateOfBirth: '1982-06-18',
      gender: 'male',
      age: 42,
      height: 180,
      weight: 78,
      address: '56 Rue St Georges',
      city: 'Rose Hill',
      country: 'Mauritius',
      emergencyContact: 'Julie Bernard',
      emergencyPhone: '+230 5678 9013'
    },
    clinicalData: {
      bloodPressure: '135/85',
      heartRate: 92,
      temperature: 36.9,
      respiratoryRate: 20,
      oxygenSaturation: 98,
      chiefComplaint: 'Inquiétude constante et troubles du sommeil',
      historyOfPresentIllness: 'Anxiété persistante depuis 6 mois, insomnie d\'endormissement, tensions musculaires, difficultés de concentration au travail',
      pastMedicalHistory: 'Aucun',
      medications: 'Aucun',
      allergies: 'Aucune',
      familyHistory: 'Sœur traitée pour dépression',
      socialHistory: 'Non-fumeur, cadre stressé, divorce récent',
      reviewOfSystems: 'Fatigue chronique, irritabilité, palpitations occasionnelles',
      physicalExamination: 'Patient tendu, tremblements fins des mains, reste de l\'examen normal'
    }
  },

  // Cas 7: Lombalgie aiguë
  {
    id: 'test-007',
    category: 'trauma',
    severity: 'moderate',
    description: 'Lombalgie mécanique aiguë',
    expectedConditions: ['Lombalgie mécanique', 'Contracture musculaire'],
    patientData: {
      firstName: 'Patrick',
      lastName: 'Moreau',
      email: 'patrick.moreau@test.com',
      phone: '+230 5789 0123',
      dateOfBirth: '1975-12-03',
      gender: 'male',
      age: 49,
      height: 178,
      weight: 82,
      address: '90 Avenue des Cocotiers',
      city: 'Vacoas',
      country: 'Mauritius',
      emergencyContact: 'Sylvie Moreau',
      emergencyPhone: '+230 5789 0124'
    },
    clinicalData: {
      bloodPressure: '130/80',
      heartRate: 76,
      temperature: 36.8,
      respiratoryRate: 16,
      oxygenSaturation: 99,
      chiefComplaint: 'Douleur lombaire intense depuis 3 jours',
      historyOfPresentIllness: 'Douleur apparue après avoir soulevé un carton lourd, irradiation fesse droite, aggravée par les mouvements, soulagée au repos',
      pastMedicalHistory: 'Épisodes de lombalgie dans le passé',
      medications: 'Paracétamol 1g si besoin',
      allergies: 'Aucune',
      familyHistory: 'Sans particularité',
      socialHistory: 'Non-fumeur, travail physique (manutentionnaire)',
      reviewOfSystems: 'Pas de troubles urinaires, pas de déficit moteur',
      physicalExamination: 'Contracture paravertébrale, Lasègue négatif, force et sensibilité normales'
    }
  },

  // Cas 8: Allergie saisonnière
  {
    id: 'test-008',
    category: 'respiratory',
    severity: 'mild',
    description: 'Rhinite allergique saisonnière',
    expectedConditions: ['Rhinite allergique', 'Allergie saisonnière'],
    patientData: {
      firstName: 'Amélie',
      lastName: 'Dubois',
      email: 'amelie.dubois@test.com',
      phone: '+230 5890 1234',
      dateOfBirth: '1993-04-25',
      gender: 'female',
      age: 31,
      height: 160,
      weight: 55,
      address: '23 Rue des Jacarandas',
      city: 'Floreal',
      country: 'Mauritius',
      emergencyContact: 'Louis Dubois',
      emergencyPhone: '+230 5890 1235'
    },
    clinicalData: {
      bloodPressure: '115/75',
      heartRate: 68,
      temperature: 36.6,
      respiratoryRate: 16,
      oxygenSaturation: 99,
      chiefComplaint: 'Éternuements et congestion nasale',
      historyOfPresentIllness: 'Rhinorrhée claire, éternuements en salves, prurit nasal et oculaire depuis 1 semaine, coïncide avec la floraison',
      pastMedicalHistory: 'Rhinite allergique connue',
      medications: 'Cétirizine occasionnellement',
      allergies: 'Pollens, acariens',
      familyHistory: 'Père asthmatique',
      socialHistory: 'Non-fumeuse, travaille en intérieur',
      reviewOfSystems: 'Fatigue légère, pas de fièvre',
      physicalExamination: 'Muqueuse nasale pâle et œdématiée, yeux légèrement rouges'
    }
  },

  // Cas 9: Infection urinaire
  {
    id: 'test-009',
    category: 'infection',
    severity: 'mild',
    description: 'Cystite aiguë simple',
    expectedConditions: ['Cystite', 'Infection urinaire basse'],
    patientData: {
      firstName: 'Nathalie',
      lastName: 'Lambert',
      email: 'nathalie.lambert@test.com',
      phone: '+230 5901 2345',
      dateOfBirth: '1987-08-12',
      gender: 'female',
      age: 37,
      height: 167,
      weight: 60,
      address: '67 Chemin Grenier',
      city: 'Mahebourg',
      country: 'Mauritius',
      emergencyContact: 'Eric Lambert',
      emergencyPhone: '+230 5901 2346'
    },
    clinicalData: {
      bloodPressure: '120/78',
      heartRate: 78,
      temperature: 37.3,
      respiratoryRate: 16,
      oxygenSaturation: 99,
      chiefComplaint: 'Brûlures mictionnelles et pollakiurie',
      historyOfPresentIllness: 'Douleurs à la miction depuis 2 jours, envies fréquentes d\'uriner, sensation de vidange incomplète, urines troubles',
      pastMedicalHistory: '2 épisodes de cystite dans le passé',
      medications: 'Aucun',
      allergies: 'Sulfamides',
      familyHistory: 'Sans particularité',
      socialHistory: 'Non-fumeuse, mariée',
      reviewOfSystems: 'Pas de fièvre élevée, pas de douleur lombaire',
      physicalExamination: 'Abdomen souple, sensibilité sus-pubienne, fosses lombaires libres'
    }
  },

  // Cas 10: Angine streptococcique
  {
    id: 'test-010',
    category: 'infection',
    severity: 'moderate',
    description: 'Angine bactérienne probable',
    expectedConditions: ['Angine streptococcique', 'Pharyngite bactérienne'],
    patientData: {
      firstName: 'Lucas',
      lastName: 'Michel',
      email: 'lucas.michel@test.com',
      phone: '+230 6012 3456',
      dateOfBirth: '2008-01-20',
      gender: 'male',
      age: 16,
      height: 170,
      weight: 65,
      address: '89 Rue La Bourdonnais',
      city: 'Beau Bassin',
      country: 'Mauritius',
      emergencyContact: 'Anne Michel',
      emergencyPhone: '+230 6012 3457'
    },
    clinicalData: {
      bloodPressure: '115/70',
      heartRate: 98,
      temperature: 39.2,
      respiratoryRate: 18,
      oxygenSaturation: 98,
      chiefComplaint: 'Mal de gorge intense et fièvre',
      historyOfPresentIllness: 'Odynophagie sévère depuis 2 jours, fièvre élevée, frissons, adénopathies cervicales douloureuses',
      pastMedicalHistory: 'Angines récidivantes',
      medications: 'Aucun',
      allergies: 'Aucune',
      familyHistory: 'Sans particularité',
      socialHistory: 'Lycéen, non-fumeur',
      reviewOfSystems: 'Céphalées, asthénie importante',
      physicalExamination: 'Pharynx érythémateux, amygdales hypertrophiées avec exsudat blanchâtre, adénopathies cervicales sensibles'
    }
  },

  // Cas 11: Reflux gastro-œsophagien
  {
    id: 'test-011',
    category: 'gastro',
    severity: 'moderate',
    description: 'RGO avec œsophagite',
    expectedConditions: ['Reflux gastro-œsophagien', 'Œsophagite'],
    patientData: {
      firstName: 'François',
      lastName: 'Durand',
      email: 'francois.durand@test.com',
      phone: '+230 6123 4567',
      dateOfBirth: '1970-05-08',
      gender: 'male',
      age: 54,
      height: 182,
      weight: 95,
      address: '45 Rue Suffren',
      city: 'Port Louis',
      country: 'Mauritius',
      emergencyContact: 'Claire Durand',
      emergencyPhone: '+230 6123 4568'
    },
    clinicalData: {
      bloodPressure: '140/85',
      heartRate: 80,
      temperature: 36.9,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      chiefComplaint: 'Brûlures rétrosternales quotidiennes',
      historyOfPresentIllness: 'Pyrosis post-prandial depuis 3 mois, régurgitations acides nocturnes, toux sèche matinale, aggravation en décubitus',
      pastMedicalHistory: 'Obésité, hernie hiatale connue',
      medications: 'Oméprazole 20mg occasionnellement',
      allergies: 'Aucune',
      familyHistory: 'Père avec cancer de l\'œsophage',
      socialHistory: 'Ex-fumeur (arrêt il y a 5 ans), alcool modéré',
      reviewOfSystems: 'Dysphagie occasionnelle aux solides',
      physicalExamination: 'Obésité abdominale, reste de l\'examen normal'
    }
  },

  // Cas 12: Asthme exacerbé
  {
    id: 'test-012',
    category: 'respiratory',
    severity: 'moderate',
    description: 'Exacerbation d\'asthme',
    expectedConditions: ['Exacerbation d\'asthme', 'Bronchospasme'],
    patientData: {
      firstName: 'Emma',
      lastName: 'Petit',
      email: 'emma.petit@test.com',
      phone: '+230 6234 5678',
      dateOfBirth: '1998-11-15',
      gender: 'female',
      age: 26,
      height: 163,
      weight: 57,
      address: '78 Avenue des Fleurs',
      city: 'Quatre Bornes',
      country: 'Mauritius',
      emergencyContact: 'David Petit',
      emergencyPhone: '+230 6234 5679'
    },
    clinicalData: {
      bloodPressure: '125/75',
      heartRate: 105,
      temperature: 37.0,
      respiratoryRate: 26,
      oxygenSaturation: 92,
      chiefComplaint: 'Difficulté respiratoire croissante',
      historyOfPresentIllness: 'Dyspnée progressive depuis 3 jours, toux sèche, oppression thoracique, utilisation accrue du bronchodilatateur',
      pastMedicalHistory: 'Asthme depuis l\'enfance, eczéma',
      medications: 'Symbicort 160/4.5 2 bouffées 2x/jour, Ventoline si besoin',
      allergies: 'Acariens, chat, aspirine',
      familyHistory: 'Mère asthmatique',
      socialHistory: 'Non-fumeuse, étudiante',
      reviewOfSystems: 'Rhinite associée, fatigue',
      physicalExamination: 'Sibilants diffus bilatéraux, tirage intercostal discret, DEP à 60% de la théorique'
    }
  },

  // Cas 13: Épilepsie
  {
    id: 'test-013',
    category: 'neurology',
    severity: 'severe',
    description: 'Crise d\'épilepsie récente',
    expectedConditions: ['Épilepsie', 'Crise tonico-clonique'],
    patientData: {
      firstName: 'Alexandre',
      lastName: 'Robert',
      email: 'alexandre.robert@test.com',
      phone: '+230 6345 6789',
      dateOfBirth: '1992-02-28',
      gender: 'male',
      age: 32,
      height: 176,
      weight: 73,
      address: '34 Rue Labourdonnais',
      city: 'Curepipe',
      country: 'Mauritius',
      emergencyContact: 'Sarah Robert',
      emergencyPhone: '+230 6345 6790'
    },
    clinicalData: {
      bloodPressure: '130/82',
      heartRate: 84,
      temperature: 37.1,
      respiratoryRate: 18,
      oxygenSaturation: 97,
      chiefComplaint: 'Crise convulsive ce matin',
      historyOfPresentIllness: 'Crise tonico-clonique généralisée de 3 minutes au réveil, morsure de langue, confusion post-critique, pas d\'aura',
      pastMedicalHistory: 'Épilepsie diagnostiquée il y a 2 ans, dernière crise il y a 6 mois',
      medications: 'Valproate 500mg 2x/jour',
      allergies: 'Aucune',
      familyHistory: 'Cousin épileptique',
      socialHistory: 'Non-fumeur, ingénieur, stress récent',
      reviewOfSystems: 'Troubles du sommeil récents, oublis de médicaments',
      physicalExamination: 'Morsure latérale de langue, examen neurologique normal'
    }
  },

  // Cas 14: Anémie ferriprive
  {
    id: 'test-014',
    category: 'endocrine',
    severity: 'moderate',
    description: 'Anémie par carence en fer',
    expectedConditions: ['Anémie ferriprive', 'Carence martiale'],
    patientData: {
      firstName: 'Isabelle',
      lastName: 'Girard',
      email: 'isabelle.girard@test.com',
      phone: '+230 6456 7890',
      dateOfBirth: '1985-07-10',
      gender: 'female',
      age: 39,
      height: 164,
      weight: 52,
      address: '56 Chemin du Moulin',
      city: 'Pamplemousses',
      country: 'Mauritius',
      emergencyContact: 'Michel Girard',
      emergencyPhone: '+230 6456 7891'
    },
    clinicalData: {
      bloodPressure: '105/65',
      heartRate: 95,
      temperature: 36.7,
      respiratoryRate: 18,
      oxygenSaturation: 97,
      chiefComplaint: 'Fatigue intense et essoufflement',
      historyOfPresentIllness: 'Asthénie progressive depuis 3 mois, dyspnée d\'effort, vertiges en se levant, règles abondantes',
      pastMedicalHistory: 'Ménorragies, 3 grossesses',
      medications: 'Aucun',
      allergies: 'Aucune',
      familyHistory: 'Mère anémique',
      socialHistory: 'Non-fumeuse, végétarienne',
      reviewOfSystems: 'Pâleur notée par l\'entourage, ongles cassants, envie de glace',
      physicalExamination: 'Pâleur cutanéo-muqueuse, tachycardie, souffle systolique 2/6'
    }
  },

  // Cas 15: Colique néphrétique
  {
    id: 'test-015',
    category: 'infection',
    severity: 'severe',
    description: 'Lithiase urinaire avec colique',
    expectedConditions: ['Colique néphrétique', 'Lithiase urinaire'],
    patientData: {
      firstName: 'Vincent',
      lastName: 'Lefèvre',
      email: 'vincent.lefevre@test.com',
      phone: '+230 6567 8901',
      dateOfBirth: '1978-09-22',
      gender: 'male',
      age: 46,
      height: 175,
      weight: 80,
      address: '90 Boulevard Kennedy',
      city: 'Vacoas',
      country: 'Mauritius',
      emergencyContact: 'Céline Lefèvre',
      emergencyPhone: '+230 6567 8902'
    },
    clinicalData: {
      bloodPressure: '150/95',
      heartRate: 102,
      temperature: 37.4,
      respiratoryRate: 22,
      oxygenSaturation: 98,
      chiefComplaint: 'Douleur lombaire droite insupportable',
      historyOfPresentIllness: 'Douleur brutale lombaire droite irradiant vers l\'aine, paroxystique, agitation, nausées et vomissements',
      pastMedicalHistory: 'Antécédent de lithiase il y a 5 ans',
      medications: 'Aucun',
      allergies: 'Produits de contraste iodés',
      familyHistory: 'Père avec lithiases récidivantes',
      socialHistory: 'Non-fumeur, boit peu d\'eau',
      reviewOfSystems: 'Hématurie macroscopique, pollakiurie',
      physicalExamination: 'Patient agité, douleur à la percussion de la fosse lombaire droite, abdomen souple'
    }
  },

  // Cas 16: Zona
  {
    id: 'test-016',
    category: 'infection',
    severity: 'moderate',
    description: 'Zona thoracique typique',
    expectedConditions: ['Zona', 'Infection à VZV'],
    patientData: {
      firstName: 'Monique',
      lastName: 'Dupuis',
      email: 'monique.dupuis@test.com',
      phone: '+230 6678 9012',
      dateOfBirth: '1955-04-18',
      gender: 'female',
      age: 69,
      height: 158,
      weight: 68,
      address: '23 Rue des Orchidées',
      city: 'Floreal',
      country: 'Mauritius',
      emergencyContact: 'André Dupuis',
      emergencyPhone: '+230 6678 9013'
    },
    clinicalData: {
      bloodPressure: '135/80',
      heartRate: 76,
      temperature: 37.5,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      chiefComplaint: 'Éruption douloureuse sur le thorax',
      historyOfPresentIllness: 'Douleur type brûlure hémi-thoracique gauche depuis 4 jours, puis apparition de vésicules groupées sur fond érythémateux',
      pastMedicalHistory: 'Diabète type 2, varicelle dans l\'enfance',
      medications: 'Metformine 850mg 2x/jour',
      allergies: 'Aucune',
      familyHistory: 'Sans particularité',
      socialHistory: 'Non-fumeuse, retraitée',
      reviewOfSystems: 'Fatigue, douleur perturbant le sommeil',
      physicalExamination: 'Éruption vésiculeuse métamérique T5-T6 gauche, hyperesthésie cutanée'
    }
  },

  // Cas 17: Dépression
  {
    id: 'test-017',
    category: 'psychiatry',
    severity: 'moderate',
    description: 'Épisode dépressif majeur',
    expectedConditions: ['Dépression', 'Épisode dépressif majeur'],
    patientData: {
      firstName: 'Julien',
      lastName: 'Moreau',
      email: 'julien.moreau@test.com',
      phone: '+230 6789 0123',
      dateOfBirth: '1980-12-05',
      gender: 'male',
      age: 44,
      height: 172,
      weight: 70,
      address: '67 Avenue des Palmistes',
      city: 'Rose Hill',
      country: 'Mauritius',
      emergencyContact: 'Sandrine Moreau',
      emergencyPhone: '+230 6789 0124'
    },
    clinicalData: {
      bloodPressure: '120/75',
      heartRate: 65,
      temperature: 36.6,
      respiratoryRate: 14,
      oxygenSaturation: 99,
      chiefComplaint: 'Tristesse persistante et perte d\'intérêt',
      historyOfPresentIllness: 'Humeur dépressive depuis 2 mois, anhédonie, insomnie terminale, perte de poids de 5kg, idées noires sans projet suicidaire',
      pastMedicalHistory: 'Épisode dépressif il y a 10 ans',
      medications: 'Aucun actuellement',
      allergies: 'Aucune',
      familyHistory: 'Mère traitée pour dépression',
      socialHistory: 'Non-fumeur, comptable, divorce en cours',
      reviewOfSystems: 'Fatigue majeure, troubles de concentration, culpabilité excessive',
      physicalExamination: 'Ralentissement psychomoteur, contact préservé, pas de signe de danger imminent'
    }
  },

  // Cas 18: Vertiges (VPPB)
  {
    id: 'test-018',
    category: 'neurology',
    severity: 'mild',
    description: 'Vertige positionnel paroxystique bénin',
    expectedConditions: ['VPPB', 'Vertige positionnel'],
    patientData: {
      firstName: 'Hélène',
      lastName: 'Simon',
      email: 'helene.simon@test.com',
      phone: '+230 6890 1234',
      dateOfBirth: '1972-06-30',
      gender: 'female',
      age: 52,
      height: 166,
      weight: 63,
      address: '45 Rue des Bougainvilliers',
      city: 'Grand Baie',
      country: 'Mauritius',
      emergencyContact: 'Paul Simon',
      emergencyPhone: '+230 6890 1235'
    },
    clinicalData: {
      bloodPressure: '125/78',
      heartRate: 70,
      temperature: 36.7,
      respiratoryRate: 16,
      oxygenSaturation: 99,
      chiefComplaint: 'Vertiges rotatoires aux changements de position',
      historyOfPresentIllness: 'Vertiges brefs (30 secondes) déclenchés par le lever, coucher et rotation de la tête, nausées associées, pas d\'acouphènes',
      pastMedicalHistory: 'Ménopause',
      medications: 'Traitement hormonal substitutif',
      allergies: 'Aucune',
      familyHistory: 'Sans particularité',
      socialHistory: 'Non-fumeuse, professeur',
      reviewOfSystems: 'Anxiété liée aux vertiges',
      physicalExamination: 'Manœuvre de Dix-Hallpike positive à droite, pas de nystagmus spontané'
    }
  },

  // Cas 19: Insuffisance cardiaque
  {
    id: 'test-019',
    category: 'cardiology',
    severity: 'severe',
    description: 'Décompensation cardiaque gauche',
    expectedConditions: ['Insuffisance cardiaque', 'Décompensation cardiaque'],
    patientData: {
      firstName: 'Georges',
      lastName: 'Blanc',
      email: 'georges.blanc@test.com',
      phone: '+230 6901 2345',
      dateOfBirth: '1958-03-12',
      gender: 'male',
      age: 66,
      height: 168,
      weight: 88,
      address: '78 Rue du Port',
      city: 'Port Louis',
      country: 'Mauritius',
      emergencyContact: 'Michèle Blanc',
      emergencyPhone: '+230 6901 2346'
    },
    clinicalData: {
      bloodPressure: '95/60',
      heartRate: 110,
      temperature: 36.9,
      respiratoryRate: 28,
      oxygenSaturation: 88,
      chiefComplaint: 'Essoufflement progressif et œdèmes',
      historyOfPresentIllness: 'Dyspnée d\'effort classe III NYHA évoluant vers dyspnée de repos, orthopnée (3 oreillers), œdèmes bilatéraux',
      pastMedicalHistory: 'Infarctus du myocarde il y a 3 ans, HTA, diabète',
      medications: 'Ramipril 5mg, Bisoprolol 5mg, Furosémide 40mg, Aspirine 100mg',
      allergies: 'Aucune',
      familyHistory: 'Père décédé d\'insuffisance cardiaque',
      socialHistory: 'Ex-fumeur, retraité',
      reviewOfSystems: 'Prise de poids de 4kg en 1 semaine, toux nocturne',
      physicalExamination: 'Crépitants bilatéraux, turgescence jugulaire, œdèmes prenant le godet, hépatomégalie'
    }
  },

  // Cas 20: Thyroïdite
  {
    id: 'test-020',
    category: 'endocrine',
    severity: 'moderate',
    description: 'Hyperthyroïdie sur maladie de Basedow',
    expectedConditions: ['Hyperthyroïdie', 'Maladie de Basedow'],
    patientData: {
      firstName: 'Caroline',
      lastName: 'Mercier',
      email: 'caroline.mercier@test.com',
      phone: '+230 7012 3456',
      dateOfBirth: '1990-10-08',
      gender: 'female',
      age: 34,
      height: 169,
      weight: 48,
      address: '12 Impasse des Lilas',
      city: 'Quatre Bornes',
      country: 'Mauritius',
      emergencyContact: 'Philippe Mercier',
      emergencyPhone: '+230 7012 3457'
    },
    clinicalData: {
      bloodPressure: '140/70',
      heartRate: 118,
      temperature: 37.3,
      respiratoryRate: 20,
      oxygenSaturation: 99,
      chiefComplaint: 'Palpitations et perte de poids',
      historyOfPresentIllness: 'Perte de 8kg en 2 mois malgré appétit conservé, palpitations, tremblements, thermophobie, irritabilité',
      pastMedicalHistory: 'Vitiligo',
      medications: 'Aucun',
      allergies: 'Aucune',
      familyHistory: 'Tante avec problème thyroïdien',
      socialHistory: 'Non-fumeuse, commerciale',
      reviewOfSystems: 'Diarrhée fréquente, troubles des règles, insomnie',
      physicalExamination: 'Goitre diffus, exophtalmie bilatérale, tremblements fins des extrémités, peau chaude et moite'
    }
  }
]

// Fonction utilitaire pour obtenir un patient aléatoire
export function getRandomTestPatient(): TestPatient {
  const randomIndex = Math.floor(Math.random() * testPatients.length)
  return testPatients[randomIndex]
}

// Fonction utilitaire pour obtenir des patients par catégorie
export function getTestPatientsByCategory(category: TestPatient['category']): TestPatient[] {
  return testPatients.filter(patient => patient.category === category)
}

// Fonction utilitaire pour obtenir des patients par sévérité
export function getTestPatientsBySeverity(severity: TestPatient['severity']): TestPatient[] {
  return testPatients.filter(patient => patient.severity === severity)
}
