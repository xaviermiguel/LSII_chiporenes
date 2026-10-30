package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.auth.AuthUserResponse;
import com.tecnocampus.LS2.protube_back.dto.auth.LoginRequest;
import com.tecnocampus.LS2.protube_back.dto.auth.RegisterRequest;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthValidationException;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthenticationRequiredException;
import com.tecnocampus.LS2.protube_back.services.exceptions.DuplicateEmailException;
import com.tecnocampus.LS2.protube_back.services.exceptions.InvalidCredentialsException;
import org.hibernate.exception.ConstraintViolationException;
import org.postgresql.util.PSQLException;
import org.springframework.dao.DataIntegrityViolationException;
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
            throw new AuthValidationException(AuthValidationException.Reason.MISSING_FIELDS);
        }
        String name = request.displayName().strip();
        String email = normalizeEmail(request.email());
        if (name.codePointCount(0, name.length()) > 30) {
            throw new AuthValidationException(AuthValidationException.Reason.DISPLAY_NAME);
        }
        validateEmail(email);
        validatePassword(request.password());
        if (!request.password().equals(request.confirmPassword())) {
            throw new AuthValidationException(AuthValidationException.Reason.PASSWORD_CONFIRMATION);
        }
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateEmailException();
        }
        User user = new User();
        user.setDisplayName(name);
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(request.password()));
        try {
            return response(users.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            if (isDuplicateEmail(exception)) {
                throw new DuplicateEmailException();
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public AuthUserResponse login(LoginRequest request) {
        if (request == null || blank(request.email()) || blank(request.password())) {
            throw new AuthValidationException(AuthValidationException.Reason.MISSING_FIELDS);
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
            throw new InvalidCredentialsException();
        }
        return response(user);
    }

    @Transactional(readOnly = true)
    public AuthUserResponse current(Long id) {
        if (id == null) {
            throw new AuthenticationRequiredException();
        }
        return users.findById(id).filter(User::isEnabled).map(AuthService::response)
                .orElseThrow(AuthenticationRequiredException::new);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private static void validateEmail(String email) {
        if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
            throw new AuthValidationException(AuthValidationException.Reason.EMAIL);
        }
    }

    private static void validatePassword(String password) {
        if (password.length() < 8 || password.length() > 72
                || password.charAt(0) == ' ' || password.charAt(password.length() - 1) == ' '
                || password.chars().anyMatch(character -> character < 0x20 || character > 0x7e)) {
            throw new AuthValidationException(AuthValidationException.Reason.PASSWORD);
        }
    }

    private static AuthUserResponse response(User user) {
        return new AuthUserResponse(user.getId(), user.getDisplayName(), user.getEmail());
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
