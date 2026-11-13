package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.user.UserProfileResponse;
import com.tecnocampus.LS2.protube_back.services.UserProfileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping ("api/users")
public class UserProfileController {
    private final UserProfileService profiles;
    public UserProfileController(UserProfileService profiles) {
        this.profiles = profiles;
    }
    @GetMapping("/{id}")
    public UserProfileResponse getPublicProfile (@PathVariable Long id){
        return profiles.getPublicProfile(id);
    }
}
