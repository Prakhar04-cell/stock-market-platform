package com.bullrun.security.dto;

import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEventType;

import java.time.Instant;

public class SecurityAlertResponse {

    private String id;
    private String title;
    private String description;
    private EventSeverity severity;
    private SecurityEventType eventType;
    private Instant detectedAt;
    private String affectedUserOrIp;
    private String status; // ACTIVE, RESOLVED

    public SecurityAlertResponse() {}

    public SecurityAlertResponse(String id, String title, String description,
                                 EventSeverity severity, SecurityEventType eventType,
                                 Instant detectedAt, String affectedUserOrIp, String status) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.severity = severity;
        this.eventType = eventType;
        this.detectedAt = detectedAt;
        this.affectedUserOrIp = affectedUserOrIp;
        this.status = status;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public EventSeverity getSeverity() {
        return severity;
    }

    public void setSeverity(EventSeverity severity) {
        this.severity = severity;
    }

    public SecurityEventType getEventType() {
        return eventType;
    }

    public void setEventType(SecurityEventType eventType) {
        this.eventType = eventType;
    }

    public Instant getDetectedAt() {
        return detectedAt;
    }

    public void setDetectedAt(Instant detectedAt) {
        this.detectedAt = detectedAt;
    }

    public String getAffectedUserOrIp() {
        return affectedUserOrIp;
    }

    public void setAffectedUserOrIp(String affectedUserOrIp) {
        this.affectedUserOrIp = affectedUserOrIp;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
