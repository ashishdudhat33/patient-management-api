import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import dynamoClient from '../utils/dynamoClient';
import logger from '../utils/logger';
import { Patient, CreatePatientDTO, UpdatePatientDTO } from '../types/patient.types';

const TABLE = process.env.DYNAMODB_TABLE_NAME || 'patients';

export const patientService = {
  // ─── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreatePatientDTO): Promise<Patient> {
    const now = new Date().toISOString();

    const patient: Patient = {
      patientId: uuidv4(),
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE,
        Item: patient,
        // Prevent accidentally overwriting an existing record with the same UUID (extremely unlikely but safe)
        ConditionExpression: 'attribute_not_exists(patientId)',
      })
    );

    logger.info(`Patient created: ${patient.patientId}`);
    return patient;
  },

  // ─── Read one ──────────────────────────────────────────────────────────────

  async getById(patientId: string): Promise<Patient | null> {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { patientId },
      })
    );

    return (result.Item as Patient) || null;
  },

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(patientId: string, dto: UpdatePatientDTO): Promise<Patient | null> {
    // Build a dynamic UpdateExpression from whatever fields were passed
    const expressionParts: string[] = [];
    const attrNames: Record<string, string> = {};
    const attrValues: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      expressionParts.push('#name = :name');
      attrNames['#name'] = 'name';
      attrValues[':name'] = dto.name;
    }

    if (dto.address !== undefined) {
      expressionParts.push('#address = :address');
      attrNames['#address'] = 'address';
      attrValues[':address'] = dto.address;
    }

    if (dto.conditions !== undefined) {
      expressionParts.push('#conditions = :conditions');
      attrNames['#conditions'] = 'conditions';
      attrValues[':conditions'] = dto.conditions;
    }

    if (dto.allergies !== undefined) {
      expressionParts.push('#allergies = :allergies');
      attrNames['#allergies'] = 'allergies';
      attrValues[':allergies'] = dto.allergies;
    }

    if (expressionParts.length === 0) {
      // Nothing to update — just return current record
      return this.getById(patientId);
    }

    // Always bump updatedAt
    expressionParts.push('#updatedAt = :updatedAt');
    attrNames['#updatedAt'] = 'updatedAt';
    attrValues[':updatedAt'] = new Date().toISOString();

    const result = await dynamoClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { patientId },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: attrNames,
        ExpressionAttributeValues: attrValues,
        ConditionExpression: 'attribute_exists(patientId)',
        ReturnValues: 'ALL_NEW',
      })
    );

    logger.info(`Patient updated: ${patientId}`);
    return result.Attributes as Patient;
  },

  // ─── Delete ────────────────────────────────────────────────────────────────

  async delete(patientId: string): Promise<boolean> {
    await dynamoClient.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { patientId },
        ConditionExpression: 'attribute_exists(patientId)',
      })
    );

    logger.info(`Patient deleted: ${patientId}`);
    return true;
  },

  // ─── Query by city (uses GSI: address.city-index) ─────────────────────────
  // DynamoDB GSI on address.city allows O(1) lookups instead of full table scans.
  // The GSI is defined as: PK = addressCity (projected from address.city at write time)

  async findByCity(city: string): Promise<Patient[]> {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'addressCity-index',
        KeyConditionExpression: 'addressCity = :city',
        ExpressionAttributeValues: { ':city': city.toLowerCase() },
      })
    );

    return (result.Items as Patient[]) || [];
  },

  // ─── Scan by condition (fallback for DynamoDB — prefer OpenSearch for this) ─

  async findByCondition(condition: string): Promise<Patient[]> {
    // FilterExpression scans the whole table — this is intentionally here as a
    // fallback. Real production traffic should hit the OpenSearch endpoint instead.
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'contains(conditions, :cond)',
        ExpressionAttributeValues: { ':cond': condition },
      })
    );

    return (result.Items as Patient[]) || [];
  },

  // ─── List all (admin use) ─────────────────────────────────────────────────

  async listAll(): Promise<Patient[]> {
    const result = await dynamoClient.send(new ScanCommand({ TableName: TABLE }));
    return (result.Items as Patient[]) || [];
  },
};
