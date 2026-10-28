package com.tecnocampus.LS2.protube_back.dto.auth;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;

/** Credential fields must be JSON strings; Jackson's default scalar coercion is not appropriate here. */
public class StrictStringDeserializer extends StdDeserializer<String> {
    public StrictStringDeserializer() {
        super(String.class);
    }

    @Override
    public String deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        if (!parser.hasToken(JsonToken.VALUE_STRING)) {
            return context.reportInputMismatch(String.class, "Expected a JSON string.");
        }
        return parser.getText();
    }
}
