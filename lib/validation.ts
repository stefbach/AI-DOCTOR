import { z } from "zod";

// Schema for vital signs with physiological ranges
export const vitalSignsSchema = z.object({
  temperature: z.coerce.number().min(30).max(45).optional(),
  heartRate: z.coerce.number().int().min(30).max(220).optional(),
  respiratoryRate: z.coerce.number().int().min(5).max(60).optional(),
  oxygenSaturation: z.coerce.number().min(50).max(100).optional(),
  bloodPressureSystolic: z.coerce.number().int().min(50).max(250).optional(),
  bloodPressureDiastolic: z.coerce.number().int().min(30).max(150).optional(),
});

// Patient data schema including age and gestational age checks
export const patientDataSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  age: z.coerce
    .number()
    .int()
    .min(0, { message: "Age must be at least 0" })
    .max(120, { message: "Age must be ≤ 120" }),
  gender: z.string().optional(),
  weight: z.coerce.number().min(0).max(300).optional(),
  height: z.coerce.number().min(0).max(250).optional(),
  pregnancyStatus: z
    .enum(["pregnant", "possibly_pregnant", "breastfeeding", "not_pregnant"])
    .optional(),
  gestationalAge: z.coerce.number().int().min(0).max(42).optional(),
});

// Clinical data schema with vital signs
export const clinicalDataSchema = z.object({
  chiefComplaint: z.string().optional(),
  diseaseHistory: z.string().optional(),
  symptomDuration: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  painScale: z.coerce.number().int().min(0).max(10).optional(),
  vitalSigns: vitalSignsSchema.optional(),
});

export function validatePatientAndClinical(patientData: unknown, clinicalData: unknown) {
  const patientResult = patientDataSchema.safeParse(patientData);
  if (!patientResult.success) {
    return {
      success: false as const,
      source: "patientData" as const,
      errors: patientResult.error.flatten().fieldErrors,
    };
  }

  const clinicalResult = clinicalDataSchema.safeParse(clinicalData);
  if (!clinicalResult.success) {
    return {
      success: false as const,
      source: "clinicalData" as const,
      errors: clinicalResult.error.flatten().fieldErrors,
    };
  }

  return {
    success: true as const,
    data: {
      patientData: patientResult.data,
      clinicalData: clinicalResult.data,
    },
  };
}
