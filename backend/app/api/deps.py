from typing import List, Optional
from fastapi import Depends, Header, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.core.security import decode_token
from app.models.user import User
from app.services.auth_service import get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that validates JWT access token and returns authenticated active user."""
    if not token:
        # Check Authorization header manually if auto_error=False
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            raise AuthenticationError(message="Authentication credentials were not provided.")

    payload = decode_token(token)
    token_type = payload.get("type")
    if token_type != "access":
        raise AuthenticationError(message="Invalid token type. Access token required.")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError(message="Invalid token subject.")

    user = await get_user_by_id(db, user_id)
    if not user.is_active:
        raise PermissionDeniedError(message="User account is deactivated.")

    # Attach to request.state for logging & rate limiting
    request.state.user_id = user.id
    return user


async def get_current_user_optional(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Dependency that returns authenticated active user or None if unauthenticated."""
    try:
        return await get_current_user(request, token, db)
    except Exception:
        return None


def require_role(allowed_roles: List[str]):
    """RBAC dependency factory that validates user roles strictly on backend."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_names = [r.name for r in current_user.roles]
        if not any(role in allowed_roles for role in user_role_names):
            raise PermissionDeniedError(
                message=f"Access forbidden. Required role: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker


# Role shortcut dependencies
require_admin = require_role(["ADMIN"])
require_trader = require_role(["TRADER", "ADMIN"])
