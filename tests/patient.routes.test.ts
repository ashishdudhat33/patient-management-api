// Mock all external dependencies so we only test the route/controller layer
jest.mock('../src/services/patient.service');
jest.mock('../src/services/search.service');
jest.mock('../src/middleware/auth.middleware', () => ({
  requireAuth: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

import request from 'supertest';
import app from '../src/app';
import { patientService } from '../src/services/patient.service';

const mockPatientService = patientService as jest.Mocked<typeof patientService>;

const samplePatient = {
  patientId: 'abc-123',
  name: 'John Smith',
  address: { street: '1 Elm St', city: 'Manchester', state: 'England', zip: 'M1 1AE', country: 'UK' },
  conditions: ['Asthma'],
  allergies: ['Aspirin'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => jest.clearAllMocks());

describe('GET /patients', () => {
  it('returns a list of all patients', async () => {
    mockPatientService.listAll.mockResolvedValue([samplePatient]);

    const res = await request(app).get('/patients');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });
});

describe('GET /patients/:id', () => {
  it('returns 200 and the patient when found', async () => {
    mockPatientService.getById.mockResolvedValue(samplePatient);

    const res = await request(app).get('/patients/abc-123');

    expect(res.status).toBe(200);
    expect(res.body.data.patientId).toBe('abc-123');
  });

  it('returns 404 when patient does not exist', async () => {
    mockPatientService.getById.mockResolvedValue(null);

    const res = await request(app).get('/patients/abc-123');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 for an invalid UUID format', async () => {
    const res = await request(app).get('/patients/not-a-uuid');

    expect(res.status).toBe(422);
  });
});

describe('POST /patients', () => {
  it('creates a patient and returns 201', async () => {
    mockPatientService.create.mockResolvedValue(samplePatient);

    const res = await request(app)
      .post('/patients')
      .set('Authorization', 'Bearer fake-token')
      .send({
        name: 'John Smith',
        address: { street: '1 Elm St', city: 'Manchester', state: 'England', zip: 'M1 1AE', country: 'UK' },
        conditions: ['Asthma'],
        allergies: ['Aspirin'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('John Smith');
  });

  it('returns 422 when required fields are missing', async () => {
    const res = await request(app)
      .post('/patients')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'No address here' });

    expect(res.status).toBe(422);
  });
});

describe('GET /patients/query/by-address', () => {
  it('returns patients by city', async () => {
    mockPatientService.findByCity.mockResolvedValue([samplePatient]);

    const res = await request(app).get('/patients/query/by-address?city=Manchester');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 422 when city query param is missing', async () => {
    const res = await request(app).get('/patients/query/by-address');

    expect(res.status).toBe(422);
  });
});

describe('DELETE /patients/:id', () => {
  it('deletes patient and returns success message', async () => {
    mockPatientService.delete.mockResolvedValue(true);

    const res = await request(app)
      .delete('/patients/abc-123')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
  });
});
