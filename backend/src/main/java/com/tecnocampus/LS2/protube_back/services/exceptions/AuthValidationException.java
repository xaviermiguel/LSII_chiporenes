package com.tecnocampus.LS2.protube_back.services.exceptions;

public class AuthValidationException extends RuntimeException {
    public enum Reason {
        MISSING_FIELDS, DISPLAY_NAME, EMAIL, PASSWORD, PASSWORD_CONFIRMATION
    }

    private final Reason reason;

    public AuthValidationException(Reason reason) {
        super("Invalid authentication input: " + reason);
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }
}
