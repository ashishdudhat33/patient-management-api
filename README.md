# Patient Management API

A serverless-ready REST API for managing patient records, built with **Node.js + TypeScript + Express**. Backed by AWS DynamoDB, secured via Cognito JWTs, and searchable through OpenSearch.

---

## Tech Stack

| Layer       | Technology                            |
|-------------|---------------------------------------|
| Runtime     | Node.js 18 + TypeScript               |
| Framework   | Express.js                            |
| Storage     | AWS DynamoDB                          |
| Auth        | AWS Cognito (JWT via JWKS)            |
| Search      | AWS OpenSearch Service                |
| Deploy      | AWS Lambda + API Gateway              |
| Tests       | Jest + ts-jest + Supertest            |
| Logging     | Winston                               |

---

## Project Structure

```
src/
├── controllers/      # Request handling — thin, just calls services
│   └── patient.controller.ts
├── middleware/       # Auth, validation, error handling
│   ├── auth.middleware.ts
│   ├── validate.middleware.ts
│   └── error.middleware.ts
├── models/           # (reserved for ORM models if added later)
├── routes/           # Route definitions
│   ├── patient.routes.ts
│   └── health.routes.ts
├── services/         # Business logic + AWS SDK calls
│   ├── patient.service.ts
│   └── search.service.ts
├── types/            # TypeScript interfaces
│   └── patient.types.ts
├── utils/            # Clients and logger
│   ├── dynamoClient.ts
│   ├── opensearchClient.ts
│   └── logger.ts
├── app.ts            # Express app setup
├── index.ts          # Local dev server
└── lambda.ts         # AWS Lambda handler
tests/
├── patient.service.test.ts
└── patient.routes.test.ts
docs/
├── DEPLOYMENT_PLAN.md
└── PatientAPI.postman_collection.json
```

---

## Running Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Fill in your values
```

### 3. Start local AWS services (optional but recommended)

If you don't have real AWS credentials, you can use Docker to run DynamoDB and OpenSearch locally:

```bash
# DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# OpenSearch
docker run -p 9200:9200 -e "discovery.type=single-node" opensearchproject/opensearch:2.7.0
```

Set these in your `.env`:
```
DYNAMODB_ENDPOINT=http://localhost:8000
OPENSEARCH_ENDPOINT=http://localhost:9200
```

Create the DynamoDB table locally:
```bash
aws dynamodb create-table \
  --table-name patients \
  --attribute-definitions AttributeName=patientId,AttributeType=S \
  --key-schema AttributeName=patientId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

### 4. Start the dev server

```bash
npm run dev
# Server starts at http://localhost:3000
```

### 5. Test it

```bash
curl http://localhost:3000/health
```

---

## API Reference

All responses follow a consistent shape:
```json
{ "success": true, "data": {}, "count": 1 }
{ "success": false, "error": "message" }
```

### Endpoints

| Method | Path                              | Auth | Description                            |
|--------|-----------------------------------|------|----------------------------------------|
| GET    | `/health`                         | No   | Liveness check                         |
| GET    | `/patients`                       | No   | List all patients                      |
| GET    | `/patients/:id`                   | No   | Get a single patient                   |
| POST   | `/patients`                       | Yes  | Create a patient                       |
| PUT    | `/patients/:id`                   | Yes  | Update a patient (partial)             |
| DELETE | `/patients/:id`                   | Yes  | Delete a patient                       |
| GET    | `/patients/query/by-address`      | No   | `?city=London` — find by city (GSI)    |
| GET    | `/patients/query/by-condition`    | No   | `?condition=Diabetes` — DynamoDB scan  |
| GET    | `/patients/search`                | No   | `?condition=Diabetes` — OpenSearch     |

**Authentication:** Protected routes require `Authorization: Bearer <Cognito JWT>`.

### Create Patient — request body

```json
{
  "name": "Sarah Johnson",
  "address": {
    "street": "42 Baker Street",
    "city": "London",
    "state": "England",
    "zip": "NW1 6XE",
    "country": "UK"
  },
  "conditions": ["Type 2 Diabetes", "Hypertension"],
  "allergies": ["Penicillin"]
}
```

---

## DynamoDB Schema

**Table:** `patients`  
**Partition Key:** `patientId` (String / UUID)

**Global Secondary Indexes:**

| GSI Name            | PK             | Purpose                        |
|---------------------|----------------|--------------------------------|
| `addressCity-index` | `addressCity`  | Find patients by city          |

> Conditions aren't great as a GSI because DynamoDB can't index list values natively. For condition-based lookups, the OpenSearch endpoint (`/patients/search`) is the right tool — full-text fuzzy search with proper indexing.

---

## Running Tests

```bash
npm test
# or with coverage report
npm test -- --coverage
```

Tests mock all AWS SDK calls — no real infrastructure needed.

---

## Deployment

See `docs/DEPLOYMENT_PLAN.md` for the full step-by-step guide covering Lambda, API Gateway, DynamoDB, Cognito, and OpenSearch setup.

---

## Postman

Import `docs/PatientAPI.postman_collection.json` into Postman. Set the `baseUrl` and `authToken` collection variables before running.
