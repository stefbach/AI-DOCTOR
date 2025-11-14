'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Search, Loader2, AlertCircle, User, Mail, Phone } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface PatientSearchCriteria {
  name?: string
  email?: string
  phone?: string
}

export interface PatientSearchProps {
  onSearch: (criteria: PatientSearchCriteria) => Promise<void>
  loading?: boolean
  error?: string | null
  resultCount?: number
}

/**
 * PatientSearch Component
 * 
 * Reusable patient search interface for all follow-up workflows.
 * Allows searching by name, email, or phone number.
 * 
 * @component
 * @example
 * ```tsx
 * <PatientSearch 
 *   onSearch={searchPatient} 
 *   loading={loading}
 *   error={error}
 *   resultCount={5}
 * />
 * ```
 */
export function PatientSearch({ 
  onSearch, 
  loading = false, 
  error = null,
  resultCount = 0
}: PatientSearchProps) {
  const [criteria, setCriteria] = useState<PatientSearchCriteria>({
    name: '',
    email: '',
    phone: ''
  })

  const handleInputChange = (field: keyof PatientSearchCriteria, value: string) => {
    setCriteria(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // At least one field must be filled
    if (!criteria.name && !criteria.email && !criteria.phone) {
      return
    }

    // Remove empty fields
    const cleanCriteria: PatientSearchCriteria = {}
    if (criteria.name?.trim()) cleanCriteria.name = criteria.name.trim()
    if (criteria.email?.trim()) cleanCriteria.email = criteria.email.trim()
    if (criteria.phone?.trim()) cleanCriteria.phone = criteria.phone.trim()

    await onSearch(cleanCriteria)
  }

  const handleClear = () => {
    setCriteria({ name: '', email: '', phone: '' })
  }

  const isSearchDisabled = !criteria.name && !criteria.email && !criteria.phone

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-600" />
          Search Patient Records
        </CardTitle>
        <CardDescription>
          Search by name, email, or phone number to retrieve patient consultation history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Name Search */}
          <div className="space-y-2">
            <Label htmlFor="patient-name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              Patient Name
            </Label>
            <Input
              id="patient-name"
              type="text"
              placeholder="Enter patient full name..."
              value={criteria.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Email Search */}
          <div className="space-y-2">
            <Label htmlFor="patient-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              Email Address
            </Label>
            <Input
              id="patient-email"
              type="email"
              placeholder="Enter email address..."
              value={criteria.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Phone Search */}
          <div className="space-y-2">
            <Label htmlFor="patient-phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              Phone Number
            </Label>
            <Input
              id="patient-phone"
              type="tel"
              placeholder="Enter phone number..."
              value={criteria.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSearchDisabled || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Patient
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={loading || isSearchDisabled}
            >
              Clear
            </Button>
          </div>

          {/* Help Text */}
          {isSearchDisabled && (
            <p className="text-sm text-gray-500 italic">
              Please enter at least one search criterion
            </p>
          )}
        </form>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Count */}
        {!loading && !error && resultCount > 0 && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ Found <strong>{resultCount}</strong> consultation record{resultCount !== 1 ? 's' : ''} for this patient
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && resultCount === 0 && criteria.name && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              ⚠️ No consultation records found for this patient
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
