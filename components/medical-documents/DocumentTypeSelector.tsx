'use client';

// ============================================================================
// DocumentTypeSelector Component
// ============================================================================
// Purpose: Allow users to select document type (biology vs radiology) and subtype
// Used in: Medical documents upload workflow
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DocumentType, 
  BiologyType, 
  RadiologyType,
  BIOLOGY_TYPE_LABELS,
  RADIOLOGY_TYPE_LABELS,
} from '@/lib/medical-documents/types';
import { Microscope, Stethoscope } from 'lucide-react';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface DocumentTypeSelectorProps {
  selectedType: DocumentType | null;
  selectedSubType: BiologyType | RadiologyType | null;
  onTypeChange: (type: DocumentType) => void;
  onSubTypeChange: (subType: BiologyType | RadiologyType) => void;
  disabled?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DocumentTypeSelector({
  selectedType,
  selectedSubType,
  onTypeChange,
  onSubTypeChange,
  disabled = false,
}: DocumentTypeSelectorProps) {
  // Document type options
  const documentTypes = [
    {
      value: 'biology' as DocumentType,
      label: 'Analyses Biologiques',
      description: 'Bilans sanguins, analyses de laboratoire',
      icon: Microscope,
      color: 'blue',
    },
    {
      value: 'radiology' as DocumentType,
      label: 'Imagerie Médicale',
      description: 'Radiographies, scanners, IRM, échographies',
      icon: Stethoscope,
      color: 'purple',
    },
  ];

  // Get subtype options based on selected document type
  const getSubTypeOptions = (): Array<{ value: string; label: string }> => {
    if (selectedType === 'biology') {
      return Object.entries(BIOLOGY_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
      }));
    } else if (selectedType === 'radiology') {
      return Object.entries(RADIOLOGY_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
      }));
    }
    return [];
  };

  const subTypeOptions = getSubTypeOptions();

  return (
    <div className="space-y-6">
      {/* Document Type Selection */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Type de document</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.value;
            
            return (
              <Card
                key={type.value}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? `border-${type.color}-500 border-2 bg-${type.color}-50`
                    : 'hover:border-gray-400'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && onTypeChange(type.value)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div
                      className={`p-3 rounded-lg ${
                        isSelected
                          ? `bg-${type.color}-100 text-${type.color}-600`
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg">{type.label}</h3>
                        {isSelected && (
                          <div className={`w-2 h-2 rounded-full bg-${type.color}-500`} />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* SubType Selection */}
      {selectedType && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <Label className="text-lg font-semibold">
            Type d&apos;analyse spécifique
          </Label>
          <Select
            value={selectedSubType || undefined}
            onValueChange={(value) => onSubTypeChange(value as BiologyType | RadiologyType)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionnez le type d'analyse..." />
            </SelectTrigger>
            <SelectContent>
              {subTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600">
            {selectedType === 'biology'
              ? 'Sélectionnez le type de bilan biologique (NFS, bilan hépatique, etc.)'
              : 'Sélectionnez le type d\'imagerie (radiographie, scanner, IRM, etc.)'}
          </p>
        </div>
      )}

      {/* Helper Text */}
      {!selectedType && (
        <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium mb-2">💡 Conseil</p>
          <p>
            Sélectionnez d&apos;abord le type de document que vous souhaitez analyser. Cela nous
            permettra d&apos;optimiser l&apos;extraction et l&apos;analyse des données.
          </p>
        </div>
      )}
    </div>
  );
}
