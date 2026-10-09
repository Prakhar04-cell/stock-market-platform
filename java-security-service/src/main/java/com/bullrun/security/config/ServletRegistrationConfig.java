package com.bullrun.security.config;

import com.bullrun.security.servlet.BullrunDemoServlet;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registration configuration for raw Servlets (PART H).
 * Seamlessly integrates the dedicated HttpServlet into the embedded Tomcat container
 * without competing with or disrupting Spring Boot MVC DispatcherServlet.
 */
@Configuration
public class ServletRegistrationConfig {

    @Bean
    public ServletRegistrationBean<BullrunDemoServlet> bullrunDemoServletRegistration() {
        ServletRegistrationBean<BullrunDemoServlet> registrationBean = new ServletRegistrationBean<>(
            new BullrunDemoServlet(),
            "/demo/servlet/*"
        );
        registrationBean.setName("BullrunDemoServlet");
        registrationBean.setLoadOnStartup(1);
        return registrationBean;
    }
}
