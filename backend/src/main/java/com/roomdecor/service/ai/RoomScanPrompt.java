package com.roomdecor.service.ai;

import java.util.Locale;

/**
 * Shared prompt for vision providers so OpenAI and Gemini return the same JSON shape.
 */
final class RoomScanPrompt {

    static final String TEXT = """
        You are a room-scanning assistant. You receive one or more photos of the SAME room.
        Photo 1 is the main view. Any other photos were taken from other corners or directions
        of the room, in the order the user walked around it. Combine everything you can see in
        all photos to reconstruct ONE top-down 2D floor plan in METERS.
        The origin is the top-left corner, x = horizontal (width), y = vertical (depth).

        Return ONLY valid JSON with this exact shape:
        {
          "corners": [ {"x": <number>, "y": <number>} ],
          "ceilingHeightMeters": <number>,
          "openings": [ {"type": "door" | "window", "x1": <num>, "y1": <num>, "x2": <num>, "y2": <num>} ],
          "description": "<short description of the room shape, style and detected features>"
        }

        Work step by step before answering (do not write these steps in the answer):
        1. In each photo, find where the walls meet the floor and where walls meet each other.
           Count the corners and note which walls appear in more than one photo.
        2. Decide the shape: most rooms are rectangles or L-shapes with right angles. Only use
           a non-90-degree angle when a wall is clearly slanted in the photos.
        3. Estimate each wall's length from objects of known size, in this order of trust:
           a door (0.8-0.9 m wide, about 2.05 m tall), floor tiles (usually 60x60 cm or 80x80 cm,
           count them along the wall), a bed (1.6-1.8 m wide, about 2 m long), a sofa (seat height
           about 0.45 m), a kitchen counter (about 0.9 m high), a ceiling (2.6-3.0 m).
        4. Check that opposite walls add up to the same total length and that the plan closes.

        Rules:
        - "corners" are the corners of the floor, listed in order around the room (clockwise),
          without repeating the first corner at the end. Each pair of consecutive corners
          (and the last corner back to the first) is one straight wall.
        - Do NOT assume the room is a rectangle. Represent L-shapes, angled walls, cut corners
          and alcoves with extra corners. Approximate a curved wall with several short walls.
        - "openings" are doors and windows. Each one lies ON a wall: (x1,y1) and (x2,y2) are its
          two ends along that wall. Return an empty array if none are visible.
        - Make walls exactly horizontal or vertical (and corners exactly 90 degrees) unless the
          photos clearly show otherwise.
        - If part of the room is not visible in any photo, make the most plausible guess that is
          consistent with the visible walls.
        - Description: 1-2 short sentences in Vietnamese (with proper diacritics), written for the
          room owner, e.g. "Phòng khách hình chữ L, có cửa sổ lớn và một lối đi nhỏ dẫn ra cửa."
        """;

    private RoomScanPrompt() {}

    /** Prompt text plus the user's hints and the number of photos. */
    static String build(int photoCount, RoomVisionClient.ScanHints hints) {
        StringBuilder sb = new StringBuilder(TEXT);
        sb.append("\nNumber of photos: ").append(photoCount).append('.');
        if (hints != null && hints.roomLengthMeters() != null) {
            sb.append(String.format(Locale.ROOT,
                "\nThe user measured the room: its LONGER side is %.2f m.", hints.roomLengthMeters()));
        }
        if (hints != null && hints.roomWidthMeters() != null) {
            sb.append(String.format(Locale.ROOT,
                "\nThe user measured the room: its SHORTER side is %.2f m.", hints.roomWidthMeters()));
        }
        if (hints != null && hints.ceilingHeightMeters() != null) {
            sb.append(String.format(Locale.ROOT,
                "\nThe user measured the ceiling height: %.2f m. Use it as a scale reference.",
                hints.ceilingHeightMeters()));
        }
        if (hints != null && hints.referenceLengthMeters() != null) {
            sb.append(String.format(Locale.ROOT,
                "\nThe user measured the wall directly facing the camera in photo 1: it is %.2f m long."
                    + " Scale the whole floor plan so that this wall has exactly that length.",
                hints.referenceLengthMeters()));
        }
        return sb.toString();
    }
}
