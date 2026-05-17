import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  verifyPubsubJwt,
  __resetPubsubJwksCache,
  __setPubsubJwksCache,
} from "@/lib/inbox/pubsub-verify";

interface KeyPairWithJwk {
  privatePem: string;
  publicJwk: {
    kty: "RSA";
    use: string;
    kid: string;
    n: string;
    e: string;
    alg: string;
  };
}

function generateRsa(kid: string): KeyPairWithJwk {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" }) as { n: string; e: string };
  return {
    privatePem: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
    publicJwk: {
      kty: "RSA",
      use: "sig",
      kid,
      alg: "RS256",
      n: jwk.n,
      e: jwk.e,
    },
  };
}

function signToken(privatePem: string, kid: string, claims: Record<string, unknown>): string {
  return jwt.sign(claims, privatePem, {
    algorithm: "RS256",
    keyid: kid,
  });
}

describe("inbox/pubsub-verify", () => {
  beforeEach(() => {
    __resetPubsubJwksCache();
  });

  it("verifies a valid token signed by a known key", async () => {
    const { privatePem, publicJwk } = generateRsa("kid-1");
    __setPubsubJwksCache(new Map([[publicJwk.kid, publicJwk]]));
    const token = signToken(privatePem, "kid-1", {
      iss: "https://accounts.google.com",
      aud: "https://app.example.com/api/webhooks/google/gmail",
      email: "pubsub-pusher@my-project.iam.gserviceaccount.com",
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    const claims = await verifyPubsubJwt(token, {
      audience: "https://app.example.com/api/webhooks/google/gmail",
    });
    expect(claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com").toBe(true);
    expect(claims.email).toBe("pubsub-pusher@my-project.iam.gserviceaccount.com");
  });

  it("rejects an expired token", async () => {
    const { privatePem, publicJwk } = generateRsa("kid-2");
    __setPubsubJwksCache(new Map([[publicJwk.kid, publicJwk]]));
    const token = signToken(privatePem, "kid-2", {
      iss: "accounts.google.com",
      aud: "aud-1",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    await expect(
      verifyPubsubJwt(token, { audience: "aud-1" }),
    ).rejects.toThrow();
  });

  it("rejects token with wrong audience", async () => {
    const { privatePem, publicJwk } = generateRsa("kid-3");
    __setPubsubJwksCache(new Map([[publicJwk.kid, publicJwk]]));
    const token = signToken(privatePem, "kid-3", {
      iss: "accounts.google.com",
      aud: "expected-aud",
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    await expect(
      verifyPubsubJwt(token, { audience: "different-aud" }),
    ).rejects.toThrow();
  });

  it("rejects token with wrong issuer", async () => {
    const { privatePem, publicJwk } = generateRsa("kid-4");
    __setPubsubJwksCache(new Map([[publicJwk.kid, publicJwk]]));
    const token = signToken(privatePem, "kid-4", {
      iss: "evil.example",
      aud: "aud-1",
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    await expect(
      verifyPubsubJwt(token, { audience: "aud-1" }),
    ).rejects.toThrow();
  });

  it("rejects token signed by a different key (kid mismatch)", async () => {
    const a = generateRsa("kid-a");
    const b = generateRsa("kid-b");
    __setPubsubJwksCache(new Map([[a.publicJwk.kid, a.publicJwk]]));
    // Sign with B's private key but claim A's kid → signature won't verify.
    const token = signToken(b.privatePem, "kid-a", {
      iss: "accounts.google.com",
      aud: "aud-1",
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    await expect(
      verifyPubsubJwt(token, { audience: "aud-1" }),
    ).rejects.toThrow();
  });

  it("rejects when kid is unknown to the JWKS", async () => {
    const a = generateRsa("kid-known");
    __setPubsubJwksCache(new Map([[a.publicJwk.kid, a.publicJwk]]));
    const token = signToken(a.privatePem, "kid-unknown", {
      iss: "accounts.google.com",
      aud: "aud-1",
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    await expect(
      verifyPubsubJwt(token, { audience: "aud-1" }),
    ).rejects.toThrow(/unknown kid/);
  });

  it("rejects when expectedEmail mismatches", async () => {
    const { privatePem, publicJwk } = generateRsa("kid-5");
    __setPubsubJwksCache(new Map([[publicJwk.kid, publicJwk]]));
    const token = signToken(privatePem, "kid-5", {
      iss: "accounts.google.com",
      aud: "aud-1",
      email: "wrong@example.com",
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    await expect(
      verifyPubsubJwt(token, {
        audience: "aud-1",
        expectedEmail: "right@example.com",
      }),
    ).rejects.toThrow(/email claim mismatch/);
  });

  it("rejects malformed JWT", async () => {
    await expect(
      verifyPubsubJwt("not.a.jwt", { audience: "aud-1" }),
    ).rejects.toThrow();
  });
});
