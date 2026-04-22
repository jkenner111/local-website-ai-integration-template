import { createRemoteJWKSet, jwtVerify } from "jose";

const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
const expectedAud = process.env.CF_ACCESS_AUD;

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!teamDomain) {
    throw new Error("CF_ACCESS_TEAM_DOMAIN is not set");
  }
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(
      new URL(`https://${teamDomain}/cdn-cgi/access/certs`),
    );
  }
  return jwksCache;
}

export type AccessIdentity = {
  email: string;
};

export async function verifyAccessJwt(
  token: string,
): Promise<AccessIdentity | null> {
  if (!teamDomain || !expectedAud) return null;
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `https://${teamDomain}`,
      audience: expectedAud,
    });
    const email = typeof payload.email === "string" ? payload.email : null;
    return email ? { email } : null;
  } catch {
    return null;
  }
}

export function devBypassIdentity(): AccessIdentity | null {
  if (process.env.NODE_ENV === "production") return null;
  const email = process.env.ADMIN_DEV_BYPASS_EMAIL;
  return email ? { email } : null;
}
