package com.bullrun.security.config;

import com.bullrun.security.dto.ErrorResponseDto;
import com.bullrun.security.security.JwtAuthenticationFilter;
import com.bullrun.security.security.RateLimitingFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(
        JwtAuthenticationFilter jwtAuthenticationFilter,
        RateLimitingFilter rateLimitingFilter,
        ObjectMapper objectMapper
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> {})
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    String errorMsg = (String) request.getAttribute("JWT_ERROR");
                    if (errorMsg == null) {
                        errorMsg = "Authentication required. Bearer JWT token missing or invalid.";
                    }
                    ErrorResponseDto error = new ErrorResponseDto(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "AUTHENTICATION_REQUIRED",
                        errorMsg,
                        request.getRequestURI()
                    );
                    response.getWriter().write(objectMapper.writeValueAsString(error));
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    ErrorResponseDto error = new ErrorResponseDto(
                        HttpServletResponse.SC_FORBIDDEN,
                        "ACCESS_DENIED",
                        "Access denied. Insufficient permissions: " + accessDeniedException.getMessage(),
                        request.getRequestURI()
                    );
                    response.getWriter().write(objectMapper.writeValueAsString(error));
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Public Health & Actuator endpoints
                .requestMatchers("/api/java/health", "/health", "/actuator/**").permitAll()
                // Recording security events (allowed for authenticated clients)
                .requestMatchers(HttpMethod.POST, "/api/java/security/events").authenticated()
                // Admin-only Security & Audit monitoring endpoints
                .requestMatchers("/api/java/security/**").hasRole("ADMIN")
                // User & Trader endpoints for portfolio and orders
                .requestMatchers("/api/java/portfolio/**").authenticated()
                .requestMatchers("/api/java/orders/**").authenticated()
                // Any other requests require authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
