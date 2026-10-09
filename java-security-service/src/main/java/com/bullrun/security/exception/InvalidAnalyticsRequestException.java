package com.bullrun.security.exception;

/**
 * Exception thrown when an analytics request provides invalid parameters or malformed context.
 * Maps to HTTP 400 Bad Request.
 */
public class InvalidAnalyticsRequestException extends RuntimeException {

    public InvalidAnalyticsRequestException(String message) {
        super(message);
    }

    public InvalidAnalyticsRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
