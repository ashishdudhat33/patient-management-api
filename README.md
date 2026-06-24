# Patient Management API

A REST API for managing patient records built with Node.js, TypeScript, and Express. Uses AWS DynamoDB for storage, Cognito for authentication, and OpenSearch for full-text search — all designed to run as a serverless function on AWS Lambda.

---

## What It Does

- Full CRUD for patient records (name, address, conditions, allergies)
- JWT-based auth via AWS Cognito — only authenticated users can write data
- Query patients by city using a DynamoDB GSI (fast, no table scan)
- Search patients by medical condition using AWS OpenSearch (fuzzy matching)
- Runs locally with `npm run dev` or deploys to Lambda with zero code changes

---

## Tech Stack

- **Runtime** — Node.js 18 + TypeScript
- **Framework** — Express.js
- **Database** — AWS DynamoDB
- **Auth** — AWS Cognito (JWT / JWKS verification)
- **Search** — AWS OpenSearch Service
- **Deployment** — AWS Lambda + API Gateway
- **Tests** — Jest + ts-jest + Supertest
- **Logging** — Winston

---

## Project Structure

```
src/
├── controllers/
│   └── patient.controller.ts     # handles HTTP layer, calls services
├── middleware/
│   ├── auth.middleware.ts         # Cognito JWT verification
│   ├── validate.middleware.ts     # request validation rules
│   └── error.middleware.ts        # centralised error handling
├── routes/
│   ├── patient.routes.ts          # all /patients endpoints
│   └── health.routes.ts           # GET /health
├── services/
│   ├── patient.service.ts         # DynamoDB operations
│   └── search.service.ts          # OpenSearch operations
├── types/
│   └── patient.types.ts           # TypeScript interfaces
├── utils/
│   ├── dynamoClient.ts            # DynamoDB client setup
│   ├── opensearchClient.ts        # OpenSearch client setup
│   └── logger.ts                  # Winston logger
├── app.ts                         # Express app setup
├── index.ts                       # local dev server entry point
└── lambda.ts                      # AWS Lambda handler
tests/
├── patient.service.test.ts        # unit tests for service layer
├── patient.routes.test.ts         # route/controller tests
└── error.middleware.test.ts       # error handler + 404 tests
docs/
└── Patient Management API.postman_collection.json
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- An AWS account with DynamoDB, Cognito, and OpenSearch set up
- AWS credentials (Access Key ID + Secret)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root of the project:

```env
PORT=3000
NODE_ENV=development

AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

DYNAMODB_TABLE_NAME=patients

COGNITO_USER_POOL_ID=eu-north-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=eu-north-1

OPENSEARCH_ENDPOINT=https://search-patient-search-xxx.eu-north-1.es.amazonaws.com
OPENSEARCH_INDEX=patients
OPENSEARCH_USERNAME=username
OPENSEARCH_PASSWORD=password
```

> Do not add inline comments on the same line as a value — dotenv does not support them and will include the comment as part of the value.

### 3. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:3000`.

### 4. Build for production

```bash
npm run build
```

Compiled output goes into `/dist`.

---

## API Endpoints

All responses follow this structure:

```json
{ "success": true, "data": {}, "count": 1 }
{ "success": false, "error": "message" }
```

### Patient endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness check |
| GET | `/patients` | No | List all patients |
| GET | `/patients/:id` | No | Get a single patient by ID |
| POST | `/patients` | Yes | Create a new patient |
| PUT | `/patients/:id` | Yes | Update a patient (partial update) |
| DELETE | `/patients/:id` | Yes | Delete a patient |
| GET | `/patients/query/by-address?city=London` | No | Find patients by city (DynamoDB GSI) |
| GET | `/patients/query/by-condition?condition=Diabetes` | No | Find by condition (DynamoDB scan) |
| GET | `/patients/search?condition=Diabetes` | No | Search by condition (OpenSearch fuzzy) |

**Protected routes** require `Authorization: Bearer <Cognito IdToken>` header.

### Patient object shape

