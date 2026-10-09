package com.bullrun.security.service;

import com.bullrun.security.dto.SecurityEventRequest;
import com.bullrun.security.dto.SecurityEventResponse;
import com.bullrun.security.exception.ResourceNotFoundException;
import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEvent;
import com.bullrun.security.model.SecurityEventType;
import com.bullrun.security.repository.jdbc.SecurityEventJdbcDao;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Service encapsulating raw JDBC database operations (PART D & E).
 * Coordinates validation, business operations, and persistence via SecurityEventJdbcDao.
 */
@Service
public class SecurityEventJdbcService {

    private final SecurityEventJdbcDao jdbcDao;

    public SecurityEventJdbcService(SecurityEventJdbcDao jdbcDao) {
        this.jdbcDao = jdbcDao;
    }

    public SecurityEventResponse createEvent(SecurityEventRequest request) {
        SecurityEvent event = new SecurityEvent(
            request.getUserId(),
            request.getEventType() != null ? request.getEventType() : SecurityEventType.SUSPICIOUS_REQUEST,
            request.getEndpoint() != null ? request.getEndpoint() : "/api/java/demo/jdbc",
            request.getHttpMethod() != null ? request.getHttpMethod() : "POST",
            request.getStatus() != null ? request.getStatus() : "RECORDED_VIA_JDBC",
            request.getSeverity() != null ? request.getSeverity() : EventSeverity.LOW,
            request.getReason() != null ? request.getReason() : "Logged via direct JDBC PreparedStatement",
            request.getIpAddress(),
            request.getUserAgent(),
            request.getMetadata()
        );

        SecurityEvent saved = jdbcDao.save(event);
        return new SecurityEventResponse(saved);
    }

    public SecurityEventResponse getEventById(String id) {
        SecurityEvent event = jdbcDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SecurityEvent", id));
        return new SecurityEventResponse(event);
    }

    public List<SecurityEventResponse> listEvents(int limit, int offset, SecurityEventType type) {
        List<SecurityEvent> events;
        if (type != null) {
            events = jdbcDao.findByEventType(type, limit);
        } else {
            events = jdbcDao.findAll(limit, offset);
        }
        return events.stream().map(SecurityEventResponse::new).toList();
    }

    public boolean updateEventStatus(String id, String newStatus, String reason) {
        // Verify existence first
        jdbcDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SecurityEvent", id));

        return jdbcDao.updateStatus(id, newStatus, reason);
    }

    public boolean deleteEvent(String id) {
        // Verify existence first
        jdbcDao.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("SecurityEvent", id));

        return jdbcDao.deleteById(id);
    }

    public Map<String, Object> getJdbcStatistics() {
        long total = jdbcDao.countEvents();
        long critical = jdbcDao.countBySeverity(EventSeverity.CRITICAL);
        long high = jdbcDao.countBySeverity(EventSeverity.HIGH);
        long medium = jdbcDao.countBySeverity(EventSeverity.MEDIUM);
        long low = jdbcDao.countBySeverity(EventSeverity.LOW);

        return Map.of(
            "driver", "org.postgresql.Driver",
            "accessType", "Direct JDBC PreparedStatement",
            "totalRecordedEvents", total,
            "criticalEvents", critical,
            "highEvents", high,
            "mediumEvents", medium,
            "lowEvents", low
        );
    }
}
