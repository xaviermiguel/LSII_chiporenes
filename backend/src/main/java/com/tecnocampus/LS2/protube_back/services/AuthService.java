package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.auth.AuthUserResponse;
import com.tecnocampus.LS2.protube_back.dto.auth.LoginRequest;
import com.tecnocampus.LS2.protube_back.dto.auth.RegisterRequest;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.postgresql.util.PSQLException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {
    // Dot-separated local parts and domain labels exclude whitespace and malformed addresses.
    private static final Pattern EMAIL = Pattern.compile(
            "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@"
                    + "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
                    + "(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+");

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwords) {
        this.users = users;
        this.passwords = passwords;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public AuthUserResponse register(RegisterRequest request) {
        if (request == null || blank(request.displayName()) || blank(request.email())
                || blank(request.password()) || blank(request.confirmPassword())) {
            throw invalidRequest();
        }
        String name = request.displayName().strip();
        String email = normalizeEmail(request.email());
        if (name.codePointCount(0, name.length()) > 30) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "INVALID_DISPLAY_NAME",
                    "El nombre de usuario debe tener entre 1 y 30 caracteres.");
        }
        validateEmail(email);
        validatePassword(request.password());
        if (!request.password().equals(request.confirmPassword())) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH",
                    "Las contraseñas no coinciden.");
        }
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw duplicateEmail();
        }
        User user = new User();
        user.setDisplayName(name);
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(request.password()));
        try {
            return response(users.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            if (isDuplicateEmail(exception)) {
                throw duplicateEmail();
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public AuthUserResponse login(LoginRequest request) {
        if (request == null || blank(request.email()) || blank(request.password())) {
            throw invalidRequest();
        }
        User user = users.findByEmailIgnoreCase(normalizeEmail(request.email())).orElse(null);
        // Missing accounts also perform a password comparison to reduce account-enumeration timing differences.
        boolean validCandidate = request.password().length() <= 72
                && request.password().chars().allMatch(character -> character >= 0x20 && character <= 0x7e);
        boolean matches;
        try {
            matches = passwords.matches(validCandidate ? request.password() : "invalid login candidate",
                    user == null || !validCandidate ? dummyHash : user.getPasswordHash());
        } catch (IllegalArgumentException exception) {
            // BCrypt implementations may reject candidates over their byte limit.
            matches = false;
        }
        if (user == null || !validCandidate || !matches || !user.isEnabled()) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                    "Email o contraseña incorrectos.");
        }
        return response(user);
    }

    @Transactional(readOnly = true)
    public AuthUserResponse current(Long id) {
        if (id == null) {
            throw authenticationRequired();
        }
        return users.findById(id).filter(User::isEnabled).map(AuthService::response)
                .orElseThrow(AuthService::authenticationRequired);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private static void validateEmail(String email) {
        if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "INVALID_EMAIL",
                    "Introduce un email válido de hasta 254 caracteres.");
        }
    }

    private static void validatePassword(String password) {
        if (password.length() < 8 || password.length() > 72
                || password.charAt(0) == ' ' || password.charAt(password.length() - 1) == ' '
                || password.chars().anyMatch(character -> character < 0x20 || character > 0x7e)) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD",
                    "La contraseña debe tener entre 8 y 72 caracteres ASCII imprimibles, sin espacios al principio ni al final.");
        }
    }

    private static AuthUserResponse response(User user) {
        return new AuthUserResponse(user.getId(), user.getDisplayName(), user.getEmail());
    }

    private static AuthException invalidRequest() {
        return new AuthException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST",
                "La solicitud contiene campos obligatorios ausentes o un formato incorrecto.");
    }

    private static AuthException duplicateEmail() {
        return new AuthException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED", "El email ya está registrado.");
    }

    private static AuthException authenticationRequired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED",
                "Debes iniciar sesión para realizar esta operación.");
    }

    private static boolean isDuplicateEmail(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation
                    && "23505".equals(violation.getSQLState())
                    && "users_email_unique".equals(violation.getConstraintName())) {
                return true;
            }
            if (cause instanceof PSQLException postgres && "23505".equals(postgres.getSQLState())
                    && postgres.getServerErrorMessage() != null
                    && "users_email_unique".equals(postgres.getServerErrorMessage().getConstraint())) {
                return true;
            }
        }
        return false;
    }
}
