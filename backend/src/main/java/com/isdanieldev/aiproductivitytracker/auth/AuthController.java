package com.isdanieldev.aiproductivitytracker.auth;

import com.isdanieldev.aiproductivitytracker.user.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.servlet.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    record Registration(@NotBlank @Size(max=100) String name,@NotBlank @Email @Size(max=254) String email,@NotNull @Size(min=12,max=128) String password) {}
    record Login(@NotBlank @Email @Size(max=254) String email,@NotNull @Size(min=1,max=128) String password) {}
    record Account(Long id,String name,String email) {}
    record Session(Account user) {}
    private final UserRepository users;private final PasswordEncoder passwords;private final SecurityContextRepository contexts;private final CsrfTokenRepository tokens;private final AuthRateLimit limits;private final SessionOwner owner;
    private final String dummy;
    public AuthController(UserRepository users,PasswordEncoder passwords,SecurityContextRepository contexts,CsrfTokenRepository tokens,AuthRateLimit limits,SessionOwner owner) {
        this.users=users;this.passwords=passwords;this.contexts=contexts;this.tokens=tokens;this.limits=limits;this.owner=owner;
        dummy=passwords.encode(UUID.randomUUID().toString());
    }
    @GetMapping("/csrf") Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @GetMapping("/session") Session session() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        return new Session(auth==null || "anonymousUser".equals(auth.getPrincipal()) ? null : account(owner.currentOwner()));
    }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    Session register(@Valid @RequestBody Registration input,HttpServletRequest request,HttpServletResponse response) {
        unauthenticated();limits.check("register:"+request.getRemoteAddr(),10);
        String email=normalize(input.email());
        if(users.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT,"No se pudo crear la cuenta con ese correo. Prueba a iniciar sesión.");
        UserEntity user;
        try { user=users.saveAndFlush(new UserEntity(email,passwords.encode(input.password()),input.name().trim())); }
        catch(DataIntegrityViolationException ex) { throw new ResponseStatusException(HttpStatus.CONFLICT,"No se pudo crear la cuenta con ese correo. Prueba a iniciar sesión."); }
        return signIn(user,request,response);
    }
    @PostMapping("/login") Session login(@Valid @RequestBody Login input,HttpServletRequest request,HttpServletResponse response) {
        unauthenticated();String email=normalize(input.email());
        limits.check("login-ip:"+request.getRemoteAddr(),100);limits.check("login-account:"+email,15);
        var user=users.findByEmail(email);
        boolean matches=passwords.matches(input.password(),user.map(UserEntity::getPasswordHash).orElse(dummy));
        if(user.isEmpty() || !matches) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Correo o contraseña incorrectos.");
        return signIn(user.get(),request,response);
    }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request,HttpServletResponse response) {
        var session=request.getSession(false);if(session!=null)session.invalidate();
        SecurityContextHolder.clearContext();tokens.saveToken(null,request,response);
        var cookie=new Cookie("CUADERNO_SESSION","");cookie.setPath("/");cookie.setMaxAge(0);cookie.setHttpOnly(true);cookie.setSecure(request.isSecure());cookie.setAttribute("SameSite","Lax");response.addCookie(cookie);
    }
    private Session signIn(UserEntity user,HttpServletRequest request,HttpServletResponse response) {
        if(request.getSession(false)!=null) request.changeSessionId();
        var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user.getId().toString(),null,List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        SecurityContextHolder.setContext(context);contexts.saveContext(context,request,response);
        tokens.saveToken(null,request,response);
        return new Session(account(user));
    }
    private static String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    private static Account account(UserEntity user) { return new Account(user.getId(),user.getName(),user.getEmail()); }
    private static void unauthenticated() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Cierra la sesión actual antes de acceder con otra cuenta.");
    }
}
