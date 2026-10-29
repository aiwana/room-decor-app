package com.roomdecor.service;

import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.service.ai.RoomVisionClient.RoomAnalysisResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Cleans up what an AI provider returns before it is saved as a floor plan:
 * drops broken values, moves the plan so its top-left corner is (0,0),
 * computes width/depth from the walls and falls back to a 4m x 4m room when
 * the result is unusable. Pure functions, no Spring, easy to unit test.
 */
public final class FloorPlanGeometry {

    static final double MIN_ROOM_SIZE = 0.5;
    static final double MAX_ROOM_SIZE = 50.0;
    static final double DEFAULT_ROOM_SIZE = 4.0;
    static final double MIN_CEILING = 1.8;
    static final double MAX_CEILING = 6.0;
    static final double DEFAULT_CEILING = 2.7;
    static final double MIN_WALL_LENGTH = 0.05;
    static final double MIN_OPENING_LENGTH = 0.2;
    static final double MAX_OPENING_LENGTH = 10.0;
    static final int MAX_WALLS = 64;
    static final int MAX_OPENINGS = 30;
    static final int MAX_DESCRIPTION_LENGTH = 1000;

    private static final Set<String> OPENING_TYPES = Set.of(Opening.DOOR, Opening.WINDOW);

    private FloorPlanGeometry() {}

    public static RoomAnalysisResult normalize(RoomAnalysisResult raw) {
        List<WallSegment> walls = new ArrayList<>();
        if (raw.walls() != null) {
            for (WallSegment w : raw.walls()) {
                if (walls.size() >= MAX_WALLS) break;
                if (isFinite(w.x1(), w.y1(), w.x2(), w.y2())
                    && length(w.x1(), w.y1(), w.x2(), w.y2()) >= MIN_WALL_LENGTH) {
                    walls.add(w);
                }
            }
        }

        double ceiling = inRange(raw.ceilingHeightMeters(), MIN_CEILING, MAX_CEILING)
            ? raw.ceilingHeightMeters() : DEFAULT_CEILING;
        String description = cleanDescription(raw.description());

        if (walls.size() < 3) {
            // No usable polygon: use the AI's width/depth if they make sense, else a default room
            double w = validSize(raw.roomWidthMeters()) ? raw.roomWidthMeters() : DEFAULT_ROOM_SIZE;
            double d = validSize(raw.roomDepthMeters()) ? raw.roomDepthMeters() : DEFAULT_ROOM_SIZE;
            return rectangle(w, d, round(ceiling), List.of(), description);
        }

        double minX = Double.MAX_VALUE, minY = Double.MAX_VALUE;
        double maxX = -Double.MAX_VALUE, maxY = -Double.MAX_VALUE;
        for (WallSegment w : walls) {
            minX = Math.min(minX, Math.min(w.x1(), w.x2()));
            minY = Math.min(minY, Math.min(w.y1(), w.y2()));
            maxX = Math.max(maxX, Math.max(w.x1(), w.x2()));
            maxY = Math.max(maxY, Math.max(w.y1(), w.y2()));
        }
        double width = maxX - minX;
        double depth = maxY - minY;
        if (!validSize(width) || !validSize(depth)) {
            return rectangle(DEFAULT_ROOM_SIZE, DEFAULT_ROOM_SIZE, round(ceiling), List.of(), description);
        }

        List<WallSegment> shifted = new ArrayList<>();
        for (WallSegment w : walls) {
            shifted.add(new WallSegment(
                round(w.x1() - minX), round(w.y1() - minY),
                round(w.x2() - minX), round(w.y2() - minY)
            ));
        }

        List<Opening> openings = new ArrayList<>();
        if (raw.openings() != null) {
            for (Opening o : raw.openings()) {
                if (openings.size() >= MAX_OPENINGS) break;
                String type = o.type() == null ? "" : o.type().trim().toLowerCase(Locale.ROOT);
                if (!OPENING_TYPES.contains(type) || !isFinite(o.x1(), o.y1(), o.x2(), o.y2())) continue;
                double len = length(o.x1(), o.y1(), o.x2(), o.y2());
                if (len < MIN_OPENING_LENGTH || len > MAX_OPENING_LENGTH) continue;
                openings.add(new Opening(type,
                    round(o.x1() - minX), round(o.y1() - minY),
                    round(o.x2() - minX), round(o.y2() - minY)));
            }
        }

        return new RoomAnalysisResult(round(width), round(depth), round(ceiling), shifted, openings, description);
    }

    /** Four walls of a width x depth rectangle, clockwise from the top-left corner. */
    public static List<WallSegment> rectangleWalls(double w, double d) {
        return List.of(
            new WallSegment(0, 0, w, 0),
            new WallSegment(w, 0, w, d),
            new WallSegment(w, d, 0, d),
            new WallSegment(0, d, 0, 0)
        );
    }

    private static RoomAnalysisResult rectangle(double w, double d, double ceiling,
                                                List<Opening> openings, String description) {
        double rw = round(w);
        double rd = round(d);
        return new RoomAnalysisResult(rw, rd, ceiling, rectangleWalls(rw, rd), openings, description);
    }

    private static String cleanDescription(String description) {
        if (description == null) return "";
        String trimmed = description.trim();
        return trimmed.length() > MAX_DESCRIPTION_LENGTH ? trimmed.substring(0, MAX_DESCRIPTION_LENGTH) : trimmed;
    }

    private static boolean validSize(double v) {
        return inRange(v, MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    }

    private static boolean inRange(double v, double min, double max) {
        return Double.isFinite(v) && v >= min && v <= max;
    }

    private static boolean isFinite(double... values) {
        for (double v : values) {
            if (!Double.isFinite(v)) return false;
        }
        return true;
    }

    private static double length(double x1, double y1, double x2, double y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    }

    /** Round to centimeters. */
    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
