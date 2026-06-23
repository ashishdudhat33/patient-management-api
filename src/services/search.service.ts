import openSearchClient, { PATIENTS_INDEX } from '../utils/opensearchClient';
import logger from '../utils/logger';
import { Patient } from '../types/patient.types';

export const searchService = {
  async ensureIndex(): Promise<void> {
    const exists = await openSearchClient.indices.exists({ index: PATIENTS_INDEX });

    if (exists.body) {
      logger.debug(`OpenSearch index "${PATIENTS_INDEX}" already exists`);
      return;
    }

    await openSearchClient.indices.create({
      index: PATIENTS_INDEX,
      body: {
        mappings: {
          properties: {
            patientId: { type: 'keyword' },
            name:      { type: 'text', analyzer: 'standard' },
            conditions: {
              type: 'text',
              analyzer: 'standard',
              fields: {
                // keyword sub-field lets us do exact-match aggregations too
                keyword: { type: 'keyword' },
              },
            },
            allergies:  { type: 'keyword' },
            'address.city':    { type: 'keyword' },
            'address.state':   { type: 'keyword' },
            'address.country': { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      },
    });

    logger.info(`OpenSearch index "${PATIENTS_INDEX}" created`);
  },

  // Index (or re-index) a single patient document
  async indexPatient(patient: Patient): Promise<void> {
    await openSearchClient.index({
      index: PATIENTS_INDEX,
      id: patient.patientId,
      body: {
        patientId:  patient.patientId,
        name:       patient.name,
        address:    patient.address,
        conditions: patient.conditions,
        allergies:  patient.allergies,
        createdAt:  patient.createdAt,
        updatedAt:  patient.updatedAt,
      },
      refresh: 'wait_for',
    });

    logger.debug(`Indexed patient: ${patient.patientId}`);
  },

  // Remove a patient from the index when they're deleted
  async removePatient(patientId: string): Promise<void> {
    await openSearchClient.delete({
      index: PATIENTS_INDEX,
      id: patientId,
    });

    logger.debug(`Removed patient from index: ${patientId}`);
  },

  // Full-text search across the conditions field.
  // Uses a multi_match so partial terms work too (e.g. "diab" matches "Diabetes").
  async searchByCondition(query: string): Promise<Patient[]> {
    const response = await openSearchClient.search({
      index: PATIENTS_INDEX,
      body: {
        query: {
          match: {
            conditions: {
              query,
              // fuzziness lets us catch small typos
              fuzziness: 'AUTO',
            },
          },
        },
        size: 50,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hits = response.body.hits.hits as any[];
    return hits.map((hit) => hit._source as Patient);
  },
};