```json
{
  "patientId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Sarah Johnson",
  "address": {
    "street": "42 Baker Street",
    "city": "London",
    "state": "England",
    "zip": "NW1 6XE",
    "country": "UK"
  },
  "conditions": ["Type 2 Diabetes", "Hypertension"],
  "allergies": ["Penicillin"],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## AWS Setup

### DynamoDB

Table name: `patients`
Partition key: `patientId` (String)

One GSI is needed for the by-address query:

| GSI Name | Partition Key | Purpose |
|----------|---------------|---------|
| `addressCity-index` | `addressCity` | Query patients by city without scanning the full table |

Billing mode: On-demand (PAY_PER_REQUEST)

### Cognito

- Create a User Pool
- Create an App Client — with or without a client secret
- Enable `ALLOW_USER_PASSWORD_AUTH` on the app client
- Create a test user and set a permanent password

> If your app client has a client secret, include `SECRET_HASH` in every auth request. Calculate it as HMAC-SHA256 of `username + clientId` signed with the client secret, encoded as Base64.

### OpenSearch

- Create a domain named `patient-search`
- Engine: OpenSearch 2.7
- Instance: t3.small.search
- Enable fine-grained access control or set an open access policy
- Copy the domain endpoint URL into your `.env`

### IAM Permissions

Your IAM user or Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/patients",
        "arn:aws:dynamodb:*:*:table/patients/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "es:ESHttpGet",
        "es:ESHttpPost",
        "es:ESHttpPut",
        "es:ESHttpDelete"
      ],
      "Resource": "arn:aws:es:*:*:domain/patient-search/*"
    }
  ]
}
```

---

## Postman Collection

Import `Patient Management API.postman_collection.json` into Postman.

### Environment Variables

The collection uses environment variables so you never have to manually copy tokens. Set up a Postman environment with these variables:

| Variable | Value |
|----------|-------|
| `baseUrl` | `http://localhost:3000` or your API Gateway URL |
| `authToken` | Set automatically by the login request script |
| `accessToken` | Set automatically by the login request script |
| `refreshToken` | Set automatically by the login request script |

### Auto Token Script

The **Login (Get Token)** request in the collection has a test script that automatically saves all three tokens to your environment after a successful login. You never need to copy and paste tokens manually.

```javascript
const response = pm.response.json();

if (response.AuthenticationResult) {
    pm.environment.set(
        "authToken",
        response.AuthenticationResult.IdToken
    );

    pm.environment.set(
        "accessToken",
        response.AuthenticationResult.AccessToken
    );

    pm.environment.set(
        "refreshToken",
        response.AuthenticationResult.RefreshToken
    );

    console.log("Tokens saved successfully");
}
```

Once you run the login request, all subsequent protected requests automatically use the saved `authToken` — no manual steps needed.

### Login Request

The collection includes a pre-configured **Login** request:

```
POST https://cognito-idp.eu-north-1.amazonaws.com/

Headers:
  X-Amz-Target : AWSCognitoIdentityProviderService.InitiateAuth
  Content-Type : application/x-amz-json-1.1

Body:
{
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "{{clientId}}",
  "AuthParameters": {
    "USERNAME": "{{username}}",
    "PASSWORD": "{{password}}",
    "SECRET_HASH": "{{secretHash}}"
  }
}
```

The `IdToken` expires after 1 hour. When it does, just run the login request again — the script saves a fresh token automatically.

---

## Running Tests

```bash
npm test
```

Tests mock all AWS SDK calls so no real infrastructure is needed. The suite covers the service layer, route/controller layer, and error handling middleware.

```bash
npm test -- --coverage
```

All 20 tests pass with coverage across service operations, HTTP routes, validation, 404 handling, and DynamoDB error conditions.

## Deploying to Lambda

### 1. Build and package

```bash
npm run build
zip -r patient-api.zip dist/ node_modules/ package.json
```

### 2. Create Lambda function

- Runtime: Node.js 18.x
- Handler: `dist/lambda.handler`
- Memory: 512 MB
- Timeout: 30 seconds
- Upload the zip file
- Add all environment variables from your `.env`

### 3. Create API Gateway

- Type: HTTP API
- Integration: Lambda function
- Route: `ANY /{proxy+}`
- This forwards all requests to Express which handles routing internally

The `src/lambda.ts` file wraps the Express app using `aws-serverless-express` so it works identically in Lambda and locally — no code changes needed between environments.