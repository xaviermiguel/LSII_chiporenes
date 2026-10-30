package com.tecnocampus.LS2.protube_back.services.exceptions;

public class AuthenticationRequiredException extends RuntimeException {
    public AuthenticationRequiredException() {
        super("An existing enabled account is required.");
    }
}
