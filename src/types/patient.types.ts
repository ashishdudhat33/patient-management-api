// Core patient entity
export interface Patient {
  patientId: string;       // UUID — partition key in Dynamo
  name: string;
  address: Address;
  conditions: string[];    // e.g. ["Diabetes", "Hypertension"]
  allergies: string[];     // e.g. ["Penicillin", "Peanuts"]
  createdAt: string;       // ISO timestamp
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface CreatePatientDTO {
  name: string;
  address: Address;
  conditions: string[];
  allergies: string[];
}

export interface UpdatePatientDTO {
  name?: string;
  address?: Partial<Address>;
  conditions?: string[];
  allergies?: string[];
}

export interface PatientListResponse {
  patients: Patient[];
  count: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
