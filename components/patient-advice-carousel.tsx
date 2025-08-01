"use client"

import React, { useState, useEffect } from 'react'
import { 
  Stethoscope,
  Thermometer,
  Heart,
  Eye,
  Brain,
  Activity,
  MessageCircle,
  Camera,
  AlertCircle,
  Pill,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Home,
  HandHeart,
  Search,
  FileText,
  Volume2,
  Lightbulb,
  Shield,
  TestTube,
  Calendar,
  type LucideIcon
} from 'lucide-react'

interface PatientAdviceCarouselProps {
  patientData: any
  clinicalData: any
  analysisProgress: number
  progressMessage: string
}

interface DoctorAction {
  icon: LucideIcon
  title: string
  action: string
  tips: string[]
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'yellow' | 'indigo'
}

// Fonction pour générer des actions pour le médecin pendant l'attente
const generateDoctorActions = (patientData: any, clinicalData: any): DoctorAction[] => {
  const actions: DoctorAction[] = []
  
  // Actions basées sur le motif de consultation
  const chiefComplaint = clinicalData?.chiefComplaint?.toLowerCase() || ""
  const symptoms = clinicalData?.symptoms || []
  
  // Actions d'examen physique guidé
  actions.push({
    icon: Stethoscope,
    title: "Examen Physique Guidé",
    action: "Demandez au patient de réaliser ces gestes sous votre supervision",
    tips: [
      "Palpation du cou pour ganglions",
      "Vérification de la gorge avec lampe téléphone",
      "Observation de la peau (éruptions, coloration)",
      "Test de mobilité si douleurs articulaires"
    ],
    color: "blue"
  })
  
  // Prise de constantes
  actions.push({
    icon: Thermometer,
    title: "Mesure des Constantes",
    action: "Guidez le patient pour mesurer ses signes vitaux",
    tips: [
      "Température (sous le bras 3 min)",
      "Fréquence cardiaque (pouls radial 1 min)",
      "Fréquence respiratoire (compter 30 sec x2)",
      "Tension si tensiomètre disponible"
    ],
    color: "red"
  })
  
  // Questions d'anamnèse approfondie
  actions.push({
    icon: MessageCircle,
    title: "Anamnèse Détaillée",
    action: "Explorez ces aspects pendant l'attente",
    tips: [
      "Chronologie précise des symptômes",
      "Facteurs déclenchants/soulageants",
      "Antécédents familiaux similaires",
      "Voyage récent ou contact malade"
    ],
    color: "green"
  })
  
  // Observation visuelle
  actions.push({
    icon: Eye,
    title: "Inspection Visuelle",
    action: "Observez attentivement via la caméra",
    tips: [
      "Faciès et expression du patient",
      "Position antalgique éventuelle",
      "Coloration peau et muqueuses",
      "Signes de détresse respiratoire"
    ],
    color: "purple"
  })
  
  // Exploration de l'environnement
  actions.push({
    icon: Home,
    title: "Contexte Environnemental",
    action: "Questionnez sur l'environnement du patient",
    tips: [
      "Conditions de logement (humidité, moisissures)",
      "Animaux domestiques",
      "Exposition professionnelle",
      "Qualité du sommeil et literie"
    ],
    color: "yellow"
  })
  
  // Vérification médicaments
  actions.push({
    icon: Pill,
    title: "Inventaire Pharmaceutique",
    action: "Faites montrer au patient ses médicaments",
    tips: [
      "Médicaments actuels avec boîtes",
      "Vérifier dates de péremption",
      "Observance du traitement",
      "Automédication récente"
    ],
    color: "orange"
  })
  
  // Tests simples
  actions.push({
    icon: Activity,
    title: "Tests Cliniques Simples",
    action: "Réalisez ces tests via vidéo",
    tips: [
      "Test du verre (blanchit si non purpura)",
      "Mobilité cervicale (méningisme)",
      "Toux provoquée (caractère)",
      "Marche si possible (boiterie)"
    ],
    color: "indigo"
  })
  
  // Éducation thérapeutique
  actions.push({
    icon: Lightbulb,
    title: "Éducation Pendant l'Attente",
    action: "Profitez pour éduquer le patient",
    tips: [
      "Expliquer le processus de téléconsultation",
      "Importance du suivi médical",
      "Signes d'alerte à surveiller",
      "Mesures d'hygiène préventives"
    ],
    color: "blue"
  })
  
  // Documentation photo
  actions.push({
    icon: Camera,
    title: "Documentation Visuelle",
    action: "Demandez des photos si pertinent",
    tips: [
      "Lésions cutanées en gros plan",
      "Œdèmes des membres",
      "Coloration des urines si anormale",
      "État de la gorge avec flash"
    ],
    color: "green"
  })
  
  // Exploration psychosociale
  actions.push({
    icon: HandHeart,
    title: "Dimension Psychosociale",
    action: "Explorez l'impact sur la vie quotidienne",
    tips: [
      "Retentissement sur le travail",
      "Qualité de vie et moral",
      "Support familial disponible",
      "Anxiété liée aux symptômes"
    ],
    color: "purple"
  })
  
  // Recherche allergies
  actions.push({
    icon: Shield,
    title: "Dépistage Allergies/Intolérances",
    action: "Questionnez sur les réactions",
    tips: [
      "Allergies médicamenteuses connues",
      "Intolérances alimentaires",
      "Réactions cutanées antérieures",
      "Allergies saisonnières"
    ],
    color: "red"
  })
  
  // Habitudes de vie
  actions.push({
    icon: Heart,
    title: "Habitudes et Mode de Vie",
    action: "Évaluez les facteurs de risque",
    tips: [
      "Alimentation (sel, sucre, gras)",
      "Activité physique hebdomadaire",
      "Consommation tabac/alcool",
      "Gestion du stress"
    ],
    color: "orange"
  })
  
  // Localisation Maurice
  actions.push({
    icon: MapPin,
    title: "Ressources Locales Maurice",
    action: "Informez sur les ressources disponibles",
    tips: [
      "Laboratoires proches du patient",
      "Pharmacies de garde",
      "Services d'urgence les plus proches",
      "Spécialistes dans la région"
    ],
    color: "blue"
  })
  
  // Préparation examens
  actions.push({
    icon: TestTube,
    title: "Anticiper les Examens",
    action: "Préparez le patient aux examens probables",
    tips: [
      "Expliquer le jeûne si bilan sanguin",
      "Préparation pour radiographie",
      "Documents nécessaires",
      "Coûts approximatifs à Maurice"
    ],
    color: "yellow"
  })
  
  // Symptômes associés
  actions.push({
    icon: Search,
    title: "Recherche Symptômes Associés",
    action: "Interrogez sur les signes connexes",
    tips: [
      "Troubles du transit",
      "Modifications urinaires",
      "Troubles du sommeil",
      "Changements d'appétit/poids"
    ],
    color: "indigo"
  })
  
  // Communication non-verbale
  actions.push({
    icon: Volume2,
    title: "Analyse Non-Verbale",
    action: "Observez la communication du patient",
    tips: [
      "Ton de voix (enroué, faible)",
      "Débit de parole",
      "Cohérence du discours",
      "Signes d'anxiété/dépression"
    ],
    color: "green"
  })
  
  // Planification suivi
  actions.push({
    icon: Calendar,
    title: "Organiser le Suivi",
    action: "Planifiez les prochaines étapes",
    tips: [
      "Disponibilités pour examens",
      "Préférences horaires du patient",
      "Contraintes professionnelles",
      "Accompagnant disponible si besoin"
    ],
    color: "purple"
  })
  
  // Actions spécifiques selon symptômes
  if (chiefComplaint.includes("fièvre") || symptoms.includes("fièvre")) {
    actions.push({
      icon: Thermometer,
      title: "Protocole Fièvre",
      action: "Actions spécifiques pour état fébrile",
      tips: [
        "Courbe thermique des derniers jours",
        "Sudation nocturne",
        "Frissons associés",
        "Hydratation actuelle"
      ],
      color: "red"
    })
  }
  
  if (chiefComplaint.includes("douleur")) {
    actions.push({
      icon: Brain,
      title: "Évaluation Douleur",
      action: "Caractérisez précisément la douleur",
      tips: [
        "Échelle EVA 0-10",
        "Type: brûlure, piqûre, écrasement",
        "Irradiation éventuelle",
        "Positions antalgiques"
      ],
      color: "orange"
    })
  }
  
  if (chiefComplaint.includes("toux")) {
    actions.push({
      icon: Volume2,
      title: "Analyse de la Toux",
      action: "Faites tousser le patient pour évaluer",
      tips: [
        "Toux sèche ou productive",
        "Aspect des expectorations",
        "Horaire préférentiel",
        "Facteurs déclenchants"
      ],
      color: "blue"
    })
  }
  
  // Conseils selon l'âge
  const age = parseInt(patientData?.age) || 0
  
  if (age > 65) {
    actions.push({
      icon: User,
      title: "Spécificités Gériatriques",
      action: "Adaptez votre approche au patient âgé",
      tips: [
        "Vérifier l'autonomie",
        "Évaluer risque de chute",
        "Polymédication éventuelle",
        "Support social disponible"
      ],
      color: "indigo"
    })
  }
  
  if (age < 18) {
    actions.push({
      icon: User,
      title: "Approche Pédiatrique",
      action: "Techniques adaptées aux jeunes patients",
      tips: [
        "Impliquer les parents",
        "Utiliser un langage adapté",
        "Observer le comportement",
        "Courbe de croissance"
      ],
      color: "green"
    })
  }
  
  // Mélanger pour varier
  return actions.sort(() => Math.random() - 0.5)
}

