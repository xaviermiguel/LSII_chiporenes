package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Uses an existing PostgreSQL schema; the test transaction is rolled back. */
// TODO 1: Arrancar PostgreSQL y comprobar que existen la base y la tabla public.users.
// TODO 2: En IntelliJ, crear/editar la configuracion JUnit de ESTA clase (Java 21).
//         Las variables del arranque del backend no se copian automaticamente al test.
// TODO 3: En Environment variables de esa configuracion, definir con tus valores:
//         ENV_PROTUBE_DB_HOST=localhost (o el servidor que uses)
//         ENV_PROTUBE_DB=nombre_de_tu_base
//         ENV_PROTUBE_DB_USER=tu_usuario
//         ENV_PROTUBE_DB_PASS=tu_contrasena
//         RUN_POSTGRES_TESTS=true
//         No escribir credenciales reales en este archivo ni subirlas a Git.
// TODO 4: Confirmar el puerto: esta prueba usa 5432; adaptar la URL si usas otro.
// TODO 5: Ejecutar savesAndReadsUserFromPostgres con el boton verde de IntelliJ.
//         Resultado esperado: 1 test correcto, sin errores y sin estar omitido.
//         Si aparece skipped/ignored, revisar RUN_POSTGRES_TESTS=true.
//         Si falla validate, revisar la tabla frente a User; no usar create-drop.
// TODO 6: Tras ejecutarlo, confirmar que el usuario temporal no queda en users:
//         @DataJpaTest revierte la insercion al finalizar. No esperes verlo despues.
// TODO 7: Verificar aparte la persistencia tras reiniciar el backend usando un dato
//         confirmado fuera de esta transaccion. Este test no demuestra ese requisito.
// La preparacion, el guardado y las comprobaciones de abajo ya estan implementados.
@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:postgresql://${ENV_PROTUBE_DB_HOST}:5432/${ENV_PROTUBE_DB}",
        "spring.datasource.username=${ENV_PROTUBE_DB_USER}",
        "spring.datasource.password=${ENV_PROTUBE_DB_PASS}",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.sql.init.mode=never"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_TESTS", matches = "true")
class UserRepositoryPostgresTest {
    @Autowired UserRepository repository;
    @Autowired TestEntityManager entityManager;

    @Test
    void savesAndReadsUserFromPostgres() {
        var user = new User();
        var email = "repository-test-" + UUID.randomUUID() + "@example.com";
        var createdAt = Instant.parse("2026-10-14T10:00:00Z");
        user.setEmail(email);
        user.setPasswordHash("test-placeholder-not-for-login");
        user.setDisplayName("PostgreSQL repository test");
        user.setAvatarPath("avatars/test.webp");
        user.setDescription("Temporary integration test user");
        user.setCreatedAt(createdAt);

        var saved = repository.saveAndFlush(user);
        assertNotNull(saved.getId());
        var id = saved.getId();
        entityManager.clear();

        var loaded = repository.findById(id).orElseThrow();
        assertEquals(email, loaded.getEmail());
        assertEquals("test-placeholder-not-for-login", loaded.getPasswordHash());
        assertEquals("PostgreSQL repository test", loaded.getDisplayName());
        assertEquals("avatars/test.webp", loaded.getAvatarPath());
        assertEquals("Temporary integration test user", loaded.getDescription());
        assertEquals(createdAt, loaded.getCreatedAt());
    }
}
