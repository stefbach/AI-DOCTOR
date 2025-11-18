// ============================================================================
// Medical Documents Module - Utility Functions
// ============================================================================
// Purpose: Shared utility functions for document processing, validation, and formatting
// Used by: Components, APIs, and workflows throughout the medical documents module
// ============================================================================

import {
  DocumentType,
  BiologyType,
  RadiologyType,
  DocumentStatus,
  ResultStatus,
  BiologyResult,
  MedicalDocument,
  BiologyDocument,
  RadiologyDocument,
  BIOLOGY_TYPE_LABELS,
  RADIOLOGY_TYPE_LABELS,
  STATUS_COLORS,
  RESULT_STATUS_COLORS,
} from './types';

// ============================================================================
// DOCUMENT ID GENERATION
// ============================================================================

/**
 * Generate unique document ID
 * Format: DOC-{type}-{timestamp}-{random}
 */
export function generateDocumentId(type: DocumentType): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DOC-${type.toUpperCase()}-${timestamp}-${random}`;
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format ISO date to English locale date string
 * Example: "2024-11-18" → "18 November 2024"
 */
export function formatDateEnglish(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * @deprecated Use formatDateEnglish instead
 */
export function formatDateFrench(isoDate: string): string {
  return formatDateEnglish(isoDate);
}

/**
 * Format ISO date to short format
 * Example: "2024-11-18T10:30:00" → "18/11/2024"
 */
export function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format ISO timestamp to date and time
 * Example: "2024-11-18T10:30:00" → "18/11/2024 at 10:30"
 */
export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDateShort(isoTimestamp);
}

// ============================================================================
// LABEL FORMATTING
// ============================================================================

/**
 * Get human-readable label for document type
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  return type === 'biology' ? 'Biology' : 'Radiology';
}

/**
 * Get human-readable label for biology type
 */
export function getBiologyTypeLabel(type: BiologyType): string {
  return BIOLOGY_TYPE_LABELS[type] || type;
}

/**
 * Get human-readable label for radiology type
 */
export function getRadiologyTypeLabel(type: RadiologyType): string {
  return RADIOLOGY_TYPE_LABELS[type] || type;
}

/**
 * Get human-readable label for document status
 */
export function getStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    pending: 'Pending',
    extracting: 'Extracting',
    analyzing: 'Analyzing',
    completed: 'Completed',
    error: 'Error',
  };
  return labels[status] || status;
}

/**
 * Get human-readable label for result status
 */
export function getResultStatusLabel(status: ResultStatus): string {
  const labels: Record<ResultStatus, string> = {
    normal: 'Normal',
    low: 'Low',
    high: 'High',
    critical: 'Critical',
    unknown: 'Unknown',
  };
  return labels[status] || status;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Get Tailwind color class for document status
 */
export function getStatusColor(status: DocumentStatus): string {
  return STATUS_COLORS[status] || 'gray';
}

/**
 * Get Tailwind color class for result status
 */
export function getResultStatusColor(status: ResultStatus): string {
  return RESULT_STATUS_COLORS[status] || 'gray';
}

/**
 * Get badge color classes for status
 */
export function getStatusBadgeClasses(status: DocumentStatus): string {
  const colorMap: Record<DocumentStatus, string> = {
    pending: 'bg-gray-100 text-gray-800 border-gray-300',
    extracting: 'bg-blue-100 text-blue-800 border-blue-300',
    analyzing: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300',
  };
  return colorMap[status] || colorMap.pending;
}

/**
 * Get badge color classes for result status
 */
export function getResultStatusBadgeClasses(status: ResultStatus): string {
  const colorMap: Record<ResultStatus, string> = {
    normal: 'bg-green-100 text-green-800 border-green-300',
    low: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
    unknown: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  return colorMap[status] || colorMap.unknown;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate if a string is a valid ISO date
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate document ID format
 */
export function isValidDocumentId(id: string): boolean {
  return /^DOC-(BIOLOGY|RADIOLOGY)-\d+-[A-Z0-9]{6}$/.test(id);
}

/**
 * Validate base64 image data
 */
export function isValidBase64Image(base64: string): boolean {
  // Check if string starts with data:image
  if (!base64.startsWith('data:image/')) return false;
  
  // Extract base64 content after comma
  const base64Content = base64.split(',')[1];
  if (!base64Content) return false;
  
  // Check if valid base64
  try {
    atob(base64Content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate confidence score (0-1)
 */
export function isValidConfidence(confidence: number): boolean {
  return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
}

// ============================================================================
// BIOLOGY RESULT UTILITIES
// ============================================================================

/**
 * Determine result status based on value and reference range
 * Simple heuristic implementation
 */
export function determineResultStatus(
  value: string | number,
  referenceRange?: string
): ResultStatus {
  if (!referenceRange) return 'unknown';
  
  // Parse numeric value
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numericValue)) return 'unknown';
  
  // Try to parse reference range (e.g., "3.5-5.5", "<10", ">100")
  const rangeMatch = referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
  if (rangeMatch) {
    const [, min, max] = rangeMatch;
    const minValue = parseFloat(min);
    const maxValue = parseFloat(max);
    
    if (numericValue < minValue * 0.5 || numericValue > maxValue * 2) {
      return 'critical';
    } else if (numericValue < minValue) {
      return 'low';
    } else if (numericValue > maxValue) {
      return 'high';
    }
    return 'normal';
  }
  
  // Handle "< value" or "> value" patterns
  const lessThanMatch = referenceRange.match(/<\s*([\d.]+)/);
  if (lessThanMatch) {
    const threshold = parseFloat(lessThanMatch[1]);
    return numericValue < threshold ? 'normal' : 'high';
  }
  
  const greaterThanMatch = referenceRange.match(/>\s*([\d.]+)/);
  if (greaterThanMatch) {
    const threshold = parseFloat(greaterThanMatch[1]);
    return numericValue > threshold ? 'normal' : 'low';
  }
  
  return 'unknown';
}

/**
 * Count abnormal results in biology document
 */
export function countAbnormalResults(results: BiologyResult[]): number {
  return results.filter(r => r.status !== 'normal' && r.status !== 'unknown').length;
}

/**
 * Get critical results from biology document
 */
export function getCriticalResults(results: BiologyResult[]): BiologyResult[] {
  return results.filter(r => r.status === 'critical');
}

/**
 * Check if biology document has any critical results
 */
export function hasCriticalResults(results: BiologyResult[]): boolean {
  return results.some(r => r.status === 'critical');
}

// ============================================================================
// DOCUMENT FILTERING & SORTING
// ============================================================================

/**
 * Filter documents by type
 */
export function filterByDocumentType(
  documents: MedicalDocument[],
  type: DocumentType
): MedicalDocument[] {
  return documents.filter(doc => doc.type === type);
}

/**
 * Filter biology documents by subtype
 */
export function filterByBiologyType(
  documents: MedicalDocument[],
  biologyType: BiologyType
): BiologyDocument[] {
  return documents.filter(
    (doc): doc is BiologyDocument => 
      doc.type === 'biology' && doc.biologyType === biologyType
  );
}

/**
 * Filter radiology documents by subtype
 */
export function filterByRadiologyType(
  documents: MedicalDocument[],
  radiologyType: RadiologyType
): RadiologyDocument[] {
  return documents.filter(
    (doc): doc is RadiologyDocument => 
      doc.type === 'radiology' && doc.radiologyType === radiologyType
  );
}

/**
 * Sort documents by examination date (newest first)
 */
export function sortByDateDesc(documents: MedicalDocument[]): MedicalDocument[] {
  return [...documents].sort((a, b) => {
    return new Date(b.examinationDate).getTime() - new Date(a.examinationDate).getTime();
  });
}

/**
 * Sort documents by examination date (oldest first)
 */
export function sortByDateAsc(documents: MedicalDocument[]): MedicalDocument[] {
  return [...documents].sort((a, b) => {
    return new Date(a.examinationDate).getTime() - new Date(b.examinationDate).getTime();
  });
}

// ============================================================================
// FILE HANDLING UTILITIES
// ============================================================================

/**
 * Convert file to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate file type (must be image)
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Validate file size (max 10MB)
 */
export function isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// TEXT EXTRACTION UTILITIES
// ============================================================================

/**
 * Extract patient name from text using common patterns
 */
export function extractPatientName(text: string): string | null {
  const patterns = [
    /(?:patient|nom|name)[\s:]+([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+)+)/i,
    /^([A-Z][A-Z\s]+)$/m, // All caps name
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract date from text using common patterns
 */
export function extractDate(text: string): string | null {
  const patterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,  // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,  // YYYY/MM/DD or YYYY-MM-DD
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Try to construct valid ISO date
      const [, p1, p2, p3] = match;
      
      // Check if format is YYYY-MM-DD
      if (p1.length === 4) {
        const isoDate = `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
        if (isValidISODate(isoDate)) return isoDate;
      }
      
      // Assume DD/MM/YYYY format for Mauritius
      const isoDate = `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
      if (isValidISODate(isoDate)) return isoDate;
    }
  }
  
  return null;
}

// ============================================================================
// CONFIDENCE SCORE UTILITIES
// ============================================================================

/**
 * Calculate overall confidence based on multiple factors
 */
export function calculateConfidence(factors: {
  ocrQuality?: number;        // 0-1
  dataCompleteness?: number;  // 0-1
  structureMatch?: number;    // 0-1
}): number {
  const weights = {
    ocrQuality: 0.4,
    dataCompleteness: 0.4,
    structureMatch: 0.2,
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  if (factors.ocrQuality !== undefined) {
    weightedSum += factors.ocrQuality * weights.ocrQuality;
    totalWeight += weights.ocrQuality;
  }
  
  if (factors.dataCompleteness !== undefined) {
    weightedSum += factors.dataCompleteness * weights.dataCompleteness;
    totalWeight += weights.dataCompleteness;
  }
  
  if (factors.structureMatch !== undefined) {
    weightedSum += factors.structureMatch * weights.structureMatch;
    totalWeight += weights.structureMatch;
  }
  
  return totalWeight > 0 ? Math.min(1, weightedSum / totalWeight) : 0;
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'Excellent';
  if (confidence >= 0.75) return 'Good';
  if (confidence >= 0.5) return 'Average';
  return 'Low';
}

/**
 * Get confidence color
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'green';
  if (confidence >= 0.75) return 'blue';
  if (confidence >= 0.5) return 'yellow';
  return 'red';
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Export all utility functions for easy importing
 */
export const DocumentUtils = {
  // ID Generation
  generateDocumentId,
  
  // Date Formatting
  formatDateEnglish,
  formatDateFrench, // deprecated, use formatDateEnglish
  formatDateShort,
  formatDateTime,
  getRelativeTime,
  
  // Label Formatting
  getDocumentTypeLabel,
  getBiologyTypeLabel,
  getRadiologyTypeLabel,
  getStatusLabel,
  getResultStatusLabel,
  
  // Color Utilities
  getStatusColor,
  getResultStatusColor,
  getStatusBadgeClasses,
  getResultStatusBadgeClasses,
  
  // Validation
  isValidISODate,
  isValidDocumentId,
  isValidBase64Image,
  isValidConfidence,
  
  // Biology Results
  determineResultStatus,
  countAbnormalResults,
  getCriticalResults,
  hasCriticalResults,
  
  // Filtering & Sorting
  filterByDocumentType,
  filterByBiologyType,
  filterByRadiologyType,
  sortByDateDesc,
  sortByDateAsc,
  
  // File Handling
  fileToBase64,
  isValidImageFile,
  isValidFileSize,
  formatFileSize,
  
  // Text Extraction
  extractPatientName,
  extractDate,
  
  // Confidence
  calculateConfidence,
  getConfidenceLabel,
  getConfidenceColor,
};
