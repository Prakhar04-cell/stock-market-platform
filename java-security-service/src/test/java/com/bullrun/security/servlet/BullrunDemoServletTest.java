package com.bullrun.security.servlet;

import jakarta.servlet.ServletContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("PART H: Servlets & Web Integration (Direct HttpServlet implementation)")
class BullrunDemoServletTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("Direct HttpServlet: doGet outputs valid JSON, 200 OK, and metadata")
    void testBullrunDemoServletDirectUnit() throws Exception {
        BullrunDemoServlet servlet = new BullrunDemoServlet();

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        ServletContext servletContext = mock(ServletContext.class);

        when(request.getServletContext()).thenReturn(servletContext);
        when(servletContext.getServletContextName()).thenReturn("BullRun-Tomcat");
        when(request.getProtocol()).thenReturn("HTTP/1.1");
        when(request.getRequestURI()).thenReturn("/demo/servlet/health");
        when(request.getPathInfo()).thenReturn("/health");
        when(request.getParameter("echo")).thenReturn("viva-evaluator");

        StringWriter responseBody = new StringWriter();
        PrintWriter printWriter = new PrintWriter(responseBody);
        when(response.getWriter()).thenReturn(printWriter);

        servlet.doGet(request, response);

        verify(response).setStatus(HttpServletResponse.SC_OK);
        verify(response).setContentType("application/json;charset=UTF-8");

        String jsonOutput = responseBody.toString();
        assertNotNull(jsonOutput);
        assertTrue(jsonOutput.contains("\"status\":\"UP\""), "Response must contain status UP");
        assertTrue(jsonOutput.contains("\"echo\":\"viva-evaluator\""), "Response must reflect echo parameter");
        assertTrue(jsonOutput.contains("\"servletClass\":\"com.bullrun.security.servlet.BullrunDemoServlet\""));
    }

    @Test
    @DisplayName("Direct HttpServlet: doPost sets HTTP 201 CREATED status and writes JSON")
    void testBullrunDemoServletPost() throws Exception {
        BullrunDemoServlet servlet = new BullrunDemoServlet();

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        when(request.getParameter("message")).thenReturn("Audit event test from servlet");

        StringWriter responseBody = new StringWriter();
        PrintWriter printWriter = new PrintWriter(responseBody);
        when(response.getWriter()).thenReturn(printWriter);

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_CREATED);
        verify(response).setContentType("application/json;charset=UTF-8");

        String jsonOutput = responseBody.toString();
        assertTrue(jsonOutput.contains("\"status\":\"CREATED\""));
        assertTrue(jsonOutput.contains("\"message\":\"Audit event test from servlet\""));
    }

    @Test
    @DisplayName("Servlet Registration: Embedded Tomcat routes /demo/servlet/health to BullrunDemoServlet")
    void testServletEndpointViaHttp() {
        ResponseEntity<String> response = restTemplate.getForEntity("/demo/servlet/health", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("\"status\":\"UP\""));
        assertTrue(response.getBody().contains("\"servletClass\":\"com.bullrun.security.servlet.BullrunDemoServlet\""));
    }
}
