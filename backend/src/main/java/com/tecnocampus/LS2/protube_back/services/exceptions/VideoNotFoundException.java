package com.tecnocampus.LS2.protube_back.services.exceptions;

public class VideoNotFoundException extends RuntimeException {
    public VideoNotFoundException() {
        super("El vídeo solicitado no existe.");
    }

    public VideoNotFoundException(String message) {
        super(message);
    }
}
