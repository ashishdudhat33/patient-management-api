import awsServerlessExpress from 'aws-serverless-express';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import app from './app';

// Wrap the Express app so it can run inside a Lambda function.
// aws-serverless-express translates API Gateway events into regular HTTP requests.
const server = awsServerlessExpress.createServer(app);

export const handler = (event: APIGatewayProxyEvent, context: Context) => {
  // Reuse Lambda execution context across warm invocations — avoids cold-start overhead
  context.callbackWaitsForEmptyEventLoop = false;
  awsServerlessExpress.proxy(server, event, context);
};
