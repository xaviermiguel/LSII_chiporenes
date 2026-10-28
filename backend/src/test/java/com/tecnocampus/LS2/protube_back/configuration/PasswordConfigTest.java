package com.tecnocampus.LS2.protube_back.configuration;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class PasswordConfigTest {
    @Test
    void hashesWithUniqueSaltAndVerifiesPasswords() {
        try (var context = new AnnotationConfigApplicationContext(PasswordConfig.class)) {
            var encoder = context.getBean(PasswordEncoder.class);
            var password = "Example-password-for-test";
            var hash = encoder.encode(password);
            var secondHash = encoder.encode(password);

            assertNotEquals(password, hash);
            assertNotEquals(hash, secondHash);
            assertTrue(encoder.matches(password, hash));
            assertTrue(encoder.matches(password, secondHash));
            assertFalse(encoder.matches("Wrong-password", hash));
        }
    }
}
