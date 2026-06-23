// We mock the DynamoDB client so tests run without any AWS credentials
jest.mock('../src/utils/dynamoClient', () => ({
  __esModule: true,
  default: { send: jest.fn() },
}));

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

import dynamoClient from '../src/utils/dynamoClient';
import { patientService } from '../src/services/patient.service';
import { CreatePatientDTO } from '../src/types/patient.types';

const mockSend = dynamoClient.send as jest.Mock;

// A reusable patient fixture
const samplePatient = {
  patientId: 'test-uuid-1234',
  name: 'Jane Doe',
  address: { street: '123 Main St', city: 'london', state: 'England', zip: 'E1 1AA', country: 'UK' },
  conditions: ['Diabetes', 'Hypertension'],
  allergies: ['Penicillin'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('patientService.create', () => {
  it('should create a patient and return it with a generated ID', async () => {
    mockSend.mockResolvedValueOnce({});

    const dto: CreatePatientDTO = {
      name: 'Jane Doe',
      address: { street: '123 Main St', city: 'london', state: 'England', zip: 'E1 1AA', country: 'UK' },
      conditions: ['Diabetes'],
      allergies: ['Penicillin'],
    };

    const result = await patientService.create(dto);

    expect(result.patientId).toBeDefined();
    expect(result.name).toBe('Jane Doe');
    expect(result.conditions).toContain('Diabetes');
    expect(result.createdAt).toBeDefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});

describe('patientService.getById', () => {
  it('should return a patient when found', async () => {
    mockSend.mockResolvedValueOnce({ Item: samplePatient });

    const result = await patientService.getById('test-uuid-1234');

    expect(result).toEqual(samplePatient);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should return null when patient does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await patientService.getById('non-existent-id');

    expect(result).toBeNull();
  });
});

describe('patientService.update', () => {
  it('should update patient and return the updated record', async () => {
    const updatedPatient = { ...samplePatient, name: 'Jane Updated' };
    mockSend.mockResolvedValueOnce({ Attributes: updatedPatient });

    const result = await patientService.update('test-uuid-1234', { name: 'Jane Updated' });

    expect(result?.name).toBe('Jane Updated');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should return current record when no fields are provided', async () => {
    // If the DTO is empty, service calls getById instead of UpdateCommand
    mockSend.mockResolvedValueOnce({ Item: samplePatient });

    const result = await patientService.update('test-uuid-1234', {});

    expect(result).toEqual(samplePatient);
  });
});

describe('patientService.delete', () => {
  it('should delete a patient and return true', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await patientService.delete('test-uuid-1234');

    expect(result).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});

describe('patientService.findByCity', () => {
  it('should return patients matching the city', async () => {
    mockSend.mockResolvedValueOnce({ Items: [samplePatient] });

    const result = await patientService.findByCity('london');

    expect(result).toHaveLength(1);
    expect(result[0].address.city).toBe('london');
  });

  it('should return empty array when no patients found', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await patientService.findByCity('nonexistent-city');

    expect(result).toEqual([]);
  });
});

describe('patientService.findByCondition', () => {
  it('should return patients with the matching condition', async () => {
    mockSend.mockResolvedValueOnce({ Items: [samplePatient] });

    const result = await patientService.findByCondition('Diabetes');

    expect(result).toHaveLength(1);
    expect(result[0].conditions).toContain('Diabetes');
  });
});
