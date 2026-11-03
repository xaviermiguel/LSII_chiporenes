package com.tecnocampus.LS2.protube_back.dto.video;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.tecnocampus.LS2.protube_back.dto.auth.StrictStringDeserializer;
import java.util.List;

public class VideoUpdateRequest {
    @JsonDeserialize(using = StrictStringDeserializer.class)
    public String title;
    @JsonDeserialize(using = StrictStringDeserializer.class)
    public String description;
    @JsonDeserialize(contentUsing = StrictStringDeserializer.class)
    public List<String> tags;
    private Long categoryId;
    private boolean categorySupplied;

    @JsonSetter("categoryId")
    public void setCategoryId(JsonNode categoryId) {
        if (!categoryId.isNull() && (!categoryId.isIntegralNumber() || !categoryId.canConvertToLong())) {
            throw new IllegalArgumentException("categoryId must be an integer or null");
        }
        this.categoryId = categoryId.isNull() ? null : categoryId.longValue();
        this.categorySupplied = true;
    }

    public String title() { return title; }
    public String description() { return description; }
    public List<String> tags() { return tags; }
    public Long categoryId() { return categoryId; }
    public boolean categorySupplied() { return categorySupplied; }
}
