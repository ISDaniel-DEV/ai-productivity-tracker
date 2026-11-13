package com.isdanieldev.aiproductivitytracker.notebook;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Set;

@Configuration
public class ApiConfiguration implements WebMvcConfigurer {
    private final OwnerProvider owner;
    public ApiConfiguration(OwnerProvider owner) { this.owner=owner; }
    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                response.setHeader("Cache-Control","no-store");
                if (!request.getRequestURI().startsWith("/api/auth/") && !request.getRequestURI().equals("/api/health")) {
                    if (!owner.currentOwner().getId().toString().equals(request.getHeader("X-Cuaderno-Account")))
                        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"La cuenta activa ha cambiado. Vuelve a entrar en tu cuaderno.");
                }
                response.setHeader("X-Content-Type-Options","nosniff");
                if (request.getContentLengthLong() > 5 * 1024 * 1024) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"La importación supera el máximo de 5 MB.");
                if (!Set.of("GET","HEAD","OPTIONS").contains(request.getMethod())) {
                    if (!"1".equals(request.getHeader("X-Cuaderno-Request")) || "cross-site".equals(request.getHeader("Sec-Fetch-Site")))
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,"La operación debe enviarse desde Cuaderno.");
                }
                return true;
            }
        }).addPathPatterns("/api/**");
    }
}
