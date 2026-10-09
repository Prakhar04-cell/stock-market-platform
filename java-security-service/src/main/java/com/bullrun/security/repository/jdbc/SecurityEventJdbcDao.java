package com.bullrun.security.repository.jdbc;

import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEvent;
import com.bullrun.security.model.SecurityEventType;

import java.util.List;
import java.util.Optional;

/**
 * Data Access Object (DAO) interface for direct JDBC database operations (PART D & E).
 * Specifies explicit contract for parameterized SQL queries using PreparedStatement.
 */
public interface SecurityEventJdbcDao {

    /**
     * Parameterized INSERT operation via JDBC PreparedStatement.
     */
    SecurityEvent save(SecurityEvent event);

    /**
     * Parameterized SELECT query by Primary Key ID.
     */
    Optional<SecurityEvent> findById(String id);

    /**
     * Parameterized SELECT query with pagination (LIMIT and OFFSET).
     */
    List<SecurityEvent> findAll(int limit, int offset);

    /**
     * Parameterized SELECT query with filtering by SecurityEventType.
     */
    List<SecurityEvent> findByEventType(SecurityEventType eventType, int limit);

    /**
     * Parameterized UPDATE operation modifying status and reason.
     */
    boolean updateStatus(String id, String newStatus, String reason);

    /**
     * Parameterized DELETE operation.
     */
    boolean deleteById(String id);

    /**
     * Parameterized aggregate COUNT query.
     */
    long countEvents();

    /**
     * Parameterized aggregate COUNT query filtered by EventSeverity.
     */
    long countBySeverity(EventSeverity severity);
}
