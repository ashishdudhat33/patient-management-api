import { Client } from '@opensearch-project/opensearch';
console.log('Connecting to OpenSearch at', process.env.OPENSEARCH_ENDPOINT || 'http://localhost:9200');
console.log('Using OpenSearch index', process.env.OPENSEARCH_INDEX || 'patients');
console.log('Using OpenSearch username', process.env.OPENSEARCH_USERNAME || '(none)');
console.log('Using OpenSearch password', process.env.OPENSEARCH_PASSWORD ? '***' : '(none)');


const openSearchClient = new Client({
  node: process.env.OPENSEARCH_ENDPOINT || 'http://localhost:9200',
  auth: {
    username: process.env.OPENSEARCH_USERNAME || '',
    password: process.env.OPENSEARCH_PASSWORD || '',
  },
  ssl: {
    rejectUnauthorized: false,
  },
});

export const PATIENTS_INDEX = process.env.OPENSEARCH_INDEX || 'patients';

export default openSearchClient;
