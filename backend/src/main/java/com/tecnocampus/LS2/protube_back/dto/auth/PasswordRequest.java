package com.tecnocampus.LS2.protube_back.dto.auth;

public record PasswordRequest(String currentPassword, String newPassword, String confirmPassword) {}
