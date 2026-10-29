export type AuthConfig = {
  region: string;
  userPoolId: string;
  clientId: string;
  domain: string;
  callbackUrl: string;
  logoutUrl: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getAuthConfig(): AuthConfig {
  return {
    region: required('COGNITO_REGION'),
    userPoolId: required('COGNITO_USER_POOL_ID'),
    clientId: required('COGNITO_CLIENT_ID'),
    domain: required('COGNITO_DOMAIN').replace(/\/$/, ''),
    callbackUrl: required('COGNITO_CALLBACK_URL'),
    logoutUrl: required('COGNITO_LOGOUT_URL'),
  };
}

export function tryGetAuthConfig(): AuthConfig | null {
  try {
    return getAuthConfig();
  } catch {
    return null;
  }
}

export function getCognitoIssuer(config = getAuthConfig()): string {
  return `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
}

export const AUTH_COOKIE = 'carot_id_token';
export const AUTH_ACCESS_COOKIE = 'carot_access_token';
export const AUTH_REFRESH_COOKIE = 'carot_refresh_token';
export const AUTH_STATE_COOKIE = 'carot_oauth_state';
export const AUTH_VERIFIER_COOKIE = 'carot_oauth_verifier';
export const AUTH_RETURN_COOKIE = 'carot_oauth_return';


