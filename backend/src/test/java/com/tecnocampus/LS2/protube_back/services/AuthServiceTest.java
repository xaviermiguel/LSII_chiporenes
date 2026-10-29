package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.auth.LoginRequest;
import com.tecnocampus.LS2.protube_back.dto.auth.RegisterRequest;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthValidationException;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthenticationRequiredException;
import com.tecnocampus.LS2.protube_back.services.exceptions.DuplicateEmailException;
import com.tecnocampus.LS2.protube_back.services.exceptions.InvalidCredentialsException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.SQLException;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(4);
    private AuthService auth;

    @BeforeEach
    void setUp() {
        auth = new AuthService(users, passwords);
    }

    @Test
    void registersNormalizedFieldsWithHashAndRepeatedDisplayNameAllowed() {
        when(users.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(42L);
            assertTrue(saved.isEnabled());
            assertNotEquals("My password!", saved.getPasswordHash());
            assertTrue(passwords.matches("My password!", saved.getPasswordHash()));
            return saved;
        });
        var result = auth.register(new RegisterRequest("  Public Name  ", "  USER@Example.COM  ",
                "My password!", "My password!"));
        assertEquals(42L, result.id());
        assertEquals("Public Name", result.displayName());
        assertEquals("user@example.com", result.email());
        verify(users).findByEmailIgnoreCase("user@example.com");
        verify(users).saveAndFlush(any(User.class));
        verifyNoMoreInteractions(users);
    }

    @Test
    void emailNormalizationDoesNotDependOnDefaultLocale() {
        Locale previous = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            when(users.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            assertEquals("info@example.com", auth.register(new RegisterRequest("Name", "INFO@EXAMPLE.COM",
                    "password", "password")).email());
        } finally {
            Locale.setDefault(previous);
        }
    }

    static Stream<RegisterRequest> missingFields() {
        return Stream.of(null,
                new RegisterRequest(null, "a@example.com", "password", "password"),
                new RegisterRequest(" ", "a@example.com", "password", "password"),
                new RegisterRequest("Name", null, "password", "password"),
                new RegisterRequest("Name", " \t ", "password", "password"),
                new RegisterRequest("Name", "a@example.com", null, "password"),
                new RegisterRequest("Name", "a@example.com", "", "password"),
                new RegisterRequest("Name", "a@example.com", "password", null),
                new RegisterRequest("Name", "a@example.com", "password", " "));
    }

    @ParameterizedTest
    @MethodSource("missingFields")
    void rejectsMissingFieldsBeforeOtherValidations(RegisterRequest request) {
        assertValidation(AuthValidationException.Reason.MISSING_FIELDS, () -> auth.register(request));
        verifyNoInteractions(users);
    }

    @Test
    void validatesPresentFieldsInAgreedOrder() {
        assertValidation(AuthValidationException.Reason.DISPLAY_NAME, () -> auth.register(
                new RegisterRequest("a".repeat(31), "bad-email", "short", "different")));
        assertValidation(AuthValidationException.Reason.EMAIL, () -> auth.register(
                new RegisterRequest("Name", "bad-email", "short", "different")));
        assertValidation(AuthValidationException.Reason.PASSWORD, () -> auth.register(
                new RegisterRequest("Name", "a@example.com", "short", "different")));
        assertValidation(AuthValidationException.Reason.PASSWORD_CONFIRMATION, () -> auth.register(
                new RegisterRequest("Name", "a@example.com", "password", "different")));
        verifyNoInteractions(users);
    }

    @ParameterizedTest
    @ValueSource(strings = {"not-email", "user@localhost", "user name@example.com", "user@exam ple.com",
            "user@@example.com", ".user@example.com", "user..name@example.com", "user@-example.com",
            "user@example..com", "user@example.com.", "user@example.com\ninside"})
    void rejectsMalformedEmails(String email) {
        assertValidation(AuthValidationException.Reason.EMAIL,
                () -> auth.register(new RegisterRequest("Name", email, "password", "password")));
        verifyNoInteractions(users);
    }

    @Test
    void acceptsMaximumEmailAndNameButRejectsOverflow() {
        String maxEmail = "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(61);
        assertEquals(254, maxEmail.length());
        when(users.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        assertEquals(maxEmail, auth.register(new RegisterRequest("x".repeat(30), maxEmail,
                "password", "password")).email());
        assertValidation(AuthValidationException.Reason.EMAIL,
                () -> auth.register(new RegisterRequest("Name", "a" + maxEmail, "password", "password")));
        assertValidation(AuthValidationException.Reason.DISPLAY_NAME,
                () -> auth.register(new RegisterRequest("x".repeat(31), "a@example.com", "password", "password")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"short", " password", "password ", "pass\tword", "pass\nword",
            "contraseña", "password😀", "password\u007f"})
    void rejectsInvalidPasswordsWithoutChangingThem(String password) {
        assertValidation(AuthValidationException.Reason.PASSWORD,
                () -> auth.register(new RegisterRequest("Name", "a@example.com", password, password)));
        verifyNoInteractions(users);
    }

    @Test
    void acceptsAsciiBoundariesAndInteriorSpacesButRejects73Characters() {
        when(users.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        for (String password : new String[]{"12345678", "x".repeat(72), "! \"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"}) {
            assertNotNull(auth.register(new RegisterRequest("N", "a@example.com", password, password)));
        }
        String tooLong = "x".repeat(73);
        assertValidation(AuthValidationException.Reason.PASSWORD,
                () -> auth.register(new RegisterRequest("Name", "a@example.com", tooLong, tooLong)));
    }

    @Test
    void rejectsKnownDuplicateBeforeHashingAndSaving() {
        when(users.findByEmailIgnoreCase("a@example.com")).thenReturn(Optional.of(user()));
        assertThrows(DuplicateEmailException.class,
                () -> auth.register(validRegistration()));
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void translatesOnlyTheEmailUniqueViolationFromConcurrentRegistration() {
        var sql = new SQLException("private database details", "23505");
        var constraint = new ConstraintViolationException("private details", sql, "users_email_unique");
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("private details", constraint));
        var error = assertThrows(DuplicateEmailException.class,
                () -> auth.register(validRegistration()));
        assertFalse(error.getMessage().contains("private"));
        assertNull(error.getCause());
    }

    @Test
    void doesNotMislabelOtherIntegrityErrorsAsDuplicateEmail() {
        var sql = new SQLException("details", "23514");
        var constraint = new ConstraintViolationException("details", sql, "users_password_not_empty");
        var failure = new DataIntegrityViolationException("details", constraint);
        when(users.saveAndFlush(any())).thenThrow(failure);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> auth.register(validRegistration())));
    }

    @Test
    void logsInWithNormalizedEmailAndExactPassword() {
        User user = user();
        user.setPasswordHash(passwords.encode("My password!"));
        when(users.findByEmailIgnoreCase("a@example.com")).thenReturn(Optional.of(user));
        var result = auth.login(new LoginRequest(" A@EXAMPLE.COM ", "My password!"));
        assertEquals(42L, result.id());
        assertThrows(InvalidCredentialsException.class,
                () -> auth.login(new LoginRequest("a@example.com", "My password! ")));
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void rejectsWrongMissingAndDisabledAccountsWithTheSameError() {
        assertThrows(InvalidCredentialsException.class,
                () -> auth.login(new LoginRequest("missing@example.com", "password")));
        User user = user();
        user.setPasswordHash(passwords.encode("password"));
        when(users.findByEmailIgnoreCase("a@example.com")).thenReturn(Optional.of(user));
        assertThrows(InvalidCredentialsException.class,
                () -> auth.login(new LoginRequest("a@example.com", "incorrect")));
        user.setEnabled(false);
        assertThrows(InvalidCredentialsException.class,
                () -> auth.login(new LoginRequest("a@example.com", "password")));
    }

    @Test
    void malformedLoginNeverLooksLikeAnAuthenticationFailure() {
        assertValidation(AuthValidationException.Reason.MISSING_FIELDS, () -> auth.login(null));
        assertValidation(AuthValidationException.Reason.MISSING_FIELDS, () -> auth.login(new LoginRequest(" ", "password")));
        assertValidation(AuthValidationException.Reason.MISSING_FIELDS, () -> auth.login(new LoginRequest("a@example.com", "")));
        assertValidation(AuthValidationException.Reason.MISSING_FIELDS, () -> auth.login(new LoginRequest("a@example.com", null)));
        verifyNoInteractions(users);
    }

    @Test
    void rejectsBcryptCandidatesThatTheEncoderCannotProcess() {
        var rejecting = mock(org.springframework.security.crypto.password.PasswordEncoder.class);
        when(rejecting.encode(any())).thenReturn("dummy-hash");
        when(rejecting.matches(any(), any())).thenThrow(new IllegalArgumentException("too many bytes"));
        var service = new AuthService(users, rejecting);
        assertThrows(InvalidCredentialsException.class,
                () -> service.login(new LoginRequest("a@example.com", "x".repeat(100))));
    }

    @Test
    void doesNotAuthenticatePasswordsWithAnExtraSuffixPastTheBcryptLimit() {
        User user = user();
        user.setPasswordHash(passwords.encode("x".repeat(72)));
        when(users.findByEmailIgnoreCase("a@example.com")).thenReturn(Optional.of(user));
        assertNotNull(auth.login(new LoginRequest("a@example.com", "x".repeat(72))));
        assertThrows(InvalidCredentialsException.class,
                () -> auth.login(new LoginRequest("a@example.com", "x".repeat(73))));
        assertThrows(InvalidCredentialsException.class,
                () -> auth.login(new LoginRequest("a@example.com", "password😀")));
    }

    @Test
    void currentUserRequiresAnExistingEnabledAccount() {
        User user = user();
        when(users.findById(42L)).thenReturn(Optional.of(user));
        assertEquals("a@example.com", auth.current(42L).email());
        assertThrows(AuthenticationRequiredException.class, () -> auth.current(null));
        assertThrows(AuthenticationRequiredException.class, () -> auth.current(99L));
        user.setEnabled(false);
        assertThrows(AuthenticationRequiredException.class, () -> auth.current(42L));
    }

    @Test
    void inputDtoStringRepresentationsDoNotLeakCredentials() {
        assertFalse(validRegistration().toString().contains("password"));
        assertFalse(new LoginRequest("private@example.com", "private-password").toString().contains("private"));
    }

    private static RegisterRequest validRegistration() {
        return new RegisterRequest("Name", "a@example.com", "password", "password");
    }

    private static User user() {
        User user = new User();
        user.setId(42L);
        user.setEmail("a@example.com");
        user.setDisplayName("Name");
        return user;
    }

    private static void assertValidation(AuthValidationException.Reason reason,
                                         org.junit.jupiter.api.function.Executable action) {
        var error = assertThrows(AuthValidationException.class, action);
        assertEquals(reason, error.reason());
    }
}
