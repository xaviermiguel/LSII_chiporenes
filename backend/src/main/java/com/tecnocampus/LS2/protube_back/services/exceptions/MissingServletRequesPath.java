package com.tecnocampus.LS2.protube_back.services.exceptions;

public class MissingServletRequesPath extends RuntimeException {
    public MissingServletRequesPath(String message) {
        super(message);
    }
}
