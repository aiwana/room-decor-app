package com.roomdecor.service;

import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.service.ai.RoomVisionClient.RoomAnalysisResult;
import com.roomdecor.service.ai.RoomVisionClient.ScanHints;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class ScanCorrectionTest {

    /** What the AI typically returns for Khanh's L-shaped living room: slightly crooked, a bit too long */
    private static final double[] CROOKED_L = {
        0, 0, 3.62, 0.08, 3.55, 3.75, 1.2, 3.68, 1.15, 5.4, 0.04, 5.38
    };

    @Test
    void crookedWallsBecomeStraightAndCornersSquare() {
        RoomAnalysisResult out = ScanCorrection.apply(result(CROOKED_L, List.of()), ScanHints.NONE);

        assertThat(out.walls()).hasSize(6);
        for (WallSegment w : out.walls()) {
            boolean horizontal = Math.abs(w.y1() - w.y2()) < 1e-9;
            boolean vertical = Math.abs(w.x1() - w.x2()) < 1e-9;
            assertThat(horizontal || vertical).as("wall %s", w).isTrue();
        }
        // Corners on the 5 cm grid
        for (WallSegment w : out.walls()) {
            assertThat(w.x1() * 20).isCloseTo(Math.round(w.x1() * 20), within(1e-6));
            assertThat(w.y1() * 20).isCloseTo(Math.round(w.y1() * 20), within(1e-6));
        }
    }

    @Test
    void planIsStretchedToTheMeasuredLengthAndWidth() {
        // Khanh measured 5.1 m long and 3.6 m wide; the AI said about 3.6 x 5.4
        ScanHints hints = new ScanHints(null, 5.1, 3.6, 2.7);

        RoomAnalysisResult out = FloorPlanGeometry.normalize(ScanCorrection.apply(result(CROOKED_L, List.of()), hints));

        assertThat(out.roomWidthMeters()).isCloseTo(3.6, within(0.051));
        assertThat(out.roomDepthMeters()).isCloseTo(5.1, within(0.051));
        assertThat(out.ceilingHeightMeters()).isEqualTo(2.7);
    }

    @Test
    void measurementsMatchTheLongerSideWhicheverWayTheRoomLies() {
        double[] wide = {0, 0, 6, 0, 6, 3, 0, 3};
        RoomAnalysisResult out = ScanCorrection.apply(result(wide, List.of()), new ScanHints(null, 5.0, 4.0, null));

        assertThat(out.roomWidthMeters()).isCloseTo(5.0, within(1e-6));
        assertThat(out.roomDepthMeters()).isCloseTo(4.0, within(1e-6));
    }

    @Test
    void oneMeasurementScalesTheWholeRoomEvenly() {
        double[] room = {0, 0, 4, 0, 4, 3, 0, 3};
        RoomAnalysisResult out = ScanCorrection.apply(result(room, List.of()), new ScanHints(null, 5.0, null, null));

        assertThat(out.roomWidthMeters()).isCloseTo(5.0, within(1e-6));
        assertThat(out.roomDepthMeters()).isCloseTo(3.75, within(0.026));
    }

    @Test
    void tinyStepsAndSplitWallsAreRemoved() {
        // Rectangle 4 x 3 with a 10 cm step in the top wall and the bottom wall split in two
        double[] room = {0, 0, 2, 0, 2, 0.1, 4, 0.1, 4, 3, 2, 3, 0, 3};
        RoomAnalysisResult out = ScanCorrection.apply(result(room, List.of()), ScanHints.NONE);

        assertThat(out.walls()).hasSize(4);
    }

    @Test
    void doorsAreMovedOntoTheNearestWallAndMovedWithTheScale() {
        double[] room = {0, 0, 4, 0, 4, 4, 0, 4};
        // Door 30 cm inside the room, parallel to the bottom wall
        Opening door = new Opening(Opening.DOOR, 1, 3.7, 1.8, 3.7);
        RoomAnalysisResult out = ScanCorrection.apply(result(room, List.of(door)), new ScanHints(null, 5.0, 5.0, null));

        assertThat(out.openings()).hasSize(1);
        Opening o = out.openings().get(0);
        assertThat(o.y1()).isCloseTo(5.0, within(1e-6));
        assertThat(o.y2()).isCloseTo(5.0, within(1e-6));
        assertThat(o.x1()).isCloseTo(1.25, within(1e-6));
        assertThat(o.x2()).isCloseTo(2.25, within(1e-6));
    }

    @Test
    void reallyAngledWallsAreKept() {
        // Room with a 45 degree cut corner
        double[] room = {0, 0, 3, 0, 4, 1, 4, 4, 0, 4};
        RoomAnalysisResult out = ScanCorrection.apply(result(room, List.of()), ScanHints.NONE);

        assertThat(out.walls()).hasSize(5);
        assertThat(out.walls().get(1)).isEqualTo(new WallSegment(3, 0, 4, 1));
    }

    @Test
    void wallsThatAreNotAClosedChainAreLeftAlone() {
        List<WallSegment> broken = List.of(new WallSegment(0, 0, 4, 0), new WallSegment(5, 5, 6, 6), new WallSegment(1, 2, 3, 3));
        RoomAnalysisResult in = new RoomAnalysisResult(4, 4, 2.7, broken, List.of(), "x");

        RoomAnalysisResult out = ScanCorrection.apply(in, new ScanHints(null, null, null, 2.9));

        assertThat(out.walls()).isEqualTo(broken);
        assertThat(out.ceilingHeightMeters()).isEqualTo(2.9);
    }

    private static RoomAnalysisResult result(double[] xy, List<Opening> openings) {
        List<WallSegment> walls = new ArrayList<>();
        int n = xy.length / 2;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            walls.add(new WallSegment(xy[2 * i], xy[2 * i + 1], xy[2 * j], xy[2 * j + 1]));
        }
        return new RoomAnalysisResult(0, 0, 2.7, walls, openings, "test");
    }
}
