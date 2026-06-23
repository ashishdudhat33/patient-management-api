# Serverless Deployment Plan — Patient Management API

## Overview

The API is deployed as a single Lambda function sitting behind API Gateway. All patient data lives in DynamoDB, search runs through OpenSearch Service, and Cognito handles authentication.

```
Client → API Gateway → Lambda (Express app) → DynamoDB
                                            → OpenSearch Service
                                            → Cognito (token validation)
```

---

## Step-by-Step Deployment

### 1. Pre-requisites

- AWS CLI configured with appropriate credentials
- Node.js 18+ installed
- An S3 bucket for the Lambda deployment package

### 2. Build the TypeScript project

```bash
npm install
npm run build
# creates /dist with compiled JS
```

### 3. Package for Lambda

```bash
zip -r patient-api.zip dist/ node_modules/ package.json
aws s3 cp patient-api.zip s3://your-deploy-bucket/patient-api.zip
```

### 4. DynamoDB Table Setup

Create the `patients` table with the following schema:

| Key Type  | Attribute     | Type   |
|-----------|---------------|--------|
| Partition | `patientId`   | String |

**Global Secondary Indexes (GSIs):**

| GSI Name              | PK Attribute  | Purpose                         |
|-----------------------|---------------|---------------------------------|
| `addressCity-index`   | `addressCity` | Fast lookup by city             |
| `conditions-index`    | `condition`   | Lookup by a single condition*   |

> *Note: DynamoDB can't natively index array values. To support GSI-based condition lookups we'd either flatten conditions into a separate table (PatientConditions with patientId + condition as keys), or use OpenSearch for all condition queries — which is what we're doing here. The DynamoDB scan-based fallback is kept only for low-traffic internal use.

```bash
aws dynamodb create-table \
  --table-name patients \
  --attribute-definitions AttributeName=patientId,AttributeType=S \
  --key-schema AttributeName=patientId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 5. Cognito Setup

```bash
# Create User Pool
aws cognito-idp create-user-pool \
  --pool-name PatientApiUsers \
  --auto-verified-attributes email

# Create App Client (no secret — Lambda/SPA flow)
aws cognito-idp create-user-pool-client \
  --user-pool-id <pool-id> \
  --client-name patient-api-client \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

### 6. OpenSearch Domain

```bash
aws opensearch create-domain \
  --domain-name patient-search \
  --engine-version OpenSearch_2.7 \
  --cluster-config InstanceType=t3.small.search,InstanceCount=1 \
  --ebs-options EBSEnabled=true,VolumeType=gp3,VolumeSize=20 \
  --region us-east-1
```

### 7. Lambda Function

```bash
aws lambda create-function \
  --function-name patient-management-api \
  --runtime nodejs18.x \
  --handler dist/lambda.handler \
  --role arn:aws:iam::<account-id>:role/patient-api-lambda-role \
  --code S3Bucket=your-deploy-bucket,S3Key=patient-api.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{
    NODE_ENV=production,
    DYNAMODB_TABLE_NAME=patients,
    AWS_REGION=us-east-1,
    COGNITO_USER_POOL_ID=us-east-1_xxx,
    COGNITO_CLIENT_ID=xxx,
    COGNITO_REGION=us-east-1,
    OPENSEARCH_ENDPOINT=https://xxx.us-east-1.es.amazonaws.com,
    OPENSEARCH_INDEX=patients
  }"
```

### 8. API Gateway

```bash
# Create HTTP API (v2 — lower latency than REST API)
aws apigatewayv2 create-api \
  --name patient-management-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:us-east-1:<account>:function:patient-management-api
```

API Gateway auto-creates a `$default` route that forwards all requests to Lambda. You can add a custom domain on top via ACM + Route 53.

---

## IAM Role for Lambda

The Lambda execution role needs these policies:

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
        "arn:aws:dynamodb:us-east-1:*:table/patients",
        "arn:aws:dynamodb:us-east-1:*:table/patients/index/*"
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
      "Resource": "arn:aws:es:us-east-1:*:domain/patient-search/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

---

## Serverless Considerations

**Cold Starts:** Node.js 18 with the `arm64` architecture has faster cold starts. Keep Lambda memory at 512MB+ — more memory also means more CPU, which reduces initialization time.

**Concurrency Limits:** AWS default is 1000 concurrent Lambda executions per account. Set a reserved concurrency on this function to prevent it from starving other Lambdas in the same account.

**DynamoDB Capacity:** Using `PAY_PER_REQUEST` mode is safest at the start — no capacity planning needed, you pay per operation. Switch to provisioned capacity with auto-scaling once traffic patterns are predictable.

**OpenSearch Sizing:** A single `t3.small` node is fine for dev/staging. Production should use at least 2 nodes for HA, ideally with dedicated master nodes if the cluster grows.

**Secrets Management:** Don't put credentials in Lambda env vars directly. Use AWS Secrets Manager or SSM Parameter Store and fetch them at startup (cached in the Lambda execution context across warm invocations).

---

## Caching with Redis (Bonus — Design Only)

For endpoints that get hammered with the same query (e.g. `GET /patients/query/by-address?city=London`), a Redis layer would significantly reduce DynamoDB read costs and latency.

**Architecture:**
```
Request → Check Redis cache
              ↓ Miss
         Query DynamoDB → Store result in Redis (TTL: 5 min) → Return
              ↓ Hit
         Return cached result directly
```

**Implementation:**
- Use ElastiCache (Redis) in the same VPC as Lambda
- Cache key: `patients:city:{cityName}` or `patients:search:{conditionQuery}`
- Invalidate on write: whenever a patient is created/updated/deleted, delete the relevant cache keys
- Libraries: `ioredis` for the Node.js client

**Considerations:**
- Lambda needs VPC access to reach ElastiCache — this adds ~100ms to cold start. Use provisioned concurrency for latency-sensitive paths.
- Keep TTL short (2–5 min) for medical data since it can change frequently.
