package com.bullrun.security.repository;

import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEvent;
import com.bullrun.security.model.SecurityEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, String> {

    Page<SecurityEvent> findAllByOrderByTimestampDesc(Pageable pageable);

    Page<SecurityEvent> findByEventTypeOrderByTimestampDesc(SecurityEventType eventType, Pageable pageable);

    Page<SecurityEvent> findBySeverityInOrderByTimestampDesc(List<EventSeverity> severities, Pageable pageable);

    long countByEventTypeAndTimestampAfter(SecurityEventType eventType, Instant since);

    long countByTimestampAfter(Instant since);

    long countBySeverity(EventSeverity severity);

    long countBySeverityInAndTimestampAfter(List<EventSeverity> severities, Instant since);

    @Query("SELECT e FROM SecurityEvent e WHERE e.userId = :userId AND e.timestamp >= :since ORDER BY e.timestamp DESC")
    List<SecurityEvent> findRecentEventsForUser(@Param("userId") String userId, @Param("since") Instant since);

    @Query("SELECT COUNT(e) FROM SecurityEvent e WHERE e.ipAddress = :ipAddress AND e.eventType IN ('LOGIN_FAILED', 'INVALID_JWT') AND e.timestamp >= :since")
    long countFailedAuthByIp(@Param("ipAddress") String ipAddress, @Param("since") Instant since);

    @Query("SELECT COUNT(e) FROM SecurityEvent e WHERE e.eventType IN ('LOGIN_FAILED', 'INVALID_JWT') AND e.timestamp >= :since")
    long countTotalFailedAuthSince(@Param("since") Instant since);

    @Query("SELECT COUNT(e) FROM SecurityEvent e WHERE e.eventType IN ('ACCESS_DENIED', 'RATE_LIMIT_EXCEEDED') AND e.timestamp >= :since")
    long countBlockedRequestsSince(@Param("since") Instant since);
}
