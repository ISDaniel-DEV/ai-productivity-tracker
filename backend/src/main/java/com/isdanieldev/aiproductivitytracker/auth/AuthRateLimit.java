package com.isdanieldev.aiproductivitytracker.auth;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;
/** Límite local de intentos, sin almacenar contraseñas. Se reinicia con el proceso. */
@Component
public class AuthRateLimit {
    private record Window(long start,int count) {}
    private final Map<String,Window> windows=new HashMap<>();
    public synchronized void check(String key,int maximum) {
        long now=System.currentTimeMillis();long duration=Duration.ofMinutes(15).toMillis();
        windows.entrySet().removeIf(e -> now-e.getValue().start()>duration);
        var previous=windows.get(key);
        if(previous==null) { if(windows.size()>=10000) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Demasiados intentos. Inténtalo dentro de 15 minutos.");windows.put(key,new Window(now,1));return; }
        if(previous.count()>=maximum) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Demasiados intentos. Inténtalo dentro de 15 minutos.");
        windows.put(key,new Window(previous.start(),previous.count()+1));
    }
}
