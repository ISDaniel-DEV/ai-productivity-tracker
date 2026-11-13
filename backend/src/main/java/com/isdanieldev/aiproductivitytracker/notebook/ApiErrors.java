package com.isdanieldev.aiproductivitytracker.notebook;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import org.springframework.dao.*;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.context.request.WebRequest;

@RestControllerAdvice
public class ApiErrors extends ResponseEntityExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ProblemDetail controlled(ResponseStatusException e) { return ProblemDetail.forStatusAndDetail(e.getStatusCode(),e.getReason()==null ? "No se pudo completar la operación." : e.getReason()); }
    @Override protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e,HttpHeaders headers,HttpStatusCode status,WebRequest request) {
        var problem=ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,"Revisa los campos obligatorios, sus formatos y longitudes.");
        problem.setProperty("fields",e.getBindingResult().getFieldErrors().stream().map(error->error.getField()).distinct().toList());
        return handleExceptionInternal(e,problem,headers,status,request);
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail conflict(DataIntegrityViolationException e) { return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,"Los datos entran en conflicto con un registro o relación existente. Recarga antes de repetir."); }
    @ExceptionHandler(DataAccessException.class)
    ProblemDetail unavailable(DataAccessException e) { return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,"La base de datos no está disponible. No se ha confirmado el guardado; recarga antes de repetir."); }
}
