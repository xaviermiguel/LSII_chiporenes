package com.tecnocampus.LS2.protube_back.controller.exceptions;

import com.tecnocampus.LS2.protube_back.controller.AuthController;
import com.tecnocampus.LS2.protube_back.dto.ApiError;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthValidationException;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthenticationRequiredException;
import com.tecnocampus.LS2.protube_back.services.exceptions.DuplicateEmailException;
import com.tecnocampus.LS2.protube_back.services.exceptions.InvalidCredentialsException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpMediaTypeNotSupportedException;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {
    @ExceptionHandler(DuplicateEmailException.class)
    ResponseEntity<ApiError> duplicateEmail() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError("EMAIL_ALREADY_REGISTERED", "El email ya está registrado."));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    ResponseEntity<ApiError> invalidCredentials() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiError("INVALID_CREDENTIALS", "Email o contraseña incorrectos."));
    }

    @ExceptionHandler(AuthenticationRequiredException.class)
    ResponseEntity<ApiError> authenticationRequired() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiError("AUTHENTICATION_REQUIRED", "Debes iniciar sesión para realizar esta operación."));
    }

    @ExceptionHandler(AuthValidationException.class)
    ResponseEntity<ApiError> validation(AuthValidationException exception) {
        return ResponseEntity.badRequest().body(switch (exception.reason()) {
            case MISSING_FIELDS -> invalidRequestError();
            case DISPLAY_NAME -> new ApiError("INVALID_DISPLAY_NAME",
                    "El nombre de usuario debe tener entre 1 y 30 caracteres.");
            case EMAIL -> new ApiError("INVALID_EMAIL", "Introduce un email válido de hasta 254 caracteres.");
            case PASSWORD -> new ApiError("INVALID_PASSWORD",
                    "La contraseña debe tener entre 8 y 72 caracteres ASCII imprimibles, sin espacios al principio ni al final.");
            case PASSWORD_CONFIRMATION -> new ApiError("PASSWORD_MISMATCH", "Las contraseñas no coinciden.");
        });
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, HttpMediaTypeNotSupportedException.class})
    ResponseEntity<ApiError> malformed() {
        return ResponseEntity.badRequest().body(invalidRequestError());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected() {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiError("INTERNAL_ERROR",
                "Se ha producido un error interno."));
    }

    private static ApiError invalidRequestError() {
        return new ApiError("INVALID_REQUEST",
                "La solicitud contiene campos obligatorios ausentes o un formato incorrecto.");
    }
}
