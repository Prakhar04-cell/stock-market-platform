package com.bullrun.security.security;

import com.bullrun.security.exception.InvalidTokenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenValidatorTest {

    private JwtTokenValidator validator;
    private final String secret = "tradex_super_secret_jwt_key_must_be_changed_in_production_at_least_32_chars";

    @BeforeEach
    void setUp() {
        validator = new JwtTokenValidator(secret);
    }

    @Test
    void testValidTokenValidation() {
        String token = validator.generateToken("user-123", "trader@bullrun.in", "TRADER", 60_000);
        UserPrincipal principal = validator.validateToken(token);

        assertNotNull(principal);
        assertEquals("user-123", principal.getId());
        assertEquals("trader@bullrun.in", principal.getUsername());
        assertEquals("TRADER", principal.getRole());
        assertFalse(principal.isAdmin());
        assertTrue(principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TRADER")));
    }

    @Test
    void testAdminTokenValidation() {
        String token = validator.generateToken("admin-456", "admin@bullrun.in", "ADMIN", 60_000);
        UserPrincipal principal = validator.validateToken(token);

        assertNotNull(principal);
        assertEquals("admin-456", principal.getId());
        assertEquals("ADMIN", principal.getRole());
        assertTrue(principal.isAdmin());
        assertTrue(principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void testExpiredTokenThrowsException() {
        // Expired in past (-10 seconds)
        String expiredToken = validator.generateToken("user-123", "trader@bullrun.in", "TRADER", -10_000);

        InvalidTokenException ex = assertThrows(InvalidTokenException.class, () -> {
            validator.validateToken(expiredToken);
        });
        assertTrue(ex.getMessage().contains("expired"));
    }

    @Test
    void testTamperedTokenThrowsException() {
        String token = validator.generateToken("user-123", "trader@bullrun.in", "TRADER", 60_000);
        String tampered = token.substring(0, token.length() - 5) + "abcde";

        assertThrows(InvalidTokenException.class, () -> {
            validator.validateToken(tampered);
        });
    }

    @Test
    void testMissingTokenThrowsException() {
        assertThrows(InvalidTokenException.class, () -> validator.validateToken(null));
        assertThrows(InvalidTokenException.class, () -> validator.validateToken("   "));
    }
}
