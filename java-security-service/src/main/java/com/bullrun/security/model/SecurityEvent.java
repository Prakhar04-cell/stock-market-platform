package com.bullrun.security.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "security_events", indexes = {
    @Index(name = "ix_security_events_user_id", columnList = "user_id"),
    @Index(name = "ix_security_events_event_type", columnList = "event_type"),
    @Index(name = "ix_security_events_timestamp", columnList = "timestamp"),
    @Index(name = "ix_security_events_severity", columnList = "severity")
})
public class SecurityEvent {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 50, nullable = false)
    private SecurityEventType eventType;

    @Column(name = "endpoint", length = 255, nullable = false)
    private String endpoint;

    @Column(name = "http_method", length = 10, nullable = false)
    private String httpMethod;

    @Column(name = "status", length = 30, nullable = false)
    private String status;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 20, nullable = false)
    private EventSeverity severity;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    public SecurityEvent() {
        this.id = UUID.randomUUID().toString();
        this.timestamp = Instant.now();
    }

    public SecurityEvent(String userId, SecurityEventType eventType, String endpoint,
                         String httpMethod, String status, EventSeverity severity,
                         String reason, String ipAddress, String userAgent, String metadata) {
        this.id = UUID.randomUUID().toString();
        this.timestamp = Instant.now();
        this.userId = userId;
        this.eventType = eventType;
        this.endpoint = endpoint;
        this.httpMethod = httpMethod;
        this.status = status;
        this.severity = severity;
        this.reason = reason;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.metadata = metadata;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public SecurityEventType getEventType() {
        return eventType;
    }

    public void setEventType(SecurityEventType eventType) {
        this.eventType = eventType;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(String httpMethod) {
        this.httpMethod = httpMethod;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public EventSeverity getSeverity() {
        return severity;
    }

    public void setSeverity(EventSeverity severity) {
        this.severity = severity;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
}
