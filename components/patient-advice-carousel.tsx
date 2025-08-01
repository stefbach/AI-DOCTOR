"use client"

import React, { useState, useEffect } from 'react'
import { 
  Heart, 
  Thermometer, 
  Droplets, 
  Apple, 
  Activity,
  Sun,
  Moon,
  AlertCircle,
  ShieldCheck,
  Stethoscope,
  Clock,
  ChevronLeft,
  ChevronRight,
  Brain,
  User,
  Calendar,
  Pill,
  Home,
  Phone,
  MapPin,
  Info,
  type LucideIcon
} from 'lucide-react'

interface PatientAdviceCarouselProps {
  patientData: any
  clinicalData: any
  analysisProgress: number
  progressMessage: string
}

interface Advice {
  icon: LucideIcon
  title: string
  content: string
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'yellow' | 'indigo'
}

// Fonction pour générer des conseils personnalisés basés sur le profil
const generatePersonalizedAdvice = (patientData: any, clinicalData: any): Advice[] => {
  const advice: Advice[] = []
  
  // Conseils basés sur l'âge
  const age = parseInt(patientData?.age) || 0
  
  if (age > 65) {
    advice.push({
      icon: User,
      title: "Conseils pour Seniors",
      content: "À votre âge, une surveillance régulière de la tension artérielle et du taux de sucre est recommandée. Pensez à bien vous hydrater, surtout avec le climat tropical de Maurice.",
      color: "blue"
    })
  }
  
  if (age < 18) {
    advice.push({
      icon: Heart,
      title: "Santé des Jeunes",
      content: "Une alimentation équilibrée et une activité physique régulière sont essentielles pour votre développement. Évitez les boissons sucrées et privilégiez l'eau.",
      color: "green"
    })
  }
  
  // Conseils basés sur les symptômes
  const chiefComplaint = clinicalData?.chiefComplaint?.toLowerCase() || ""
  const symptoms = clinicalData?.symptoms || []
  
  if (chiefComplaint.includes("fièvre") || symptoms.some((s: string) => s.toLowerCase().includes("fièvre"))) {
    advice.push({
      icon: Thermometer,
      title: "Gestion de la Fièvre",
      content: "Buvez beaucoup d'eau (3L/jour minimum). Portez des vêtements légers. Utilisez un ventilateur. Si la fièvre dépasse 39°C pendant plus de 48h, consultez en urgence.",
      color: "red"
    })
  }
  
  if (chiefComplaint.includes("douleur") || symptoms.some((s: string) => s.toLowerCase().includes("douleur"))) {
    advice.push({
      icon: Activity,
      title: "Gestion de la Douleur",
      content: "Notez l'intensité de votre douleur sur une échelle de 1 à 10. Reposez-vous dans une position confortable. Évitez les efforts physiques intenses jusqu'au diagnostic.",
      color: "orange"
    })
  }
  
  if (chiefComplaint.includes("toux") || symptoms.some((s: string) => s.toLowerCase().includes("toux"))) {
    advice.push({
      icon: Droplets,
      title: "Conseils pour la Toux",
      content: "Évitez la climatisation trop froide. Buvez des boissons chaudes (thé au miel). Dormez avec la tête surélevée. Portez un masque pour protéger votre entourage.",
      color: "purple"
    })
  }
  
  if (chiefComplaint.includes("fatigue") || symptoms.some((s: string) => s.toLowerCase().includes("fatigue"))) {
    advice.push({
      icon: Moon,
      title: "Gestion de la Fatigue",
      content: "Respectez des horaires de sommeil réguliers (7-8h/nuit). Évitez les écrans avant de dormir. Faites de courtes siestes (20 min max) si nécessaire.",
      color: "indigo"
    })
  }
  
  // Conseils basés sur les antécédents
  const medicalHistory = patientData?.medicalHistory || []
  
  if (medicalHistory.some((h: string) => h.toLowerCase().includes("diabète"))) {
    advice.push({
      icon: Apple,
      title: "Gestion du Diabète",
      content: "Surveillez régulièrement votre glycémie. Respectez vos horaires de repas. Ayez toujours du sucre sur vous. Protégez vos pieds et inspectez-les quotidiennement.",
      color: "indigo"
    })
  }
  
  if (medicalHistory.some((h: string) => h.toLowerCase().includes("hypertension"))) {
    advice.push({
      icon: Heart,
      title: "Contrôle de l'Hypertension",
      content: "Limitez votre consommation de sel. Pratiquez une activité physique douce (marche 30min/jour). Évitez le stress. Prenez vos médicaments à heure fixe.",
      color: "red"
    })
  }
  
  if (medicalHistory.some((h: string) => h.toLowerCase().includes("asthme"))) {
    advice.push({
      icon: Droplets,
      title: "Gestion de l'Asthme",
      content: "Évitez les allergènes connus. Gardez votre inhalateur à portée de main. Évitez la fumée et la pollution. Consultez si vos symptômes s'aggravent.",
      color: "blue"
    })
  }
  
  // Conseils basés sur les médicaments actuels
  const medications = patientData?.currentMedications || []
  
  if (medications.length > 0) {
    advice.push({
      icon: Pill,
      title: "Gestion des Médicaments",
      content: `Vous prenez actuellement ${medications.length} médicament(s). Conservez-les dans un endroit frais et sec. N'arrêtez jamais un traitement sans avis médical.`,
      color: "green"
    })
  }
  
  // Conseils généraux pour Maurice
  advice.push({
    icon: Sun,
    title: "Climat Tropical de Maurice",
    content: "Évitez l'exposition au soleil entre 10h et 16h. Utilisez une protection solaire SPF 30+. Hydratez-vous régulièrement (3L d'eau par jour minimum).",
    color: "yellow"
  })
  
  advice.push({
    icon: MapPin,
    title: "Ressources Santé à Maurice",
    content: "En cas d'urgence: SAMU 114. Laboratoires: C-Lab (29 centres), Green Cross (36 centres). Hôpitaux 24/7: Dr Jeetoo, SSRN, Victoria, Apollo, Wellkin.",
    color: "blue"
  })
  
  advice.push({
    icon: Home,
    title: "Repos et Récupération",
    content: "Assurez-vous de dormir 7-8 heures par nuit. Créez un environnement calme et frais. Évitez les écrans 1h avant le coucher. Pratiquez la respiration profonde.",
    color: "purple"
  })
  
  advice.push({
    icon: Apple,
    title: "Alimentation Santé",
    content: "Privilégiez les fruits et légumes locaux. Évitez les aliments trop épicés si vous avez des troubles digestifs. Mangez à heures régulières.",
    color: "green"
  })
  
  // Conseils spécifiques selon l'heure
  const hour = new Date().getHours()
  
  if (hour >= 22 || hour < 6) {
    advice.push({
      icon: Moon,
      title: "Conseil Nocturne",
      content: "C'est l'heure du repos. Si vous ne pouvez pas dormir à cause de vos symptômes, essayez la position semi-assise. Gardez votre téléphone proche en cas d'urgence.",
      color: "indigo"
    })
  }
  
  if (hour >= 6 && hour < 10) {
    advice.push({
      icon: Sun,
      title: "Conseil Matinal",
      content: "Commencez la journée en douceur. Prenez un petit-déjeuner équilibré. Notez comment vous vous sentez ce matin pour le suivi médical.",
      color: "yellow"
    })
  }
  
  // Ajouter des conseils de surveillance
  advice.push({
    icon: AlertCircle,
    title: "Signes d'Alerte",
    content: "Consultez immédiatement si: difficulté respiratoire, douleur thoracique intense, confusion, fièvre >40°C, vomissements incoercibles.",
    color: "red"
  })
  
  advice.push({
    icon: Clock,
    title: "Suivi Médical",
    content: "Notez l'évolution de vos symptômes dans un carnet. Prenez votre température 2 fois par jour. Gardez tous vos résultats d'examens pour le suivi.",
    color: "orange"
  })
  
  advice.push({
    icon: Phone,
    title: "Téléconsultation",
    content: "Préparez vos questions pour le médecin. Ayez vos médicaments actuels à portée de main. Assurez-vous d'avoir une bonne connexion internet.",
    color: "blue"
  })
  
  advice.push({
    icon: ShieldCheck,
    title: "Prévention",
    content: "Lavez-vous les mains régulièrement. Aérez votre logement matin et soir. Évitez les lieux bondés si vous avez de la fièvre. Portez un masque si nécessaire.",
    color: "green"
  })
  
  advice.push({
    icon: Stethoscope,
    title: "Préparation Examens",
    content: "Pour vos analyses de sang: être à jeun 12h si demandé. Pour l'imagerie: porter des vêtements confortables sans métal. Arrivez 15 min en avance.",
    color: "purple"
  })
  
  advice.push({
    icon: Calendar,
    title: "Organisation des Soins",
    content: "Planifiez vos rendez-vous médicaux. Créez un dossier avec tous vos documents médicaux. Notez les questions à poser à votre médecin.",
    color: "orange"
  })
  
  // Conseils spécifiques femmes si applicable
  if (patientData?.sex === 'F' && age >= 18 && age <= 50) {
    advice.push({
      icon: Heart,
      title: "Santé Féminine",
      content: "N'oubliez pas vos examens gynécologiques annuels. Informez le médecin si vous êtes enceinte ou allaitez. Certains médicaments peuvent être contre-indiqués.",
      color: "purple"
    })
  }
  
  // Conseils activité physique
  if (!medicalHistory.some((h: string) => h.toLowerCase().includes("cardiaque"))) {
    advice.push({
      icon: Activity,
      title: "Activité Physique",
      content: "Une marche de 30 minutes par jour améliore la santé. Évitez les heures chaudes. Hydratez-vous avant, pendant et après l'effort.",
      color: "green"
    })
  }
  
  // Mélanger les conseils pour varier
  return advice.sort(() => Math.random() - 0.5)
}

