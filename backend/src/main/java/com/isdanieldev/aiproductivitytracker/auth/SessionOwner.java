package com.isdanieldev.aiproductivitytracker.auth;
import com.isdanieldev.aiproductivitytracker.notebook.OwnerProvider;
import com.isdanieldev.aiproductivitytracker.user.*;
import org.springframework.stereotype.Component;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@Component
public class SessionOwner implements OwnerProvider {
    private final UserRepository users;
    public SessionOwner(UserRepository users) { this.users=users; }
    @Override public UserEntity currentOwner() {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Inicia sesión para acceder a tu cuaderno.");
        try { return users.findById(Long.parseLong(authentication.getName())).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,"La cuenta ya no está disponible.")); }
        catch(NumberFormatException e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Inicia sesión de nuevo."); }
    }
}
