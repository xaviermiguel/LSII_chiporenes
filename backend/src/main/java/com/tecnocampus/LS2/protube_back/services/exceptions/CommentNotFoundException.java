package com.tecnocampus.LS2.protube_back.services.exceptions;

public class CommentNotFoundException extends RuntimeException {
    public CommentNotFoundException() {
        super("El comentario solicitado no existe en este vídeo.");
    }
}
