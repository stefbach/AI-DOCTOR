'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Loader2, AlertCircle, UserPlus } from 'lucide-react'

export interface HubPatientSearchProps {
  onPatientFound: (patientData: any) => void
  onNewPatient: () => void
}

export function HubPatientSearch({ onPatientFound, onNewPatient }: HubPatientSearchProps) {
  const [searchCriteria, setSearchCriteria] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      // Recherche dans l'historique des consultations
      const response = await fetch('/api/patient-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchCriteria)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche')
      }

      const data = await response.json()

      if (data.consultations && data.consultations.length > 0) {
        // Patient trouvé
        onPatientFound({
          searchCriteria,
          consultations: data.consultations,
          totalConsultations: data.count
        })
      } else {
        // Patient non trouvé
        setNotFound(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de recherche')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setSearchCriteria({ name: '', email: '', phone: '' })
    setError(null)
    setNotFound(false)
  }

  const isSearchDisabled = !searchCriteria.name && !searchCriteria.email && !searchCriteria.phone

  return (
    <Card className="w-full">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Search className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
          Recherche Patient
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Recherchez un patient existant ou créez un nouveau dossier
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
        <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="patient-name">Nom du Patient</Label>
            <Input
              id="patient-name"
              type="text"
              placeholder="Nom complet..."
              value={searchCriteria.name}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, name: e.target.value }))}
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="patient-email">Email</Label>
            <Input
              id="patient-email"
              type="email"
              placeholder="email@exemple.com"
              value={searchCriteria.email}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, email: e.target.value }))}
              disabled={loading}
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="patient-phone">Téléphone</Label>
            <Input
              id="patient-phone"
              type="tel"
              placeholder="Numéro de téléphone"
              value={searchCriteria.phone}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, phone: e.target.value }))}
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSearchDisabled || loading}
              className="flex-1 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Rechercher
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={loading || isSearchDisabled}
              className="text-sm sm:text-base"
            >
              Effacer
            </Button>
          </div>

          {/* Help text */}
          {isSearchDisabled && (
            <p className="text-xs sm:text-sm text-gray-500 italic">
              Entrez au moins un critère de recherche
            </p>
          )}
        </form>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Patient Not Found */}
        {notFound && (
          <Alert className="mt-3 sm:mt-4 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="space-y-2 sm:space-y-3">
                <p className="font-medium text-sm sm:text-base">❌ Aucun patient trouvé avec ces critères</p>
                <p className="text-xs sm:text-sm">
                  Ce patient n'a pas d'historique de consultation dans le système.
                </p>
                <Button
                  onClick={onNewPatient}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-xs sm:text-sm w-full sm:w-auto"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Créer Nouveau Dossier Patient
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
