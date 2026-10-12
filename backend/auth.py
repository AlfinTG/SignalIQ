"""Verified Supabase bearer-token handling for private API routes."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from backend.config import get_settings


@dataclass(frozen=True)
class Principal:
    user_id: str
    email: str | None


def _auth_error(code: str, message: str, status_code: int = 401) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error": {"code": code, "message": message}})


@lru_cache(maxsize=4)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=300)


def verify_access_token(token: str) -> Principal:
    settings = get_settings()
    if not settings.supabase_configured:
        raise _auth_error("auth_not_configured", "Authentication is not configured for this environment.", 503)

    issuer = settings.supabase_jwt_issuer.rstrip("/") or f"{settings.supabase_url.rstrip('/')}/auth/v1"
    jwks_url = f"{issuer}/.well-known/jwks.json"
    try:
        signing_key = _jwks_client(jwks_url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256", "EdDSA"],
            audience=settings.supabase_jwt_audience,
            issuer=issuer,
            options={"require": ["sub", "exp", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise _auth_error("session_expired", "Your session has expired. Please sign in again.") from exc
    except jwt.PyJWTError as exc:
        raise _auth_error("invalid_token", "Authentication could not be verified.") from exc
    except Exception as exc:  # JWKS network/key errors must not be exposed to clients.
        raise _auth_error("auth_verification_unavailable", "Authentication verification is temporarily unavailable.", 503) from exc

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise _auth_error("invalid_token", "Authentication could not be verified.")
    email = claims.get("email")
    return Principal(user_id=subject, email=email if isinstance(email, str) else None)


def get_current_principal(authorization: str | None = Header(default=None)) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise _auth_error("authentication_required", "Sign in to access this resource.")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise _auth_error("authentication_required", "Sign in to access this resource.")
    return verify_access_token(token)
