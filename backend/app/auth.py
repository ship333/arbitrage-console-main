from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from .settings import settings


def _extract_bearer(token_header: Optional[str]) -> Optional[str]:
    if not token_header:
        return None
    parts = token_header.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    # Accept raw token for convenience in dev
    return token_header


def validate_token(token: Optional[str]) -> bool:
    if not settings.REQUIRE_AUTH:
        return True
    if not token:
        return False
    # Demo: static token list. Replace with JWT/DB validation for production.
    return token in set(settings.AUTH_TOKENS or [])


async def require_auth(authorization: Optional[str] = Header(default=None)):
    if not settings.REQUIRE_AUTH:
        return True
    tok = _extract_bearer(authorization)
    if not validate_token(tok):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return True
