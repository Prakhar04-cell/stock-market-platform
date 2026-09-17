from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse


class TradeXException(HTTPException):
    """Base exception for all TradeX domain errors."""
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details or {}


class AuthenticationError(TradeXException):
    def __init__(self, message: str = "Invalid authentication credentials", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="AUTHENTICATION_FAILED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class PermissionDeniedError(TradeXException):
    def __init__(self, message: str = "Permission denied for this operation", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="PERMISSION_DENIED",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ResourceNotFoundError(TradeXException):
    def __init__(self, resource: str = "Resource", identifier: str = "", details: Optional[Dict[str, Any]] = None):
        msg = f"{resource} '{identifier}' was not found" if identifier else f"{resource} was not found"
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ResourceConflictError(TradeXException):
    def __init__(self, message: str = "Resource conflict detected", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="RESOURCE_CONFLICT",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class RateLimitExceededError(TradeXException):
    def __init__(self, message: str = "Too many requests. Please slow down and try again later."):
        super().__init__(
            code="RATE_LIMIT_EXCEEDED",
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


class ProviderNotConfiguredError(TradeXException):
    def __init__(self, provider_type: str = "Market data provider"):
        super().__init__(
            code="PROVIDER_NOT_CONFIGURED",
            message=f"{provider_type} is not connected yet. Phase 1 foundation active.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def format_error_response(code: str, message: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
    }