export default function PatientAdviceCarousel({
  patientData,
  clinicalData,
  analysisProgress,
  progressMessage
}: PatientAdviceCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const actions = generateDoctorActions(patientData, clinicalData)
  
  // Auto-défilement
  useEffect(() => {
    if (!autoPlay) return
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % actions.length)
    }, 10000) // Change toutes les 10 secondes
    
    return () => clearInterval(timer)
  }, [autoPlay, actions.length])
  
  const goToPrevious = () => {
    setAutoPlay(false)
    setCurrentIndex((prev) => (prev - 1 + actions.length) % actions.length)
  }
  
  const goToNext = () => {
    setAutoPlay(false)
    setCurrentIndex((prev) => (prev + 1) % actions.length)
  }
  
  const currentAction = actions[currentIndex]
  const Icon = currentAction.icon
  
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-200",
    green: "from-green-500 to-green-600 shadow-green-200",
    red: "from-red-500 to-red-600 shadow-red-200",
    orange: "from-orange-500 to-orange-600 shadow-orange-200",
    purple: "from-purple-500 to-purple-600 shadow-purple-200",
    yellow: "from-yellow-500 to-yellow-600 shadow-yellow-200",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200"
  }
  
  const bgColorClasses = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    red: "bg-red-50",
    orange: "bg-orange-50",
    purple: "bg-purple-50",
    yellow: "bg-yellow-50",
    indigo: "bg-indigo-50"
  }
  
  return (
    <div className="space-y-6">
      {/* Header avec infos patient et progression */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800">
                {patientData?.firstName} {patientData?.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                {patientData?.age} ans • {patientData?.sex === 'M' ? 'Homme' : 'Femme'} • {clinicalData?.chiefComplaint}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Analyse IA GPT-4o</p>
            <p className="text-lg font-bold text-blue-600">{analysisProgress}%</p>
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">{progressMessage}</p>
        </div>
      </div>
      
      {/* Titre pour le médecin */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Actions Suggérées Pendant l'Analyse IA
        </h2>
        <p className="text-sm text-gray-600">
          Optimisez le temps d'attente avec ces activités cliniques
        </p>
      </div>
      
      {/* Carousel d'actions pour le médecin */}
      <div className="relative">
        <div className={`${bgColorClasses[currentAction.color]} rounded-xl p-8 shadow-xl transform transition-all duration-500 border-2 border-white`}>
          {/* Navigation */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-all"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-all"
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>
          
          {/* Contenu */}
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className={`bg-gradient-to-r ${colorClasses[currentAction.color]} rounded-full p-4`}>
                <Icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{currentAction.title}</h3>
            </div>
            
            <p className="text-center text-lg text-gray-700 mb-6 font-medium">
              {currentAction.action}
            </p>
            
            <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
              {currentAction.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 bg-white/70 rounded-lg p-3">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${colorClasses[currentAction.color]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Indicateurs */}
        <div className="flex justify-center gap-2 mt-4">
          {actions.slice(0, 10).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setAutoPlay(false)
                setCurrentIndex(index)
              }}
              className={`h-2 transition-all duration-300 rounded-full ${
                index === currentIndex 
                  ? 'w-8 bg-blue-600' 
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
          {actions.length > 10 && (
            <span className="text-sm text-gray-500 ml-2">+{actions.length - 10}</span>
          )}
        </div>
      </div>
      
      {/* Info complémentaire pour le médecin */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Maximisez l'efficacité de la téléconsultation</p>
            <p>Ces suggestions vous aident à recueillir des informations cliniques précieuses pendant que l'IA GPT-4o analyse le cas. L'analyse complète sera disponible dans {Math.ceil((100 - analysisProgress) * 0.6)} secondes environ.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
