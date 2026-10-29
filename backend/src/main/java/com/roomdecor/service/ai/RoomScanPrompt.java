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

        Rules:
        - "corners" are the corners of the floor, listed in order around the room (clockwise),
          without repeating the first corner at the end. Each pair of consecutive corners
          (and the last corner back to the first) is one straight wall.
        - Do NOT assume the room is a rectangle. Represent L-shapes, angled walls, cut corners
          and alcoves with extra corners. Approximate a curved wall with several short walls.
        - "openings" are doors and windows. Each one lies ON a wall: (x1,y1) and (x2,y2) are its
          two ends along that wall. Return an empty array if none are visible.
        - Estimate scale from familiar objects: a door is about 0.8-0.9 m wide and 2.0-2.1 m tall,
          a ceiling is usually 2.6-3.0 m high.
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
        if (hints != null && hints.referenceLengthMeters() != null) {
            sb.append(String.format(Locale.ROOT,
                "\nThe user measured the wall directly facing the camera in photo 1: it is %.2f m long."
                    + " Scale the whole floor plan so that this wall has exactly that length.",
                hints.referenceLengthMeters()));
        }
        return sb.toString();
    }
}
