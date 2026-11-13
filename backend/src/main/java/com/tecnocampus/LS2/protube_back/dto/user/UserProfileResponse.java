package com.tecnocampus.LS2.protube_back.dto.user;

public record UserProfileResponse(
        Long id,
        String displayName,
        String description,
        String avatarURL

) {
}
