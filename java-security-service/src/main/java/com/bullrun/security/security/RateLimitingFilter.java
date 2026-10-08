package com.bullrun.security.security;

import com.bullrun.security.dto.ErrorResponseDto;
import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEventType;
import com.bullrun.security.repository.SecurityEventRepository;
import com.bullrun.security.model.SecurityEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final SecurityEventRepository securityEventRepository;
    private final ObjectMapper objectMapper;

    public RateLimitingFilter(
        RateLimiterService rateLimiterService,
        SecurityEventRepository securityEventRepository,
        ObjectMapper objectMapper
    ) {
        this.rateLimiterService = rateLimiterService;
        this.securityEventRepository = securityEventRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Skip non-API or health/actuator paths
        if (!path.startsWith("/api/java") || path.contains("/health") || path.startsWith("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        RateLimiterService.EndpointCategory category = determineCategory(path);
        String clientIp = extractClientIp(request);

        boolean allowed = rateLimiterService.allowRequest(clientIp, category);

        if (!allowed) {
            long retryAfter = rateLimiterService.getRetryAfterSeconds(clientIp, category);

            // Record RATE_LIMIT_EXCEEDED event in security audit repository
            try {
                SecurityEvent event = new SecurityEvent(
                    null,
                    SecurityEventType.RATE_LIMIT_EXCEEDED,
                    path,
                    request.getMethod(),
                    "429",
                    EventSeverity.MEDIUM,
                    "Client IP " + clientIp + " exceeded " + category + " rate limit",
                    clientIp,
                    request.getHeader("User-Agent"),
                    "{\"retryAfterSeconds\":" + retryAfter + "}"
                );
                securityEventRepository.save(event);
            } catch (Exception ignored) {
                // Do not block rate limit response on DB logging failure
            }

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.setHeader("Retry-After", String.valueOf(retryAfter));

            ErrorResponseDto error = new ErrorResponseDto(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "TOO_MANY_REQUESTS",
                "Rate limit exceeded. Please retry after " + retryAfter + " seconds.",
                path
            );
            response.getWriter().write(objectMapper.writeValueAsString(error));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private RateLimiterService.EndpointCategory determineCategory(String path) {
        if (path.contains("/security")) {
            return RateLimiterService.EndpointCategory.SECURITY;
        } else if (path.contains("/portfolio") || path.contains("/orders")) {
            return RateLimiterService.EndpointCategory.ANALYTICS;
        }
        return RateLimiterService.EndpointCategory.GENERAL;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
