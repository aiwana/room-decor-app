package com.roomdecor.service.ai;

/**
 * Shared prompt for vision providers so OpenAI and Gemini return the same JSON shape.
 */
final class RoomScanPrompt {

    static final String TEXT = """
        You are a room-scanning assistant. Analyze this room photo and return a JSON object
        describing a top-down 2D floor plan in METERS. The origin is the top-left corner.

        Return ONLY valid JSON with this exact shape:
        {
          "roomWidthMeters": <number>,
          "roomDepthMeters": <number>,
          "ceilingHeightMeters": <number>,
          "walls": [ {"x1": <num>, "y1": <num>, "x2": <num>, "y2": <num>} ],
          "description": "<short description of the room style and detected features>"
        }

        Rules:
        - Walls are line segments forming the room boundary (typically 4 for a rectangular room).
        - x = horizontal (width), y = vertical (depth), in meters from origin.
        - For a rectangular room: walls connect the 4 corners.
        - Description: 1-2 sentences in English.
        """;

    private RoomScanPrompt() {}
}
