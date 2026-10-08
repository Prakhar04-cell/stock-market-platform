package com.bullrun.security.controller;

import com.bullrun.security.dto.TradingStatisticsDto;
import com.bullrun.security.exception.AccessDeniedException;
import com.bullrun.security.security.UserPrincipal;
import com.bullrun.security.service.TradingStatisticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/java/orders")
public class TradingStatisticsController {

    private final TradingStatisticsService tradingStatisticsService;

    public TradingStatisticsController(TradingStatisticsService tradingStatisticsService) {
        this.tradingStatisticsService = tradingStatisticsService;
    }

    /**
     * Get user trading statistics (total orders, win rate, average profit/loss, largest trades).
     */
    @GetMapping("/{userId}/statistics")
    public ResponseEntity<TradingStatisticsDto> getStatistics(
        @PathVariable String userId,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        String effectiveUserId = resolveAndAuthorizeUserId(userId, principal);
        TradingStatisticsDto stats = tradingStatisticsService.calculateStatistics(effectiveUserId);
        return ResponseEntity.ok(stats);
    }

    private String resolveAndAuthorizeUserId(String targetUserId, UserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        if ("me".equalsIgnoreCase(targetUserId)) {
            return principal.getId();
        }

        if (!principal.isAdmin() && !principal.getId().equals(targetUserId)) {
            throw new AccessDeniedException("You are not authorized to view another user's trading statistics.");
        }

        return targetUserId;
    }
}
