package com.bullrun.security.dto;

import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEvent;
import com.bullrun.security.model.SecurityEventType;

import java.time.Instant;

public class SecurityEventResponse {

    private String id;
    private String userId;
    private SecurityEventType eventType;
    private String endpoint;
    private String httpMethod;
    private String status;
    private Instant timestamp;
    private EventSeverity severity;
    private String reason;
    private String ipAddress;
    private String userAgent;
    private String metadata;

    public SecurityEventResponse() {}

    public SecurityEventResponse(SecurityEvent event) {
        if (event != null) {
            this.id = event.getId();
            this.userId = event.getUserId();
            this.eventType = event.getEventType();
            this.endpoint = event.getEndpoint();
            this.httpMethod = event.getHttpMethod();
            this.status = event.getStatus();
            this.timestamp = event.getTimestamp();
            this.severity = event.getSeverity();
            this.reason = event.getReason();
            this.ipAddress = event.getIpAddress();
            this.userAgent = event.getUserAgent();
            this.metadata = event.getMetadata();
        }
    }

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
