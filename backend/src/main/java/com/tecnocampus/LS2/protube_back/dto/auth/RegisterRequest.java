package com.tecnocampus.LS2.protube_back.dto.auth;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

public record RegisterRequest(
        @JsonDeserialize(using = StrictStringDeserializer.class) String displayName,
        @JsonDeserialize(using = StrictStringDeserializer.class) String email,
        @JsonDeserialize(using = StrictStringDeserializer.class) String password,
        @JsonDeserialize(using = StrictStringDeserializer.class) String confirmPassword) {
    @Override
    public String toString() {
        return "RegisterRequest[credentials redacted]";
    }
}
