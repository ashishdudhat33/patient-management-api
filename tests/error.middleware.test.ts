jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/services/patient.service');
jest.mock('../src/services/search.service', () => ({
  searchService: {
    indexPatient: jest.fn().mockResolvedValue(undefined),
    removePatient: jest.fn().mockResolvedValue(undefined),
    searchByCondition: jest.fn().mockResolvedValue([]),
    ensureIndex: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../src/middleware/auth.middleware', () => ({
  requireAuth: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

import request from 'supertest';
import app from '../src/app';
import { patientService } from '../src/services/patient.service';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const mockPatientService = patientService as jest.Mocked<typeof patientService>;
const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

beforeEach(() => jest.clearAllMocks());

// ─── 404 Not Found handler ─────────────────────────────────────────────────

describe('404 handler', () => {
  it('returns 404 for a completely unknown route', async () => {
    const res = await request(app).get('/unknown-route-that-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('returns 404 for unknown POST route', async () => {
    const res = await request(app).post('/completely-unknown');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── 500 error handler ────────────────────────────────────────────────────

describe('500 error handler', () => {
  it('returns 500 when service throws an unexpected error', async () => {
    mockPatientService.getById.mockRejectedValue(new Error('Unexpected DB failure'));

    const res = await request(app).get(`/patients/${VALID_UUID}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unexpected DB failure');
  });

  it('returns 500 when listAll throws', async () => {
    mockPatientService.listAll.mockRejectedValue(new Error('Connection timeout'));

    const res = await request(app).get('/patients');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ─── DynamoDB ConditionalCheckFailedException ─────────────────────────────

describe('ConditionalCheckFailedException handler', () => {
  it('returns 404 when DynamoDB condition check fails on delete', async () => {
    // Simulate DynamoDB throwing ConditionalCheckFailedException
    // (happens when deleting a patient that does not exist)
    const dynamoError = new ConditionalCheckFailedException({
      message: 'The conditional request failed',
      $metadata: {},
    });

    mockPatientService.delete.mockRejectedValue(dynamoError);

    const res = await request(app)
      .delete(`/patients/${VALID_UUID}`)
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('returns 404 when DynamoDB condition check fails on update', async () => {
    const dynamoError = new ConditionalCheckFailedException({
      message: 'The conditional request failed',
      $metadata: {},
    });

    mockPatientService.update.mockRejectedValue(dynamoError);

    const res = await request(app)
      .put(`/patients/${VALID_UUID}`)
      .set('Authorization', 'Bearer fake-token')
      .set('Content-Type', 'application/json')
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});