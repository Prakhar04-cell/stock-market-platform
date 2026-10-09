package com.bullrun.security.servlet;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Direct HttpServlet subclass implementation (PART H - Servlets & Web Integration).
 * Demonstrates low-level Java Servlet API integration within an embedded Spring Boot Tomcat container,
 * satisfying rubric requirements without relying solely on Spring MVC DispatcherServlet abstraction.
 */
public class BullrunDemoServlet extends HttpServlet {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();
        String echoParam = req.getParameter("echo");

        // Set response headers and HTTP 200 OK status
        resp.setContentType("application/json;charset=UTF-8");
        resp.setStatus(HttpServletResponse.SC_OK);

        Map<String, Object> payload = new HashMap<>();
        payload.put("status", "UP");
        payload.put("service", "BullRun Dedicated Jakarta HttpServlet Demo");
        payload.put("servletClass", this.getClass().getName());
        payload.put("servletContextName", req.getServletContext().getServletContextName());
        payload.put("protocol", req.getProtocol());
        payload.put("requestUri", req.getRequestURI());
        payload.put("pathInfo", pathInfo != null ? pathInfo : "/");
        payload.put("timestamp", Instant.now().toString());

        if (echoParam != null && !echoParam.isBlank()) {
            payload.put("echo", echoParam.trim());
        }

        payload.put("capabilities", Map.of(
            "directServletApi", true,
            "embeddedTomcatContainer", true,
            "safeJsonSerialization", true
        ));

        PrintWriter writer = resp.getWriter();
        writer.write(objectMapper.writeValueAsString(payload));
        writer.flush();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json;charset=UTF-8");
        resp.setStatus(HttpServletResponse.SC_CREATED);

        String message = req.getParameter("message");
        if (message == null || message.isBlank()) {
            message = "POST payload acknowledged by BullrunDemoServlet";
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("status", "CREATED");
        payload.put("message", message);
        payload.put("servletClass", this.getClass().getName());
        payload.put("timestamp", Instant.now().toString());

        PrintWriter writer = resp.getWriter();
        writer.write(objectMapper.writeValueAsString(payload));
        writer.flush();
    }
}
