package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.auth.AuthUserResponse;
import com.tecnocampus.LS2.protube_back.dto.auth.ProfileRequest;
import com.tecnocampus.LS2.protube_back.dto.auth.ProfileResponse;
import com.tecnocampus.LS2.protube_back.dto.auth.PasswordRequest;
import com.tecnocampus.LS2.protube_back.dto.auth.LoginRequest;
import com.tecnocampus.LS2.protube_back.dto.auth.RegisterRequest;
import com.tecnocampus.LS2.protube_back.security.SessionAuthentication;
import com.tecnocampus.LS2.protube_back.services.AuthService;
import com.tecnocampus.LS2.protube_back.services.AvatarService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService users;
    private final SessionAuthentication sessions;
    private final AuthenticationManager authentication;
    private final AvatarService avatars;

    public AuthController(AuthService users, SessionAuthentication sessions, AuthenticationManager authentication, AvatarService avatars) {
        this.users = users;
        this.sessions = sessions;
        this.authentication = authentication;
        this.avatars = avatars;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthUserResponse register(@RequestBody RegisterRequest body,
                                    HttpServletRequest request, HttpServletResponse response) {
        var user = users.register(body);
        sessions.signIn(user, request, response);
        return user;
    }

    @PostMapping("/login")
    public AuthUserResponse login(@RequestBody LoginRequest body,
                                 HttpServletRequest request, HttpServletResponse response) {
        // Validate nulls before constructing a Spring token (which requires a principal).
        var result = authentication.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(
                body.email() == null ? "" : body.email(), body.password()));
        var user = (AuthUserResponse) result.getPrincipal();
        sessions.signIn(user, request, response);
        return user;
    }

    @GetMapping("/me")
    public AuthUserResponse me(@AuthenticationPrincipal Long id) {
        return users.current(id);
    }

    @GetMapping("/profile")
    public ProfileResponse profile(@AuthenticationPrincipal Long id) {
        return users.profile(id);
    }

    @PatchMapping("/profile")
    public ProfileResponse updateProfile(@AuthenticationPrincipal Long id, @RequestBody ProfileRequest body) {
        return users.updateProfile(id, body);
    }
    @PutMapping(path = "/profile/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateAvatar(@AuthenticationPrincipal Long id,
                             @RequestParam("avatar") MultipartFile avatar) {
        avatars.updateAvatar(id, avatar);
    }

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Long id, @RequestBody PasswordRequest body,
                               HttpServletRequest request, HttpServletResponse response) {
        users.changePassword(id, body);
        sessions.signOut(request, response);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        sessions.signOut(request, response);
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getToken(), token.getHeaderName());
    }

    public record CsrfResponse(String token, String headerName) {}




}
