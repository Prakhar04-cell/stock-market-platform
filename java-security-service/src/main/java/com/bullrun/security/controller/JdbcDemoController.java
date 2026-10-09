package com.bullrun.security.controller;

import com.bullrun.security.dto.ApiResponse;
import com.bullrun.security.dto.SecurityEventRequest;
import com.bullrun.security.dto.SecurityEventResponse;
import com.bullrun.security.model.SecurityEventType;
import com.bullrun.security.service.SecurityEventJdbcService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller explicitly exposing and demonstrating direct JDBC connectivity (PART D & E).
 * Provides HTTP endpoints executing raw parameterized SQL via PreparedStatement.
 */
@RestController
@RequestMapping("/api/java/demo/jdbc")
public class JdbcDemoController {

    private final SecurityEventJdbcService jdbcService;

    public JdbcDemoController(SecurityEventJdbcService jdbcService) {
        this.jdbcService = jdbcService;
    }

    /**
     * Demonstrates parameterized INSERT using JDBC PreparedStatement.
     */
    @PostMapping("/events")
    public ResponseEntity<ApiResponse<SecurityEventResponse>> createEventJdbc(
        @Valid @RequestBody SecurityEventRequest request
    ) {
        SecurityEventResponse response = jdbcService.createEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Event created successfully via JDBC PreparedStatement", response));
    }

    /**
     * Demonstrates parameterized SELECT by ID using JDBC PreparedStatement.
     */
    @GetMapping("/events/{id}")
    public ResponseEntity<ApiResponse<SecurityEventResponse>> getEventJdbc(@PathVariable String id) {
        SecurityEventResponse response = jdbcService.getEventById(id);
        return ResponseEntity.ok(ApiResponse.success("Event retrieved via JDBC PreparedStatement", response));
    }

    /**
     * Demonstrates parameterized SELECT with pagination and filtering using JDBC PreparedStatement.
     */
    @GetMapping("/events")
    public ResponseEntity<ApiResponse<List<SecurityEventResponse>>> listEventsJdbc(
        @RequestParam(defaultValue = "10") int limit,
        @RequestParam(defaultValue = "0") int offset,
        @RequestParam(required = false) SecurityEventType type
    ) {
        List<SecurityEventResponse> list = jdbcService.listEvents(limit, offset, type);
        return ResponseEntity.ok(ApiResponse.success("Events queried via JDBC PreparedStatement", list));
    }

    /**
     * Demonstrates parameterized UPDATE using JDBC PreparedStatement.
     */
    @PutMapping("/events/{id}/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateStatusJdbc(
        @PathVariable String id,
        @RequestBody Map<String, String> body
    ) {
        String newStatus = body.getOrDefault("status", "RESOLVED");
        String reason = body.getOrDefault("reason", "Updated via JDBC demo endpoint");
        boolean updated = jdbcService.updateEventStatus(id, newStatus, reason);
        return ResponseEntity.ok(ApiResponse.success("Event updated via JDBC", Map.of(
            "id", id,
            "status", newStatus,
            "updated", updated
        )));
    }

    /**
     * Demonstrates parameterized DELETE using JDBC PreparedStatement.
     */
    @DeleteMapping("/events/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteEventJdbc(@PathVariable String id) {
        boolean deleted = jdbcService.deleteEvent(id);
        return ResponseEntity.ok(ApiResponse.success("Event deleted via JDBC PreparedStatement", Map.of(
            "id", id,
            "deleted", deleted
        )));
    }

    /**
     * Demonstrates parameterized aggregate COUNT using JDBC PreparedStatement.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getJdbcStats() {
        Map<String, Object> stats = jdbcService.getJdbcStatistics();
        return ResponseEntity.ok(ApiResponse.success("JDBC aggregate statistics queried", stats));
    }
}
