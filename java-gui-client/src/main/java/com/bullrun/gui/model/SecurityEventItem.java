package com.bullrun.gui.model;

public class SecurityEventItem {

    private String id;
    private String timestamp;
    private String eventType;
    private String endpoint;
    private String httpMethod;
    private String status;
    private String severity;
    private String ipAddress;
    private String reason;

    public SecurityEventItem() {}

    public SecurityEventItem(
        String id,
        String timestamp,
        String eventType,
        String endpoint,
        String httpMethod,
        String status,
        String severity,
        String ipAddress,
        String reason
    ) {
        this.id = id;
        this.timestamp = timestamp;
        this.eventType = eventType;
        this.endpoint = endpoint;
        this.httpMethod = httpMethod;
        this.status = status;
        this.severity = severity;
        this.ipAddress = ipAddress;
        this.reason = reason;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public String getHttpMethod() { return httpMethod; }
    public void setHttpMethod(String httpMethod) { this.httpMethod = httpMethod; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
