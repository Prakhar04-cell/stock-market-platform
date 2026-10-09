package com.bullrun.gui.client;

import com.bullrun.gui.model.SecurityEventItem;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * HTTP Client connecting the JavaFX desktop GUI client to the Spring Boot backend microservice.
 * Queries REST and direct JDBC endpoints asynchronously.
 */
public class ApiClient {

    private String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ApiClient(String baseUrl) {
        this.baseUrl = normalizeUrl(baseUrl);
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = normalizeUrl(baseUrl);
    }

    private String normalizeUrl(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:8081";
        }
        String clean = url.trim();
        if (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length() - 1);
        }
        return clean;
    }

    public CompletableFuture<Boolean> pingHealthAsync() {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/api/java/health"))
            .timeout(Duration.ofSeconds(3))
            .GET()
            .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(resp -> resp.statusCode() == 200)
            .exceptionally(ex -> false);
    }

    public CompletableFuture<JsonNode> fetchPerformanceAnalyticsAsync() {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/api/java/demo/analytics/execute/PERFORMANCE"))
            .timeout(Duration.ofSeconds(5))
            .GET()
            .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(resp -> {
                if (resp.statusCode() != 200) {
                    throw new RuntimeException("API error " + resp.statusCode() + ": " + resp.body());
                }
                try {
                    return objectMapper.readTree(resp.body());
                } catch (IOException e) {
                    throw new RuntimeException("JSON parsing failure", e);
                }
            });
    }

    public CompletableFuture<JsonNode> fetchRiskMetricsAsync() {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/api/java/demo/analytics/execute/RISK"))
            .timeout(Duration.ofSeconds(5))
            .GET()
            .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(resp -> {
                if (resp.statusCode() != 200) {
                    throw new RuntimeException("API error " + resp.statusCode() + ": " + resp.body());
                }
                try {
                    return objectMapper.readTree(resp.body());
                } catch (IOException e) {
                    throw new RuntimeException("JSON parsing failure", e);
                }
            });
    }

    public CompletableFuture<JsonNode> fetchDiversificationAsync() {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/api/java/demo/analytics/execute/DIVERSIFICATION"))
            .timeout(Duration.ofSeconds(5))
            .GET()
            .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(resp -> {
                if (resp.statusCode() != 200) {
                    throw new RuntimeException("API error " + resp.statusCode() + ": " + resp.body());
                }
                try {
                    return objectMapper.readTree(resp.body());
                } catch (IOException e) {
                    throw new RuntimeException("JSON parsing failure", e);
                }
            });
    }

    public CompletableFuture<List<SecurityEventItem>> fetchAuditEventsAsync(int limit) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/api/java/demo/jdbc/events?limit=" + limit))
            .timeout(Duration.ofSeconds(5))
            .GET()
            .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(resp -> {
                if (resp.statusCode() != 200) {
                    throw new RuntimeException("JDBC query error " + resp.statusCode() + ": " + resp.body());
                }
                try {
                    JsonNode root = objectMapper.readTree(resp.body());
                    JsonNode data = root.path("data");
                    List<SecurityEventItem> items = new ArrayList<>();
                    if (data.isArray()) {
                        for (JsonNode n : data) {
                            items.add(new SecurityEventItem(
                                n.path("id").asText(""),
                                n.path("timestamp").asText(""),
                                n.path("eventType").asText(""),
                                n.path("endpoint").asText(""),
                                n.path("httpMethod").asText(""),
                                n.path("status").asText(""),
                                n.path("severity").asText(""),
                                n.path("ipAddress").asText(""),
                                n.path("reason").asText("")
                            ));
                        }
                    }
                    return items;
                } catch (IOException e) {
                    throw new RuntimeException("Failed to parse JDBC audit events", e);
                }
            });
    }

    public CompletableFuture<Boolean> triggerTestAuditEventAsync(String reason) {
        Map<String, Object> payload = Map.of(
            "userId", "desktop-gui-operator",
            "eventType", "SUSPICIOUS_REQUEST",
            "endpoint", "/desktop-terminal/audit",
            "httpMethod", "POST",
            "status", "RECORDED_FROM_GUI",
            "severity", "MEDIUM",
            "reason", reason != null ? reason : "Triggered from JavaFX desktop client GUI",
            "ipAddress", "127.0.0.1",
            "userAgent", "BullRun-JavaFX-Client/1.0"
        );

        try {
            String jsonBody = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/java/demo/jdbc/events"))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(resp -> resp.statusCode() == 201 || resp.statusCode() == 200);
        } catch (Exception e) {
            CompletableFuture<Boolean> failed = new CompletableFuture<>();
            failed.completeExceptionally(e);
            return failed;
        }
    }
}
