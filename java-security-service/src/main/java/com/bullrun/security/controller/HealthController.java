package com.bullrun.security.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping({"/api/java/health", "/health"})
    public ResponseEntity<Map<String, Object>> getHealth() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "bullrun-java-security-service",
            "version", "1.0.0",
            "environment", "production-ready",
            "timestamp", Instant.now().toString(),
            "capabilities", Map.of(
                "jwtValidation", true,
                "rbac", true,
                "rateLimiting", true,
                "auditLogging", true,
                "tradingAnalytics", true,
                "riskEngine", true
            )
        ));
    }
}
