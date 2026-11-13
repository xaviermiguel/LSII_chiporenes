package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.user.UserProfileResponse;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserProfileService {
    private final UserRepository users; 
    public UserProfileService (UserRepository users) {
        this.users = users;
    }
    
    @Transactional  
    public UserProfileResponse getPublicProfile (Long id){ 
        var user = users.findById(id)
                .orElseThrow(()-> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "user not found"
                ));
        String avatarPath = user.getAvatarPath();
        String avatarUrl = avatarPath == null || avatarPath.isBlank()
                ? "/assets/avatar-default.png"
                : "/media/" + avatarPath;

        return new UserProfileResponse(
                user.getId(),
                user.getDisplayName(),
                user.getDescription(), 
                avatarUrl
                
        );
    }
    
}
