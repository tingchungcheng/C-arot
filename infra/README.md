# C-arot Phase 2 AWS foundation

This SAM stack provisions:

- Cognito User Pool with email/password sign-in and a Google identity provider.
- Cognito managed-login domain and OAuth web client.
- On-demand, encrypted DynamoDB table with a user-owned `PK`/`SK` layout.
- Cognito JWT-protected API Gateway HTTP API and history Lambda.

## Before deployment

1. Create a Google OAuth web client. Add the Cognito callback URL shown after choosing the domain prefix:
   `https://<domain-prefix>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
2. Choose a globally unique `CognitoDomainPrefix`.
3. Set `CallbackUrls` and `LogoutUrls` to every local/production URL that will be used.
4. Deploy from the repository root so `CodeUri: ../backend/` resolves when SAM builds `infra/template.yaml`.

Example:

```bash
sam build --template-file infra/template.yaml
sam deploy --guided --template-file .aws-sam/build/template.yaml
```

The stack outputs provide the User Pool ID, client ID, Cognito domain, API URL, and table name. Put those values into `.env.local` for local Next.js development, and into the production hosting environment for the deployed frontend.

Do not commit `samconfig.toml`: the guided deploy file can contain parameter values, including the Google client secret.

