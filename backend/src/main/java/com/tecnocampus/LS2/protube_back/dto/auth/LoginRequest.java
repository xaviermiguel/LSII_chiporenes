package com.tecnocampus.LS2.protube_back.dto.auth;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

public record LoginRequest(
        @JsonDeserialize(using = StrictStringDeserializer.class) String email,
        @JsonDeserialize(using = StrictStringDeserializer.class) String password) {
    @Override
    public String toString() {
        return "LoginRequest[credentials redacted]";
    }
}
