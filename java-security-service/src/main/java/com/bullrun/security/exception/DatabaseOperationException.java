package com.bullrun.security.exception;

/**
 * Exception thrown when a direct JDBC or database operation encounters an error.
 * Encapsulates SQL failures safely without exposing database credentials or raw connection strings.
 * Maps to HTTP 500 Internal Server Error.
 */
public class DatabaseOperationException extends RuntimeException {

    public DatabaseOperationException(String message) {
        super(message);
    }

    public DatabaseOperationException(String message, Throwable cause) {
        super(message, cause);
    }
}
