package com.tecnocampus.LS2.protube_back.services.exceptions;

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("The credentials do not identify an enabled account.");
    }
}
