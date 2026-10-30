package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.controller.exceptions.AuthExceptionHandler;
import com.tecnocampus.LS2.protube_back.security.SessionAuthentication;
import com.tecnocampus.LS2.protube_back.services.AuthService;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthValidationException;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthenticationRequiredException;
import com.tecnocampus.LS2.protube_back.services.exceptions.DuplicateEmailException;
import com.tecnocampus.LS2.protube_back.services.exceptions.InvalidCredentialsException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthExceptionHandlerTest {
    private final AuthService service = mock(AuthService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AuthController(service,
                    mock(SessionAuthentication.class), mock(AuthenticationManager.class)))
            .setControllerAdvice(new AuthExceptionHandler()).build();

    static Stream<Arguments> failures() {
        return Stream.of(
                Arguments.of(new DuplicateEmailException(), 409, "EMAIL_ALREADY_REGISTERED",
                        "El email ya está registrado."),
                Arguments.of(new InvalidCredentialsException(), 401, "INVALID_CREDENTIALS",
                        "Email o contraseña incorrectos."),
                Arguments.of(new AuthenticationRequiredException(), 401, "AUTHENTICATION_REQUIRED",
                        "Debes iniciar sesión para realizar esta operación."),
                Arguments.of(new AuthValidationException(AuthValidationException.Reason.MISSING_FIELDS),
                        400, "INVALID_REQUEST", "La solicitud contiene campos obligatorios ausentes o un formato incorrecto."),
                Arguments.of(new AuthValidationException(AuthValidationException.Reason.DISPLAY_NAME),
                        400, "INVALID_DISPLAY_NAME", "El nombre de usuario debe tener entre 1 y 30 caracteres."),
                Arguments.of(new AuthValidationException(AuthValidationException.Reason.EMAIL),
                        400, "INVALID_EMAIL", "Introduce un email válido de hasta 254 caracteres."),
                Arguments.of(new AuthValidationException(AuthValidationException.Reason.PASSWORD),
                        400, "INVALID_PASSWORD",
                        "La contraseña debe tener entre 8 y 72 caracteres ASCII imprimibles, sin espacios al principio ni al final."),
                Arguments.of(new AuthValidationException(AuthValidationException.Reason.PASSWORD_CONFIRMATION),
                        400, "PASSWORD_MISMATCH", "Las contraseñas no coinciden."),
                Arguments.of(new IllegalStateException("private database details"),
                        500, "INTERNAL_ERROR", "Se ha producido un error interno."));
    }

    @ParameterizedTest
    @MethodSource("failures")
    void mapsServiceFailuresToTheExistingHttpContract(RuntimeException failure, int status,
                                                     String code, String message) throws Exception {
        when(service.register(any())).thenThrow(failure);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"displayName":"Name","email":"a@example.com",
                         "password":"password","confirmPassword":"password"}
                        """))
                .andExpect(status().is(status))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().json(new ObjectMapper()
                        .writeValueAsString(Map.of("code", code, "message", message)), true));
    }

    @Test
    void malformedJsonAndUnsupportedBodyFormatRemainBadRequests() throws Exception {
        for (var type : new MediaType[]{MediaType.APPLICATION_JSON, MediaType.TEXT_PLAIN}) {
            mvc.perform(post("/api/auth/register").contentType(type).content("{invalid-json"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                    .andExpect(jsonPath("$.message").value(
                            "La solicitud contiene campos obligatorios ausentes o un formato incorrecto."));
        }
        verifyNoInteractions(service);
    }
}
