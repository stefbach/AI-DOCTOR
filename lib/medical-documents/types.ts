// ============================================================================
// Medical Documents Module - TypeScript Type Definitions
// ============================================================================
// Purpose: Complete type definitions for Biology and Radiology document analysis
// Used by: All medical documents components, APIs, and workflows
// ============================================================================

// ============================================================================
// CORE DOCUMENT TYPES
// ============================================================================

/**
 * Main document category types
 */
export type DocumentType = 'biology' | 'radiology';

/**
 * Document upload status tracking
 */
export type DocumentStatus = 
  | 'pending'      // Initial upload
  | 'extracting'   // OCR in progress
  | 'analyzing'    // AI analysis in progress
  | 'completed'    // Analysis complete
  | 'error';       // Error occurred

// ============================================================================
// BIOLOGY DOCUMENT TYPES
// ============================================================================

/**
 * All supported biology examination types
 * Based on Mauritian medical practice standards
 */
export type BiologyType =
  | 'blood_count'           // Numération formule sanguine (NFS)
  | 'lipid_profile'         // Bilan lipidique
  | 'liver_function'        // Bilan hépatique
  | 'kidney_function'       // Bilan rénal
  | 'thyroid_function'      // Bilan thyroïdien
  | 'diabetes'              // Bilan diabétique (glycémie, HbA1c)
  | 'electrolytes'          // Ionogramme
  | 'coagulation'           // Bilan de coagulation
  | 'inflammatory'          // Marqueurs inflammatoires (CRP, VS)
  | 'tumor_markers'         // Marqueurs tumoraux
  | 'hormones'              // Dosages hormonaux
  | 'vitamins'              // Dosages vitaminiques
  | 'other_biology';        // Autres analyses biologiques

/**
 * Biology document structure with extracted data
 */
export interface BiologyDocument {
  id: string;
  type: 'biology';
  biologyType: BiologyType;
  patientId?: string;
  patientName?: string;
  examinationDate: string;        // ISO date format
  laboratoryName?: string;
  prescribingDoctor?: string;
  
  // Raw data
  rawText: string;                // OCR extracted text
  imageUrl?: string;              // Original document image URL
  
  // Extracted results
  results: BiologyResult[];
  
  // Analysis metadata
  status: DocumentStatus;
  uploadedAt: string;             // ISO timestamp
  analyzedAt?: string;            // ISO timestamp
  confidence: number;             // 0-1 confidence score
  
  // Integration with patient record
  consultationId?: string;
  notes?: string;
}

/**
 * Individual biology test result
 */
export interface BiologyResult {
  testName: string;               // e.g., "Hémoglobine", "Glycémie"
  value: string | number;         // Measured value
  unit: string;                   // e.g., "g/dL", "mmol/L"
  referenceRange?: string;        // Normal range
  status: ResultStatus;           // Normal, low, high, critical
  flagged: boolean;               // Abnormal result flag
}

/**
 * Result status indicator
 */
export type ResultStatus = 'normal' | 'low' | 'high' | 'critical' | 'unknown';

// ============================================================================
// RADIOLOGY DOCUMENT TYPES
// ============================================================================

/**
 * All supported radiology examination types
 * Based on Mauritian medical practice standards
 */
export type RadiologyType =
  | 'xray'                  // Radiographie
  | 'ct_scan'               // Scanner (TDM)
  | 'mri'                   // IRM
  | 'ultrasound'            // Échographie
  | 'mammography'           // Mammographie
  | 'other_radiology';      // Autres imageries

/**
 * Radiology document structure with extracted data
 */
export interface RadiologyDocument {
  id: string;
  type: 'radiology';
  radiologyType: RadiologyType;
  patientId?: string;
  patientName?: string;
  examinationDate: string;        // ISO date format
  radiologyCenter?: string;
  radiologist?: string;
  prescribingDoctor?: string;
  
  // Raw data
  rawText: string;                // OCR extracted text
  imageUrl?: string;              // Original document image URL
  
  // Extracted findings
  bodyPart: string;               // Anatomical region examined
  technique: string;              // Imaging technique used
  findings: string;               // Main findings (findings section)
  impression: string;             // Radiologist's impression/conclusion
  recommendations?: string;       // Follow-up recommendations
  
  // Analysis metadata
  status: DocumentStatus;
  uploadedAt: string;             // ISO timestamp
  analyzedAt?: string;            // ISO timestamp
  confidence: number;             // 0-1 confidence score
  
  // Integration with patient record
  consultationId?: string;
  notes?: string;
}

// ============================================================================
// UNIFIED DOCUMENT TYPE
// ============================================================================

/**
 * Union type for all document types
 * Used for polymorphic document handling
 */
export type MedicalDocument = BiologyDocument | RadiologyDocument;

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * OCR/Extraction API Request
 */
export interface ExtractRequest {
  imageData: string;              // Base64 encoded image
  documentType: DocumentType;     // 'biology' or 'radiology'
  subType?: BiologyType | RadiologyType; // Optional specific type
  patientId?: string;
}

