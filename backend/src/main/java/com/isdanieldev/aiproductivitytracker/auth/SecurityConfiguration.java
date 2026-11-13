package com.isdanieldev.aiproductivitytracker.auth;

import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;
import org.springframework.security.crypto.password.*;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfiguration {
    @Bean org.springframework.security.core.userdetails.UserDetailsService userDetails(com.isdanieldev.aiproductivitytracker.user.UserRepository users) {
        return email -> users.findByEmail(email.trim().toLowerCase(java.util.Locale.ROOT))
            .map(user -> org.springframework.security.core.userdetails.User.withUsername(user.getId().toString()).password(user.getPasswordHash()).roles("USER").build())
            .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException("Cuenta no disponible"));
    }
    @Bean PasswordEncoder passwords() { return Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8(); }
    @Bean SecurityContextRepository contexts() { return new HttpSessionSecurityContextRepository(); }
    @Bean CsrfTokenRepository csrfTokens() { return new HttpSessionCsrfTokenRepository(); }
    @Bean SecurityFilterChain security(HttpSecurity http, SecurityContextRepository contexts, CsrfTokenRepository tokens) throws Exception {
        http.securityContext(c -> c.securityContextRepository(contexts))
            .csrf(c -> c.csrfTokenRepository(tokens))
            .authorizeHttpRequests(a -> a.requestMatchers("/api/health", "/api/auth/csrf", "/api/auth/session", "/api/auth/login", "/api/auth/register").permitAll().anyRequest().authenticated())
            .requestCache(c -> c.disable()).formLogin(c -> c.disable()).httpBasic(c -> c.disable()).logout(c -> c.disable())
            .exceptionHandling(e -> e.authenticationEntryPoint((req,res,ex) -> problem(res,401,"Inicia sesión para acceder a tu cuaderno."))
                .accessDeniedHandler((req,res,ex) -> problem(res,403,"La sesión de seguridad ha cambiado. Actualiza la página y vuelve a intentarlo.")));
        return http.build();
    }
    static void problem(HttpServletResponse response, int status, String detail) throws java.io.IOException {
        response.setStatus(status);response.setContentType("application/problem+json");response.setHeader("Cache-Control","no-store");
        response.getWriter().write("{\"status\":"+status+",\"detail\":\""+detail+"\"}");
    }
}
