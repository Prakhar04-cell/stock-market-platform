package com.bullrun.security.controller;

import com.bullrun.security.dto.PortfolioSummaryDto;
import com.bullrun.security.security.UserPrincipal;
import com.bullrun.security.service.PnLCalculator;
import com.bullrun.security.service.PortfolioAnalyticsService;
import com.bullrun.security.service.RiskAnalyzer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PortfolioAnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PortfolioAnalyticsService portfolioAnalyticsService;

    @MockBean
    private PnLCalculator pnLCalculator;

    @MockBean
    private RiskAnalyzer riskAnalyzer;

    @Test
    void testUserAccessOwnPortfolioPermitted() throws Exception {
        UserPrincipal principal = new UserPrincipal("user-own", "trader@bullrun.in", "TRADER");
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );

        PortfolioSummaryDto summary = new PortfolioSummaryDto();
        summary.setUserId("user-own");
        summary.setNumberOfHoldings(2);

        when(portfolioAnalyticsService.getPortfolioAnalytics("user-own")).thenReturn(summary);

        mockMvc.perform(get("/api/java/portfolio/user-own"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value("user-own"))
            .andExpect(jsonPath("$.numberOfHoldings").value(2));
    }

    @Test
    void testUserAccessOtherUserPortfolioForbidden() throws Exception {
        UserPrincipal principal = new UserPrincipal("user-attacker", "attacker@bullrun.in", "TRADER");
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );

        mockMvc.perform(get("/api/java/portfolio/victim-user-id"))
            .andExpect(status().isForbidden());
    }

    @Test
    void testAdminAccessOtherUserPortfolioPermitted() throws Exception {
        UserPrincipal admin = new UserPrincipal("admin-id", "admin@bullrun.in", "ADMIN");
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(admin, null, admin.getAuthorities())
        );

        PortfolioSummaryDto summary = new PortfolioSummaryDto();
        summary.setUserId("any-trader-id");
        when(portfolioAnalyticsService.getPortfolioAnalytics("any-trader-id")).thenReturn(summary);

        mockMvc.perform(get("/api/java/portfolio/any-trader-id"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value("any-trader-id"));
    }
}
