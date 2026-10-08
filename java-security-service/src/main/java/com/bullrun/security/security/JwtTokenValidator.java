package com.bullrun.security.security;

import com.bullrun.security.exception.InvalidTokenException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenValidator {

    private final SecretKey signingKey;

    public JwtTokenValidator(@Value("${bullrun.security.jwt.secret:tradex_super_secret_jwt_key_must_be_changed_in_production_at_least_32_chars}") String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            // Ensure minimum 256 bits for HMAC-SHA256
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            this.signingKey = Keys.hmacShaKeyFor(padded);
        } else {
            this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        }
    }

    /**
     * Validates JWT token and extracts UserPrincipal.
     * Throws InvalidTokenException on any validation failure.
     */
    public UserPrincipal validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new InvalidTokenException("JWT token is missing");
        }

        try {
            Claims claims = Jwts.parser()
                .verifyWith(this.signingKey)
                .build()
                .parseSignedClaims(token.trim())
                .getPayload();

            // Validate token expiration
            Date expiration = claims.getExpiration();
            if (expiration != null && expiration.before(new Date())) {
                throw new InvalidTokenException("JWT token has expired");
            }

            // Validate token type (only access tokens are valid for API authorization)
            String tokenType = claims.get("type", String.class);
            if (tokenType != null && !"access".equalsIgnoreCase(tokenType)) {
                throw new InvalidTokenException("Invalid token type. Only access tokens are accepted.");
            }

            // Validate subject (User ID)
            String userId = claims.getSubject();
            if (userId == null || userId.trim().isEmpty()) {
                throw new InvalidTokenException("JWT subject claim is missing");
            }

            // Extract role (default to TRADER)
            String role = claims.get("role", String.class);
            if (role == null || role.trim().isEmpty()) {
                role = "TRADER";
            }

            String email = claims.get("email", String.class);
            if (email == null) {
                email = userId;
            }

            return new UserPrincipal(userId, email, role);

        } catch (ExpiredJwtException e) {
            throw new InvalidTokenException("JWT token has expired", e);
        } catch (JwtException | IllegalArgumentException e) {
            throw new InvalidTokenException("Invalid JWT token: " + e.getMessage(), e);
        }
    }

    /**
     * Helper to generate test tokens for unit testing.
     */
    public String generateToken(String userId, String email, String role, long expirationMillis) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
            .subject(userId)
            .claim("role", role)
            .claim("email", email)
            .claim("type", "access")
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(this.signingKey)
            .compact();
    }
}
