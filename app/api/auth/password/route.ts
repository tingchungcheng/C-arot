import { NextRequest, NextResponse } from 'next/server';
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';
import { getAuthConfig } from '@/lib/auth/config';
import { setSessionCookies } from '@/lib/auth/cookies';
import { verifyIdToken } from '@/lib/auth/session';

const Body = z.object({
  action: z.enum(['signIn', 'signUp', 'confirm', 'resend', 'forgot', 'reset']),
  email: z.string().trim().max(254),
  password: z.string().max(256).optional(),
  code: z.string().trim().min(4).max(12).optional(),
});

const errorStatus = (name: string) => {
  if (name === 'NotAuthorizedException' || name === 'UserNotFoundException') return 401;
  if (name === 'UsernameExistsException') return 409;
  if (name === 'TooManyRequestsException' || name === 'LimitExceededException') return 429;
  if (name === 'CodeMismatchException' || name === 'ExpiredCodeException' || name === 'InvalidPasswordException') return 400;
  return 502;
};

const errorCode = (name: string) => ({
  NotAuthorizedException: 'invalid_credentials',
  UserNotFoundException: 'user_not_found',
  UsernameExistsException: 'user_exists',
  UserNotConfirmedException: 'unconfirmed',
  CodeMismatchException: 'code_mismatch',
  ExpiredCodeException: 'code_expired',
  InvalidPasswordException: 'invalid_password',
  TooManyRequestsException: 'too_many_requests',
  LimitExceededException: 'too_many_requests',
}[name] ?? 'auth_unavailable');

const errorResponse = (errorCode: string, status: number) => Response.json({ errorCode }, { status });

function requirePassword(body: z.infer<typeof Body>) {
  if (!body.password) return errorResponse('password_required', 400);
  if (body.password.length < 8) return errorResponse('password_too_short', 400);
  return null;
}

function requireCode(body: z.infer<typeof Body>) {
  if (!body.code) return errorResponse('code_required', 400);
  return null;
}

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse('invalid_input', 400);
  const body = parsed.data;
  if (!z.string().email().safeParse(body.email).success) return errorResponse('email_invalid', 400);

  let config;
  try { config = getAuthConfig(); } catch { return errorResponse('cognito_not_configured', 503); }
  const client = new CognitoIdentityProviderClient({ region: config.region });

  try {
    if (body.action === 'signUp') {
      const missing = requirePassword(body);
      if (missing) return missing;
      await client.send(new SignUpCommand({
        ClientId: config.clientId,
        Username: body.email,
        Password: body.password,
        UserAttributes: [{ Name: 'email', Value: body.email }],
      }));
      return Response.json({ ok: true, needsConfirmation: true });
    }

    if (body.action === 'confirm') {
      const missing = requireCode(body);
      if (missing) return missing;
      await client.send(new ConfirmSignUpCommand({ ClientId: config.clientId, Username: body.email, ConfirmationCode: body.code }));
      return Response.json({ ok: true });
    }

    if (body.action === 'resend') {
      await client.send(new ResendConfirmationCodeCommand({ ClientId: config.clientId, Username: body.email }));
      return Response.json({ ok: true });
    }

    if (body.action === 'forgot') {
      await client.send(new ForgotPasswordCommand({ ClientId: config.clientId, Username: body.email }));
      return Response.json({ ok: true });
    }

    if (body.action === 'reset') {
      const missing = requireCode(body) || requirePassword(body);
      if (missing) return missing;
      await client.send(new ConfirmForgotPasswordCommand({ ClientId: config.clientId, Username: body.email, ConfirmationCode: body.code, Password: body.password }));
      return Response.json({ ok: true });
    }

    const missing = requirePassword(body);
    if (missing) return missing;
    const auth = await client.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: config.clientId,
      AuthParameters: { USERNAME: body.email, PASSWORD: body.password! },
    }));
    if (!auth.AuthenticationResult?.IdToken || !auth.AuthenticationResult.AccessToken) {
      return errorResponse('mfa_required', 400);
    }
    await verifyIdToken(auth.AuthenticationResult.IdToken);
    const response = NextResponse.json({ ok: true });
    setSessionCookies(response, {
      idToken: auth.AuthenticationResult.IdToken,
      accessToken: auth.AuthenticationResult.AccessToken,
      refreshToken: auth.AuthenticationResult.RefreshToken,
      expiresIn: auth.AuthenticationResult.ExpiresIn,
    });
    return response;
  } catch (error) {
    const name = (error as { name?: string }).name || 'UnknownError';
    console.error('cognito password flow failed', name);
    return errorResponse(errorCode(name), errorStatus(name));
  }
}

