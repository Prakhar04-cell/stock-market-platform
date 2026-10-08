package com.bullrun.security.dto;

import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SecurityEventRequest {

    private String userId;

    @NotNull(message = "eventType is required")
    private SecurityEventType eventType;

    @NotBlank(message = "endpoint is required")
    private String endpoint;

    @NotBlank(message = "httpMethod is required")
    private String httpMethod;

    @NotBlank(message = "status is required")
    private String status;

    private EventSeverity severity = EventSeverity.LOW;

    private String reason;

    private String ipAddress;

    private String userAgent;

    private String metadata;

    public SecurityEventRequest() {}

    public SecurityEventRequest(String userId, SecurityEventType eventType, String endpoint,
                                String httpMethod, String status, EventSeverity severity,
                                String reason, String ipAddress, String userAgent, String metadata) {
        this.userId = userId;
        this.eventType = eventType;
        this.endpoint = endpoint;
        this.httpMethod = httpMethod;
        this.status = status;
        this.severity = severity != null ? severity : EventSeverity.LOW;
        this.reason = reason;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.metadata = metadata;
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
