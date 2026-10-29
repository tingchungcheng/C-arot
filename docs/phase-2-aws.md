# C-arot Phase 2 AWS checklist

## Decisions already made in the code

- Cognito Managed Login handles email/password and Google SSO.
- The application verifies the Cognito ID token server-side using Cognito JWKS.
- User tier is read from `custom:tier`; only the exact value `paid` unlocks paid routes.
- The public app client is not granted write access to `custom:tier`; only an administrator or a later payment webhook should change it.
- History uses a user-owned DynamoDB partition: `PK=USER#<cognito-sub>`, `SK=HISTORY#<history-id>`.
- Payment is intentionally absent. A paid test account must be promoted manually for now.
- The existing local SQLite store remains available for local development. In production, normal Tarot reading records and temporary draw sessions use DynamoDB directly from the existing Next.js routes; no data migration is required because local data is mock data.
- The existing SAM Lambda remains the history/profile API. Tarot AI calls stay in the current Next.js server routes for this least-change phase; moving them to Lambda can be a later optimization.

## Values needed from you before a real deployment

1. AWS region, for example `ap-southeast-1`.
2. AWS account/profile to deploy with, and the desired CloudFormation stack name.
3. A globally unique Cognito domain prefix.
4. Google OAuth web client ID and secret.
5. Local and production frontend origins, including exact callback and logout URLs.
6. The production hosting choice for Next.js (the current deployment is Vercel; AWS Amplify is not required for this phase).
7. The production domain and HTTPS certificate/DNS plan, if using a custom domain.
8. Whether AI calls stay in Next.js server routes or move to the SAM API. The least-change setup keeps them server-side in Next.js, with reading records stored in DynamoDB and history/profile still optionally served by the SAM API.

For the current same-origin frontend setup, set `USER_API_URL` to the SAM `UserApiUrl` output. The Next `/api/history` route then forwards the verified Cognito session to API Gateway; leaving it empty uses the direct DynamoDB adapter instead.

For the current Vercel deployment, add these server-side environment variables in Vercel Production:

```text
DATA_STORE=dynamodb
DYNAMODB_TABLE_NAME=carot-user-data
AWS_REGION=ap-southeast-5
```

Because the existing Next.js routes access DynamoDB directly, Vercel also needs an AWS access key and secret for a least-privilege IAM principal. Grant only `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, and `Query` on this table. Keep both credentials server-only; never prefix them with `NEXT_PUBLIC_`.

The local `.env.local` can remain `DATA_STORE=local`; local SQLite and browser mock data do not need to be migrated.

## Manual paid test user

After the stack exists, set the tier for a test user with an administrator credential. The exact username is usually the email address because the pool uses email as the username:

```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id <UserPoolId> \
  --username <email> \
  --user-attributes Name=custom:tier,Value=paid
```

Do not expose AWS administrator credentials to the browser. Phase 3 should replace this manual step with server-verified payment webhooks and an entitlement record rather than trusting a client-side flag.

