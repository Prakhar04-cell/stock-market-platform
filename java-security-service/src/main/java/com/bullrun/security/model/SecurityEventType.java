package com.bullrun.security.model;

public enum SecurityEventType {
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    INVALID_JWT,
    ACCESS_DENIED,
    ADMIN_ACCESS,
    RATE_LIMIT_EXCEEDED,
    SUSPICIOUS_REQUEST,
    ORDER_SECURITY_EVENT
}
