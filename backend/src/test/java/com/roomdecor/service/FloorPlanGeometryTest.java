package com.roomdecor.service;

import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.service.ai.RoomVisionClient.RoomAnalysisResult;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FloorPlanGeometryTest {

    @Test
    void lShapedRoomIsMovedToOriginAndSizedByItsBoundingBox() {
        // L-shape whose top-left corner is at (1, 2) instead of (0, 0)
        List<WallSegment> walls = polygon(
            1, 2, 6, 2, 6, 4, 4, 4, 4, 7, 1, 7
        );
        RoomAnalysisResult raw = new RoomAnalysisResult(0, 0, 2.8, walls,
            List.of(new Opening("Door", 2, 7, 2.9, 7)), "L-shaped room");

        RoomAnalysisResult result = FloorPlanGeometry.normalize(raw);

        assertThat(result.roomWidthMeters()).isEqualTo(5.0);
        assertThat(result.roomDepthMeters()).isEqualTo(5.0);
        assertThat(result.ceilingHeightMeters()).isEqualTo(2.8);
        assertThat(result.walls()).hasSize(6);
        assertThat(result.walls().get(0)).isEqualTo(new WallSegment(0, 0, 5, 0));
        assertThat(result.walls().get(5)).isEqualTo(new WallSegment(0, 5, 0, 0));
        // Opening type is lower-cased and moved together with the walls
        assertThat(result.openings()).containsExactly(new Opening("door", 1, 5, 1.9, 5));
        assertThat(result.description()).isEqualTo("L-shaped room");
    }

    @Test
    void invalidOpeningsAreDropped() {
        RoomAnalysisResult raw = new RoomAnalysisResult(0, 0, 2.7, polygon(0, 0, 4, 0, 4, 3, 0, 3),
            List.of(
                new Opening("window", 1, 0, 2.2, 0),
                new Opening("stairs", 0, 1, 0, 2),          // unknown type
                new Opening("door", 0, 1, 0, 1.05),          // too short
                new Opening("door", Double.NaN, 0, 1, 0)     // broken number
            ),
            "room");

        RoomAnalysisResult result = FloorPlanGeometry.normalize(raw);

        assertThat(result.openings()).containsExactly(new Opening("window", 1, 0, 2.2, 0));
    }

    @Test
    void tooFewWallsFallsBackToRectangleFromWidthAndDepth() {
        RoomAnalysisResult raw = new RoomAnalysisResult(3.5, 4.2, 2.6,
            List.of(new WallSegment(0, 0, 3.5, 0)), List.of(), "only one wall");

        RoomAnalysisResult result = FloorPlanGeometry.normalize(raw);

        assertThat(result.roomWidthMeters()).isEqualTo(3.5);
        assertThat(result.roomDepthMeters()).isEqualTo(4.2);
        assertThat(result.walls()).isEqualTo(FloorPlanGeometry.rectangleWalls(3.5, 4.2));
    }

    @Test
    void absurdSizesAndCeilingFallBackToDefaults() {
        RoomAnalysisResult raw = new RoomAnalysisResult(0, 0, 25,
            polygon(0, 0, 500, 0, 500, 400, 0, 400), List.of(), null);

        RoomAnalysisResult result = FloorPlanGeometry.normalize(raw);

        assertThat(result.roomWidthMeters()).isEqualTo(4.0);
        assertThat(result.roomDepthMeters()).isEqualTo(4.0);
        assertThat(result.ceilingHeightMeters()).isEqualTo(2.7);
        assertThat(result.walls()).hasSize(4);
        assertThat(result.description()).isEmpty();
    }

    @Test
    void zeroLengthAndBrokenWallsAreIgnored() {
        List<WallSegment> walls = new java.util.ArrayList<>(polygon(0, 0, 4, 0, 4, 3, 0, 3));
        walls.add(new WallSegment(2, 2, 2, 2));
        walls.add(new WallSegment(Double.POSITIVE_INFINITY, 0, 1, 1));
        RoomAnalysisResult raw = new RoomAnalysisResult(0, 0, 2.7, walls, List.of(), "room");

        RoomAnalysisResult result = FloorPlanGeometry.normalize(raw);

        assertThat(result.walls()).hasSize(4);
        assertThat(result.roomWidthMeters()).isEqualTo(4.0);
        assertThat(result.roomDepthMeters()).isEqualTo(3.0);
    }

    /** Closed polygon from x,y pairs. */
    private static List<WallSegment> polygon(double... xy) {
        int n = xy.length / 2;
        java.util.List<WallSegment> walls = new java.util.ArrayList<>();
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            walls.add(new WallSegment(xy[2 * i], xy[2 * i + 1], xy[2 * j], xy[2 * j + 1]));
        }
        return walls;
    }
}
