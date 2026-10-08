package com.bullrun.security.service;

import com.bullrun.security.dto.SecurityAlertResponse;
import com.bullrun.security.dto.SecurityEventRequest;
import com.bullrun.security.dto.SecurityEventResponse;
import com.bullrun.security.dto.SecuritySummaryResponse;
import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEvent;
import com.bullrun.security.model.SecurityEventType;
import com.bullrun.security.repository.SecurityEventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class SecurityAuditService {

    private final SecurityEventRepository securityEventRepository;
    private final SecurityRiskAnalyzer securityRiskAnalyzer;

    public SecurityAuditService(
        SecurityEventRepository securityEventRepository,
        SecurityRiskAnalyzer securityRiskAnalyzer
    ) {
        this.securityEventRepository = securityEventRepository;
        this.securityRiskAnalyzer = securityRiskAnalyzer;
    }

    @Transactional
    public SecurityEventResponse recordEvent(SecurityEventRequest request) {
        SecurityEvent event = new SecurityEvent(
            request.getUserId(),
            request.getEventType(),
            request.getEndpoint(),
            request.getHttpMethod(),
            request.getStatus(),
            request.getSeverity() != null ? request.getSeverity() : EventSeverity.LOW,
            request.getReason(),
            request.getIpAddress(),
            request.getUserAgent(),
            request.getMetadata()
        );
        SecurityEvent saved = securityEventRepository.save(event);
        return new SecurityEventResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<SecurityEventResponse> getEvents(int page, int size, SecurityEventType eventType) {
        PageRequest pageRequest = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        Page<SecurityEvent> events;

        if (eventType != null) {
            events = securityEventRepository.findByEventTypeOrderByTimestampDesc(eventType, pageRequest);
        } else {
            events = securityEventRepository.findAllByOrderByTimestampDesc(pageRequest);
        }

        return events.map(SecurityEventResponse::new);
    }

    @Transactional(readOnly = true)
    public List<SecurityAlertResponse> getActiveAlerts() {
        PageRequest pageRequest = PageRequest.of(0, 50);
        Page<SecurityEvent> criticalEvents = securityEventRepository.findBySeverityInOrderByTimestampDesc(
            List.of(EventSeverity.HIGH, EventSeverity.CRITICAL),
            pageRequest
        );

        List<SecurityAlertResponse> alerts = new ArrayList<>();
        for (SecurityEvent e : criticalEvents.getContent()) {
            String affected = e.getUserId() != null ? "User: " + e.getUserId() : "IP: " + (e.getIpAddress() != null ? e.getIpAddress() : "Unknown");
            String title = formatAlertTitle(e.getEventType(), e.getSeverity());
            String desc = e.getReason() != null ? e.getReason() : ("High priority security event: " + e.getEventType());

            alerts.add(new SecurityAlertResponse(
                e.getId(),
                title,
                desc,
                e.getSeverity(),
                e.getEventType(),
                e.getTimestamp(),
                affected,
                "ACTIVE"
            ));
        }

        return alerts;
    }

    @Transactional(readOnly = true)
    public SecuritySummaryResponse getSecuritySummary() {
        Instant since24h = Instant.now().minus(24, ChronoUnit.HOURS);

        long totalEvents = securityEventRepository.count();
        long activeAlerts = securityEventRepository.countBySeverityInAndTimestampAfter(
            List.of(EventSeverity.HIGH, EventSeverity.CRITICAL),
            since24h
        );
        long failedAuth = securityEventRepository.countTotalFailedAuthSince(since24h);
        long blockedRequests = securityEventRepository.countBlockedRequestsSince(since24h);
        long rateLimitViolations = securityEventRepository.countByEventTypeAndTimestampAfter(
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            since24h
        );

        SecuritySummaryResponse summary = new SecuritySummaryResponse();
        summary.setTotalEvents(totalEvents);
        summary.setActiveAlerts(activeAlerts);
        summary.setFailedAuthAttempts(failedAuth);
        summary.setBlockedRequests(blockedRequests);
        summary.setRateLimitViolations(rateLimitViolations);

        // Calculate risk score and factors from real data
        SecurityRiskAnalyzer.RiskEvaluation evaluation = securityRiskAnalyzer.evaluateRisk(
            failedAuth, blockedRequests, rateLimitViolations, activeAlerts
        );

        summary.setRiskScore(evaluation.score());
        summary.setRiskLevel(evaluation.level());
        summary.setRiskFactors(evaluation.factors());

        return summary;
    }

    private String formatAlertTitle(SecurityEventType type, EventSeverity severity) {
        return switch (type) {
            case ACCESS_DENIED -> "Unauthorized Access Attempt (" + severity + ")";
            case INVALID_JWT -> "Suspicious JWT Manipulation Detected";
            case RATE_LIMIT_EXCEEDED -> "DDoS / High-Frequency Rate Limit Exceeded";
            case SUSPICIOUS_REQUEST -> "Anomalous Request Signature Flagged";
            case ORDER_SECURITY_EVENT -> "Order Security Threshold Anomaly";
            case LOGIN_FAILED -> "Repeated Failed Authentication Detected";
            default -> "Security Alert: " + type;
        };
    }
}
