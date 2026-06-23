import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Connects directly to real AWS DynamoDB using credentials from environment variables.
// AWS SDK automatically reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION
// from process.env — no need to pass them manually.
const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
});

// DocumentClient handles marshalling/unmarshalling automatically — no need to deal with {S: "value"} syntax
const dynamoClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

export default dynamoClient;