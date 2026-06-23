// Core patient entity — matches what we store in DynamoDB
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

// What the client sends when creating a patient — no ID yet, timestamps handled by us
export interface CreatePatientDTO {
  name: string;
  address: Address;
  conditions: string[];
  allergies: string[];
}

// All fields optional for partial updates
export interface UpdatePatientDTO {
  name?: string;
  address?: Partial<Address>;
  conditions?: string[];
  allergies?: string[];
}

// Shape of a search/query result list
export interface PatientListResponse {
  patients: Patient[];
  count: number;
}

// Generic API response wrapper — keeps responses consistent across all endpoints
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
