// Session
export interface SessionCreatedResponse {
  correlationId: string;
}

// Clinical Form Request
export interface PatientComplaintDto {
  description: string;  // required, min 1 char
  duration: string;     // required, min 1 char
  severity: string;     // required, "mild" | "moderate" | "severe"
}

export interface VitalSignsDto {
  heartRate?: number;        // int32
  systolicBp?: number;       // int32
  diastolicBp?: number;      // int32
  temperature?: number;      // double
  oxygenSaturation?: number; // int32
}

export interface MedicalHistoryDto {
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
}

export interface ClinicalFormRequest {
  complaint: PatientComplaintDto;
  vitalSigns: VitalSignsDto;
  medicalHistory: MedicalHistoryDto;
}

// Triage Result Response
export interface TriageResultResponse {
  triageLevel: string;       // "LOW" | "MEDIUM" | "HIGH"
  riskFactors: string[];
  inconsistencies: string[];
  notesForPhysician: string;
  confidence: number;        // 0.0 to 1.0
}

// WebRTC Signaling
export interface WebRTCOfferRequest {
  correlationId: string;
  sdp: string;
  type: string;
}

export interface WebRTCAnswerResponse {
  sdp: string;
  type: string;
}

// UI Status
export type UiStatus = 'INIT' | 'STREAMING' | 'SUBMITTED' | 'DONE';
