package com.tecnocampus.LS2.protube_back.services.exceptions;

public class VideoAccessDeniedException extends RuntimeException {
    public VideoAccessDeniedException(String message) {
        super(message);
    }
}
