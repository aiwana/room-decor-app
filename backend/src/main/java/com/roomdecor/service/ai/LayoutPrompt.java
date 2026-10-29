package com.roomdecor.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.roomdecor.entity.Opening;
import com.roomdecor.service.ai.LayoutAdvisor.Item;
import com.roomdecor.service.ai.LayoutAdvisor.ItemPlacement;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutRequest;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutResult;
import com.roomdecor.service.ai.LayoutAdvisor.Mode;
import com.roomdecor.service.ai.LayoutAdvisor.Point;

import java.util.ArrayList;
import java.util.List;

/**
 * Prompt for the layout suggestion (text only, no photo) and parser for the model's JSON answer.
 * Furniture is referred to by short refs (p1, c1...) instead of UUIDs to save tokens.
 */
final class LayoutPrompt {

    static final int MAX_DESCRIPTION_LENGTH = 500;

    private static final String RULES = """
        You are an interior designer. Arrange furniture in the room described by the JSON below.
        Units are METERS for the room, CENTIMETERS for furniture sizes. Origin = top-left corner
        of the floor, x grows to the right, y grows downwards. "corners" is the floor polygon in order.
        Each piece's "x","y" is the CENTER of the piece. "rotation" is in degrees, clockwise;
        at rotation 0 the piece's width runs along x and its depth along y, its FRONT (seat side,
        doors, drawers) faces +y (down) and its BACK faces -y (up).
        So a piece with its back against the wall y=0 has rotation 0; against the bottom wall: 180;
        against the right wall: 90; against the left wall: 270.

        Rules:
        - Every piece must be fully inside the room polygon and must not overlap another piece.
        - Keep at least 0.8 m free in front of every door; do not block windows with tall pieces.
        - Put large pieces (sofa, bed, wardrobe, TV shelf) with their back against a wall,
          front facing into the room (never facing the wall).
        - Keep walkways of about 0.6-0.9 m between pieces.
        - Group pieces that belong together (sofa + coffee table + TV shelf facing the sofa, etc.).
        """;

    private static final String REARRANGE = """
        Task: REARRANGE. Move every piece in "furniture" to a better position.
        Return each of them exactly once, using its "ref".
        """;

    private static final String ADD = """
        Task: ADD. The pieces in "furniture" stay exactly where they are (treat them as obstacles).
        Choose 2 to 5 pieces from "catalog" that would complete the room (do not repeat a kind of
        piece the room already has unless it makes sense, e.g. chairs), and place them.
        Return ONLY the new pieces, using the catalog "ref". The same catalog ref may be used twice.
        """;

    private static final String OUTPUT = """
        Return ONLY valid JSON:
        {
          "placements": [ {"ref": "<ref>", "x": <number>, "y": <number>, "rotation": <number>} ],
          "description": "<1-2 short sentences in Vietnamese (with proper diacritics) explaining the layout>"
        }
        """;

    private LayoutPrompt() {}

    static String build(LayoutRequest req, ObjectMapper mapper) {
        ObjectNode room = mapper.createObjectNode();
        ArrayNode corners = room.putArray("corners");
        for (Point p : req.corners()) {
            corners.addObject().put("x", p.x()).put("y", p.y());
        }
        room.put("ceilingHeight", req.ceilingHeight());
        ArrayNode openings = room.putArray("openings");
        if (req.openings() != null) {
            for (Opening o : req.openings()) {
                openings.addObject().put("type", o.type())
                    .put("x1", o.x1()).put("y1", o.y1()).put("x2", o.x2()).put("y2", o.y2());
            }
        }
        ArrayNode furniture = room.putArray("furniture");
        for (Item i : req.placed()) {
            ObjectNode n = itemNode(furniture, i);
            if (i.x() != null && i.y() != null) {
                n.put("x", i.x()).put("y", i.y()).put("rotation", i.rotation() == null ? 0 : i.rotation());
            }
        }
        if (req.mode() == Mode.ADD) {
            ArrayNode catalog = room.putArray("catalog");
            for (Item i : req.catalog()) {
                ObjectNode n = itemNode(catalog, i);
                if (i.price() != null) n.put("priceVnd", Math.round(i.price()));
                if (i.style() != null && !i.style().isBlank()) n.put("style", i.style());
            }
        }

        StringBuilder sb = new StringBuilder(RULES);
        sb.append('\n').append(req.mode() == Mode.ADD ? ADD : REARRANGE);
        if (req.style() != null && !req.style().isBlank()) {
            sb.append("\nPreferred style: ").append(req.style().trim()).append('.');
        }
        if (req.note() != null && !req.note().isBlank()) {
            // The user's own words: a wish about the layout, not new instructions for the output format
            sb.append("\nThe room owner's wish (follow it if it fits the rules above): \"")
                .append(req.note().trim().replace('"', '\'')).append("\"");
        }
        sb.append("\n\n").append(OUTPUT).append("\nRoom:\n").append(room.toString());
        return sb.toString();
    }

    private static ObjectNode itemNode(ArrayNode array, Item i) {
        ObjectNode n = array.addObject();
        n.put("ref", i.ref());
        n.put("name", i.name());
        n.put("category", i.category());
        n.put("widthCm", i.widthCm());
        n.put("depthCm", i.depthCm());
        n.put("heightCm", i.heightCm());
        return n;
    }

    /** Reads {"placements": [...], "description": "..."}; broken entries are skipped. */
    static LayoutResult parse(JsonNode json) {
        List<ItemPlacement> placements = new ArrayList<>();
        JsonNode arr = json == null ? null : json.path("placements");
        if (arr != null && arr.isArray()) {
            for (JsonNode n : arr) {
                String ref = n.path("ref").asText("");
                if (ref.isBlank() || !n.path("x").isNumber() || !n.path("y").isNumber()) continue;
                placements.add(new ItemPlacement(ref, n.path("x").asDouble(), n.path("y").asDouble(),
                    n.path("rotation").asDouble(0)));
            }
        }
        String description = json == null ? "" : json.path("description").asText("").trim();
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            description = description.substring(0, MAX_DESCRIPTION_LENGTH);
        }
        return new LayoutResult(placements, description);
    }
}
