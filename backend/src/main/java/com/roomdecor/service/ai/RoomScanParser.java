package com.roomdecor.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;

import java.util.ArrayList;
import java.util.List;

/**
 * Turns the JSON returned by a vision provider (see {@link RoomScanPrompt}) into a
 * {@link RoomVisionClient.RoomAnalysisResult}. Values are taken as-is; cleaning up
 * (moving to the origin, sanity checks) happens later in FloorPlanGeometry.
 */
final class RoomScanParser {

    private RoomScanParser() {}

    static RoomVisionClient.RoomAnalysisResult parse(JsonNode json, String defaultDescription) {
        List<WallSegment> walls = wallsFromCorners(json.path("corners"));
        if (walls.isEmpty()) {
            // Older prompt format: explicit wall segments
            for (JsonNode w : json.path("walls")) {
                walls.add(new WallSegment(
                    w.path("x1").asDouble(), w.path("y1").asDouble(),
                    w.path("x2").asDouble(), w.path("y2").asDouble()
                ));
            }
        }

        List<Opening> openings = new ArrayList<>();
        for (JsonNode o : json.path("openings")) {
            openings.add(new Opening(
                o.path("type").asText(""),
                o.path("x1").asDouble(), o.path("y1").asDouble(),
                o.path("x2").asDouble(), o.path("y2").asDouble()
            ));
        }

        return new RoomVisionClient.RoomAnalysisResult(
            json.path("roomWidthMeters").asDouble(0),
            json.path("roomDepthMeters").asDouble(0),
            json.path("ceilingHeightMeters").asDouble(0),
            walls,
            openings,
            json.path("description").asText(defaultDescription)
        );
    }

    /** Closed polygon -> one wall per pair of consecutive corners. Needs at least 3 corners. */
    static List<WallSegment> wallsFromCorners(JsonNode corners) {
        List<WallSegment> walls = new ArrayList<>();
        if (!corners.isArray() || corners.size() < 3) {
            return walls;
        }
        int n = corners.size();
        for (int i = 0; i < n; i++) {
            JsonNode a = corners.get(i);
            JsonNode b = corners.get((i + 1) % n);
            walls.add(new WallSegment(
                a.path("x").asDouble(), a.path("y").asDouble(),
                b.path("x").asDouble(), b.path("y").asDouble()
            ));
        }
        return walls;
    }
}