/**
 * OCR/Extraction API Response
 */
export interface ExtractResponse {
  success: boolean;
  data?: {
    rawText: string;
    extractedData: Partial<BiologyDocument> | Partial<RadiologyDocument>;
    confidence: number;
  };
  error?: string;
}

/**
 * Analysis API Request
 */
export interface AnalyzeRequest {
  documentId: string;
  documentType: DocumentType;
  extractedText: string;
  subType?: BiologyType | RadiologyType;
  patientContext?: {
    age?: number;
    gender?: 'male' | 'female' | 'other';
    chronicDiseases?: string[];
    currentMedications?: string[];
  };
}

/**
 * Analysis API Response
 */
export interface AnalyzeResponse {
  success: boolean;
  data?: {
    document: MedicalDocument;
    clinicalSignificance: ClinicalSignificance;
    recommendations: string[];
  };
  error?: string;
}

/**
 * Clinical significance assessment
 */
export interface ClinicalSignificance {
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  keyFindings: string[];
  abnormalResults: BiologyResult[];  // For biology
  criticalAlerts: string[];
  requiresUrgentAction: boolean;
  summary: string;
}

// ============================================================================
// WORKFLOW & UI TYPES
// ============================================================================

/**
 * Document upload workflow steps
 */
export interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

/**
 * Document filter options for display
 */
export interface DocumentFilters {
  documentType?: DocumentType;
  biologyType?: BiologyType;
  radiologyType?: RadiologyType;
  dateFrom?: string;
  dateTo?: string;
  status?: DocumentStatus;
  patientId?: string;
}

/**
 * Document sorting options
 */
export interface DocumentSort {
  field: 'examinationDate' | 'uploadedAt' | 'patientName' | 'status';
  order: 'asc' | 'desc';
}

/**
 * Paginated document list response
 */
export interface DocumentListResponse {
  documents: MedicalDocument[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * Integration with consultation workflow
 */
export interface ConsultationDocumentLink {
  consultationId: string;
  documentId: string;
  documentType: DocumentType;
  linkedAt: string;               // ISO timestamp
  linkedBy: string;               // User ID
  notes?: string;
}

/**
 * Patient document history summary
 */
export interface PatientDocumentSummary {
  patientId: string;
  totalDocuments: number;
  biologyDocuments: number;
  radiologyDocuments: number;
  latestDocuments: MedicalDocument[];
  criticalFindings: number;
  lastUpdated: string;            // ISO timestamp
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

/**
 * Standard error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  details?: Record<string, unknown>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Document type configuration
 */
export interface DocumentTypeConfig {
  type: DocumentType;
  label: string;
  description: string;
  icon: string;
  color: string;
  subTypes: Array<{
    value: BiologyType | RadiologyType;
    label: string;
    description: string;
  }>;
}

/**
 * OpenAI API configuration for document analysis
 */
export interface AIAnalysisConfig {
  model: 'gpt-4o' | 'gpt-4o-mini';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

// ============================================================================
// UTILITY TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if document is BiologyDocument
 */
export function isBiologyDocument(doc: MedicalDocument): doc is BiologyDocument {
  return doc.type === 'biology';
}

/**
 * Type guard to check if document is RadiologyDocument
 */
export function isRadiologyDocument(doc: MedicalDocument): doc is RadiologyDocument {
  return doc.type === 'radiology';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Biology type labels (English for Mauritius)
 */
export const BIOLOGY_TYPE_LABELS: Record<BiologyType, string> = {
  blood_count: 'Complete Blood Count (CBC)',
  lipid_profile: 'Lipid Profile',
  liver_function: 'Liver Function Tests',
  kidney_function: 'Kidney Function Tests',
  thyroid_function: 'Thyroid Function Tests',
  diabetes: 'Diabetes Tests',
  electrolytes: 'Electrolytes',
  coagulation: 'Coagulation Tests',
  inflammatory: 'Inflammatory Markers',
  tumor_markers: 'Tumor Markers',
  hormones: 'Hormone Tests',
  vitamins: 'Vitamin Tests',
  other_biology: 'Other Tests',
};

/**
 * Radiology type labels (English for Mauritius)
 */
export const RADIOLOGY_TYPE_LABELS: Record<RadiologyType, string> = {
  xray: 'X-Ray',
  ct_scan: 'CT Scan',
  mri: 'MRI',
  ultrasound: 'Ultrasound',
  mammography: 'Mammography',
  other_radiology: 'Other Imaging',
};

/**
 * Status color mapping for UI
 */
export const STATUS_COLORS: Record<DocumentStatus, string> = {
  pending: 'gray',
  extracting: 'blue',
  analyzing: 'yellow',
  completed: 'green',
  error: 'red',
};

/**
 * Result status color mapping for UI
 */
export const RESULT_STATUS_COLORS: Record<ResultStatus, string> = {
  normal: 'green',
  low: 'yellow',
  high: 'orange',
  critical: 'red',
  unknown: 'gray',
};
