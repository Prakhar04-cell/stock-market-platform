package com.bullrun.security.exception;

/**
 * Exception thrown when portfolio holdings or user record cannot be located for analysis.
 * Maps to HTTP 404 Not Found.
 */
public class PortfolioDataNotFoundException extends RuntimeException {

    public PortfolioDataNotFoundException(String message) {
        super(message);
    }

    public PortfolioDataNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
