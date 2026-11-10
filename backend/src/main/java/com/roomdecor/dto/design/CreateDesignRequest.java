package com.roomdecor.dto.design;

import com.roomdecor.entity.Design;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * @param roomType optional: living, bedroom, kitchen, dining, office, kids, bathroom, other (default other)
 */
public record CreateDesignRequest(
    @NotBlank @Size(max = 200) String name,
    @NotNull UUID roomImageId,
    @Pattern(regexp = Design.ROOM_TYPE_PATTERN) String roomType
) {
    public CreateDesignRequest(String name, UUID roomImageId) {
        this(name, roomImageId, null);
    }
}
