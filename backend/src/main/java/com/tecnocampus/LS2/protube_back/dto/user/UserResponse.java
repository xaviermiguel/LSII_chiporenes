package com.tecnocampus.LS2.protube_back.dto.user;

import java.time.Instant;

// Perfil público: no incluye email ni passwordHash.
// TODO: Añadir una prueba de serialización que compruebe que no se exponen credenciales.
public record UserResponse(
        Long id,
        String displayName,
        String avatarPath,
        String description,
        Instant createdAt
) {}
