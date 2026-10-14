package com.tecnocampus.LS2.protube_back.mapper;

import com.tecnocampus.LS2.protube_back.dto.user.UserResponse;
import com.tecnocampus.LS2.protube_back.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    // TODO: Añadir una prueba que compruebe cada campo y un avatarPath nulo.
    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getDisplayName(),
                user.getAvatarPath(),
                user.getDescription(),
                user.getCreatedAt()
        );
    }
}
