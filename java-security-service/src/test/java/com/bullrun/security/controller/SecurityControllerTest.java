package com.bullrun.security.controller;

import com.bullrun.security.dto.SecuritySummaryResponse;
import com.bullrun.security.service.SecurityAuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SecurityAuditService securityAuditService;

    @Test
    void testUnauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/java/security/summary"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "trader@bullrun.in", roles = {"TRADER"})
    void testTraderRoleAccessDeniedReturns403() throws Exception {
        mockMvc.perform(get("/api/java/security/summary"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@bullrun.in", roles = {"ADMIN"})
    void testAdminRoleAccessPermitted() throws Exception {
        SecuritySummaryResponse summary = new SecuritySummaryResponse();
        summary.setTotalEvents(10);
        summary.setRiskScore(15);
        summary.setRiskLevel("LOW");
        summary.setRiskFactors(Collections.singletonList("Nominal"));

        when(securityAuditService.getSecuritySummary()).thenReturn(summary);

        mockMvc.perform(get("/api/java/security/summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.riskLevel").value("LOW"))
            .andExpect(jsonPath("$.riskScore").value(15));
    }
}