export default function PatientAdviceCarousel({
  patientData,
  clinicalData,
  analysisProgress,
  progressMessage
}: PatientAdviceCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const advice = generatePersonalizedAdvice(patientData, clinicalData)
  
  // Auto-défilement
  useEffect(() => {
    if (!autoPlay) return
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % advice.length)
    }, 8000) // Change toutes les 8 secondes
    
    return () => clearInterval(timer)
  }, [autoPlay, advice.length])
  
  const goToPrevious = () => {
    setAutoPlay(false)
    setCurrentIndex((prev) => (prev - 1 + advice.length) % advice.length)
  }
  
  const goToNext = () => {
    setAutoPlay(false)
    setCurrentIndex((prev) => (prev + 1) % advice.length)
  }
  
  const currentAdvice = advice[currentIndex]
  const Icon = currentAdvice.icon
  
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-200",
    green: "from-green-500 to-green-600 shadow-green-200",
    red: "from-red-500 to-red-600 shadow-red-200",
    orange: "from-orange-500 to-orange-600 shadow-orange-200",
    purple: "from-purple-500 to-purple-600 shadow-purple-200",
    yellow: "from-yellow-500 to-yellow-600 shadow-yellow-200",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200"
  }
  
  return (
    <div className="space-y-6">
      {/* Header avec infos patient */}
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
                {patientData?.age} ans • {patientData?.sex === 'M' ? 'Homme' : 'Femme'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Motif de consultation</p>
            <p className="text-lg font-bold text-blue-600">{clinicalData?.chiefComplaint}</p>
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Analyse en cours...</span>
            <span className="font-medium text-blue-600">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">{progressMessage}</p>
        </div>
      </div>
      
      {/* Carousel de conseils */}
      <div className="relative">
        <div className={`bg-gradient-to-r ${colorClasses[currentAdvice.color]} rounded-xl p-8 shadow-2xl transform transition-all duration-500`}>
          {/* Navigation */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
          
          {/* Contenu */}
          <div className="text-center text-white">
            <div className="mb-4 flex justify-center">
              <div className="bg-white/20 rounded-full p-4">
                <Icon className="h-12 w-12" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4">{currentAdvice.title}</h3>
            <p className="text-lg leading-relaxed max-w-2xl mx-auto">
              {currentAdvice.content}
            </p>
          </div>
        </div>
        
        {/* Indicateurs */}
        <div className="flex justify-center gap-2 mt-4">
          {advice.map((_, index) => (
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
        </div>
      </div>
      
      {/* Info supplémentaire */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Pendant que l'IA analyse votre cas...</p>
            <p>Ces conseils sont personnalisés selon votre profil et vos symptômes. L'analyse complète par GPT-4o sera disponible dans quelques instants.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
