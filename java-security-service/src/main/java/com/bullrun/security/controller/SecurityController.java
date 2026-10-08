package com.bullrun.security.controller;

import com.bullrun.security.dto.SecurityAlertResponse;
import com.bullrun.security.dto.SecurityEventRequest;
import com.bullrun.security.dto.SecurityEventResponse;
import com.bullrun.security.dto.SecuritySummaryResponse;
import com.bullrun.security.model.SecurityEventType;
import com.bullrun.security.service.SecurityAuditService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/java/security")
public class SecurityController {

    private final SecurityAuditService securityAuditService;

    public SecurityController(SecurityAuditService securityAuditService) {
        this.securityAuditService = securityAuditService;
    }

    /**
     * Admin-only: Retrieve paginated audit event stream.
     */
    @GetMapping("/events")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<SecurityEventResponse>> getEvents(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) SecurityEventType eventType
    ) {
        Page<SecurityEventResponse> events = securityAuditService.getEvents(page, size, eventType);
        return ResponseEntity.ok(events);
    }

    /**
     * Admin-only: Retrieve active high/critical security alerts.
     */
    @GetMapping("/alerts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SecurityAlertResponse>> getAlerts() {
        List<SecurityAlertResponse> alerts = securityAuditService.getActiveAlerts();
        return ResponseEntity.ok(alerts);
    }

    /**
     * Admin-only: Retrieve comprehensive security summary and dynamic risk assessment.
     */
    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SecuritySummaryResponse> getSummary() {
        SecuritySummaryResponse summary = securityAuditService.getSecuritySummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Record security events from authenticated gateway or internal services.
     */
    @PostMapping("/events")
    public ResponseEntity<SecurityEventResponse> recordEvent(@Valid @RequestBody SecurityEventRequest request) {
        SecurityEventResponse response = securityAuditService.recordEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
