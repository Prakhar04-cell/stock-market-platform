package com.bullrun.security.repository.jdbc;

import com.bullrun.security.exception.DatabaseOperationException;
import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEvent;
import com.bullrun.security.model.SecurityEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Concrete implementation of SecurityEventJdbcDao using direct JDBC (PART E).
 * Utilizes PreparedStatement and try-with-resources to guarantee safe query parameterization,
 * prevent SQL injection, and enforce strict database resource cleanup.
 */
@Repository
public class SecurityEventJdbcDaoImpl implements SecurityEventJdbcDao {

    private static final Logger log = LoggerFactory.getLogger(SecurityEventJdbcDaoImpl.class);

    private final DataSource dataSource;

    public SecurityEventJdbcDaoImpl(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public SecurityEvent save(SecurityEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("SecurityEvent cannot be null for JDBC insert");
        }

        if (event.getId() == null || event.getId().isBlank()) {
            event.setId(UUID.randomUUID().toString());
        }
        if (event.getTimestamp() == null) {
            event.setTimestamp(Instant.now());
        }

        final String sql = """
            INSERT INTO security_events (
                id, user_id, event_type, endpoint, http_method,
                status, timestamp, severity, reason, ip_address, user_agent, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, event.getId());
            stmt.setString(2, event.getUserId());
            stmt.setString(3, event.getEventType() != null ? event.getEventType().name() : SecurityEventType.SUSPICIOUS_REQUEST.name());
            stmt.setString(4, event.getEndpoint() != null ? event.getEndpoint() : "/unknown");
            stmt.setString(5, event.getHttpMethod() != null ? event.getHttpMethod() : "GET");
            stmt.setString(6, event.getStatus() != null ? event.getStatus() : "PROCESSED");
            stmt.setTimestamp(7, Timestamp.from(event.getTimestamp()));
            stmt.setString(8, event.getSeverity() != null ? event.getSeverity().name() : EventSeverity.LOW.name());
            stmt.setString(9, event.getReason());
            stmt.setString(10, event.getIpAddress());
            stmt.setString(11, event.getUserAgent());
            stmt.setString(12, event.getMetadata());

            int affectedRows = stmt.executeUpdate();
            if (affectedRows == 0) {
                throw new DatabaseOperationException("JDBC INSERT into security_events failed, no rows affected");
            }

            log.debug("JDBC INSERT successful for security event ID: {}", event.getId());
            return event;

        } catch (SQLException e) {
            log.error("JDBC execution failed on INSERT operation: {}", e.getMessage());
            throw new DatabaseOperationException("Database insertion error: " + e.getMessage(), e);
        }
    }

    @Override
    public Optional<SecurityEvent> findById(String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }

        final String sql = """
            SELECT id, user_id, event_type, endpoint, http_method,
                   status, timestamp, severity, reason, ip_address, user_agent, metadata
            FROM security_events
            WHERE id = ?
            """;

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, id);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRowToSecurityEvent(rs));
                }
            }
            return Optional.empty();

        } catch (SQLException e) {
            log.error("JDBC execution failed on SELECT findById: {}", e.getMessage());
            throw new DatabaseOperationException("Database query error: " + e.getMessage(), e);
        }
    }

    @Override
    public List<SecurityEvent> findAll(int limit, int offset) {
        int safeLimit = Math.max(1, Math.min(100, limit));
        int safeOffset = Math.max(0, offset);

        final String sql = """
            SELECT id, user_id, event_type, endpoint, http_method,
                   status, timestamp, severity, reason, ip_address, user_agent, metadata
            FROM security_events
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
            """;

        List<SecurityEvent> results = new ArrayList<>();

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, safeLimit);
            stmt.setInt(2, safeOffset);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    results.add(mapRowToSecurityEvent(rs));
                }
            }
            return results;

        } catch (SQLException e) {
            log.error("JDBC execution failed on SELECT findAll: {}", e.getMessage());
            throw new DatabaseOperationException("Database query error: " + e.getMessage(), e);
        }
    }

    @Override
    public List<SecurityEvent> findByEventType(SecurityEventType eventType, int limit) {
        if (eventType == null) {
            return findAll(limit, 0);
        }

        int safeLimit = Math.max(1, Math.min(100, limit));

        final String sql = """
            SELECT id, user_id, event_type, endpoint, http_method,
                   status, timestamp, severity, reason, ip_address, user_agent, metadata
            FROM security_events
            WHERE event_type = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """;

        List<SecurityEvent> results = new ArrayList<>();

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, eventType.name());
            stmt.setInt(2, safeLimit);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    results.add(mapRowToSecurityEvent(rs));
                }
            }
            return results;

        } catch (SQLException e) {
            log.error("JDBC execution failed on SELECT findByEventType: {}", e.getMessage());
            throw new DatabaseOperationException("Database query error: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean updateStatus(String id, String newStatus, String reason) {
        if (id == null || id.isBlank()) {
            return false;
        }

        final String sql = """
            UPDATE security_events
            SET status = ?, reason = ?
            WHERE id = ?
            """;

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, newStatus != null ? newStatus : "RESOLVED");
            stmt.setString(2, reason != null ? reason : "Status updated via JDBC DAO");
            stmt.setString(3, id);

            int rowsUpdated = stmt.executeUpdate();
            return rowsUpdated > 0;

        } catch (SQLException e) {
            log.error("JDBC execution failed on UPDATE status: {}", e.getMessage());
            throw new DatabaseOperationException("Database update error: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean deleteById(String id) {
        if (id == null || id.isBlank()) {
            return false;
        }

        final String sql = "DELETE FROM security_events WHERE id = ?";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, id);
            int rowsDeleted = stmt.executeUpdate();
            return rowsDeleted > 0;

        } catch (SQLException e) {
            log.error("JDBC execution failed on DELETE: {}", e.getMessage());
            throw new DatabaseOperationException("Database delete error: " + e.getMessage(), e);
        }
    }

    @Override
    public long countEvents() {
        final String sql = "SELECT COUNT(*) FROM security_events";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            if (rs.next()) {
                return rs.getLong(1);
            }
            return 0L;

        } catch (SQLException e) {
            log.error("JDBC execution failed on aggregate COUNT: {}", e.getMessage());
            throw new DatabaseOperationException("Database aggregation error: " + e.getMessage(), e);
        }
    }

    @Override
    public long countBySeverity(EventSeverity severity) {
        if (severity == null) {
            return countEvents();
        }

        final String sql = "SELECT COUNT(*) FROM security_events WHERE severity = ?";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, severity.name());

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
            }
            return 0L;

        } catch (SQLException e) {
            log.error("JDBC execution failed on aggregate countBySeverity: {}", e.getMessage());
            throw new DatabaseOperationException("Database aggregation error: " + e.getMessage(), e);
        }
    }

    private SecurityEvent mapRowToSecurityEvent(ResultSet rs) throws SQLException {
        SecurityEvent event = new SecurityEvent();
        event.setId(rs.getString("id"));
        event.setUserId(rs.getString("user_id"));

        String eventTypeStr = rs.getString("event_type");
        if (eventTypeStr != null) {
            try {
                event.setEventType(SecurityEventType.valueOf(eventTypeStr));
            } catch (IllegalArgumentException ignored) {
                event.setEventType(SecurityEventType.SUSPICIOUS_REQUEST);
            }
        }

        event.setEndpoint(rs.getString("endpoint"));
        event.setHttpMethod(rs.getString("http_method"));
        event.setStatus(rs.getString("status"));

        Timestamp ts = rs.getTimestamp("timestamp");
        if (ts != null) {
            event.setTimestamp(ts.toInstant());
        }

        String severityStr = rs.getString("severity");
        if (severityStr != null) {
            try {
                event.setSeverity(EventSeverity.valueOf(severityStr));
            } catch (IllegalArgumentException ignored) {
                event.setSeverity(EventSeverity.LOW);
            }
        }

        event.setReason(rs.getString("reason"));
        event.setIpAddress(rs.getString("ip_address"));
        event.setUserAgent(rs.getString("user_agent"));
        event.setMetadata(rs.getString("metadata"));

        return event;
    }
}
