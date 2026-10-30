package com.tecnocampus.LS2.protube_back.services.exceptions;

public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException() {
        super("An account with this email already exists.");
    }
}
