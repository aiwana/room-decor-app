package com.roomdecor.service;

import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.service.ai.LayoutAdvisor.Item;
import com.roomdecor.service.ai.LayoutAdvisor.ItemPlacement;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutRequest;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutResult;
import com.roomdecor.service.ai.LayoutAdvisor.Mode;
import com.roomdecor.service.ai.LayoutAdvisor.Point;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LayoutGeometryTest {

    /** Khanh's living room: 3.6 x 3.7 plus a 1.15 x 1.4 passage (L shape) */
    private static final List<Point> L_ROOM = List.of(
        new Point(0, 0), new Point(3.6, 0), new Point(3.6, 3.7),
        new Point(1.15, 3.7), new Point(1.15, 5.1), new Point(0, 5.1));

    @Test
    void polygonFollowsChainedWallsAndFallsBackToRectangle() {
        List<WallSegment> walls = List.of(
            new WallSegment(0, 0, 3.6, 0), new WallSegment(3.6, 0, 3.6, 3.7), new WallSegment(3.6, 3.7, 1.15, 3.7),
            new WallSegment(1.15, 3.7, 1.15, 5.1), new WallSegment(1.15, 5.1, 0, 5.1), new WallSegment(0, 5.1, 0, 0));
        assertThat(LayoutGeometry.polygon(walls, 3.6, 5.1)).containsExactlyElementsOf(L_ROOM);

        List<WallSegment> broken = List.of(new WallSegment(0, 0, 1, 0), new WallSegment(5, 5, 6, 6), new WallSegment(2, 2, 3, 3));
        assertThat(LayoutGeometry.polygon(broken, 4, 3))
            .containsExactly(new Point(0, 0), new Point(4, 0), new Point(4, 3), new Point(0, 3));
    }

    @Test
    void pushInsideMovesAPointOutOfTheMissingCornerOfTheL() {
        Point outside = new Point(3.0, 4.5); // in the cut-out corner, not in the room
        assertThat(LayoutGeometry.inside(outside, L_ROOM)).isFalse();

        Point p = LayoutGeometry.pushInside(outside, L_ROOM, 0.3);

        assertThat(LayoutGeometry.inside(p, L_ROOM)).isTrue();
        assertThat(LayoutGeometry.distanceToWalls(p, L_ROOM)).isGreaterThanOrEqualTo(0.3 - 1e-6);
    }

    @Test
    void cleanDropsUnknownRefsKeepsMissingPiecesAndClearsTheDoor() {
        Opening door = new Opening(Opening.DOOR, 0.2, 5.1, 0.95, 5.1); // end of the passage
        Item sofa = new Item("p1", "Sofa", "sofa", 200, 90, 85, null, null, 1.8, 1.0, 0.0);
        Item chair = new Item("p2", "Ghế", "chair", 50, 50, 80, null, null, 0.6, 0.6, 0.0);
        LayoutRequest req = new LayoutRequest(Mode.REARRANGE, L_ROOM, List.of(door), 2.7,
            List.of(sofa, chair), List.of(), null, null);
        LayoutResult raw = new LayoutResult(List.of(
            new ItemPlacement("p1", 0.6, 4.8, 0),    // right in front of the door
            new ItemPlacement("zzz", 1, 1, 0),        // unknown -> dropped
            new ItemPlacement("p1", 3, 3, 0)          // same piece twice -> second ignored
        ), "ok");

        List<ItemPlacement> out = LayoutGeometry.clean(raw, req);

        assertThat(out).extracting(ItemPlacement::ref).containsExactly("p1", "p2");
        ItemPlacement movedSofa = out.get(0);
        double[] box = LayoutGeometry.box(movedSofa.x(), movedSofa.y(), 200, 90, movedSofa.rotation());
        assertThat(LayoutGeometry.blocksDoor(box, LayoutGeometry.doorZones(List.of(door), L_ROOM))).isFalse();
        assertThat(LayoutGeometry.inside(new Point(movedSofa.x(), movedSofa.y()), L_ROOM)).isTrue();
        // chair was not in the answer: stays where it was
        assertThat(out.get(1)).isEqualTo(new ItemPlacement("p2", 0.6, 0.6, 0.0));
    }

    @Test
    void piecesAgainstAWallAreTurnedToFaceTheRoom() {
        Item sofa = new Item("p1", "Sofa", "sofa", 200, 90, 85, null, null, null, null, null);
        Item table = new Item("p2", "Bàn", "table", 100, 60, 45, null, null, null, null, null);

        // Back against the top wall (y=0): rotation 0 is right, 180 looks at the wall
        assertThat(LayoutGeometry.faceIntoRoom(1.8, 0.5, sofa, 180, L_ROOM)).isEqualTo(0);
        assertThat(LayoutGeometry.faceIntoRoom(1.8, 0.5, sofa, 0, L_ROOM)).isEqualTo(0);
        // Bottom wall of the main part (y=3.7) -> 180; right wall (x=3.6) -> 90; left wall (x=0) -> 270
        assertThat(LayoutGeometry.faceIntoRoom(2.4, 3.2, sofa, 0, L_ROOM)).isEqualTo(180);
        assertThat(LayoutGeometry.faceIntoRoom(3.1, 1.8, sofa, 270, L_ROOM)).isEqualTo(90);
        assertThat(LayoutGeometry.faceIntoRoom(0.5, 1.8, sofa, 90, L_ROOM)).isEqualTo(270);
        // Sideways to the wall, far from walls, or a table: left alone
        assertThat(LayoutGeometry.faceIntoRoom(1.8, 0.5, sofa, 90, L_ROOM)).isEqualTo(90);
        assertThat(LayoutGeometry.faceIntoRoom(1.8, 1.8, sofa, 180, L_ROOM)).isEqualTo(180);
        assertThat(LayoutGeometry.faceIntoRoom(1.8, 0.4, table, 180, L_ROOM)).isEqualTo(180);
    }

    @Test
    void addModeKeepsPlacedPiecesAndLimitsNewOnes() {
        Item sofa = new Item("p1", "Sofa", "sofa", 200, 90, 85, null, null, 1.8, 0.6, 0.0);
        Item lamp = new Item("c1", "Đèn", "lighting", 40, 40, 160, 1_000_000.0, null, null, null, null);
        LayoutRequest req = new LayoutRequest(Mode.ADD, L_ROOM, List.of(), 2.7, List.of(sofa), List.of(lamp), null, null);
        List<ItemPlacement> many = java.util.stream.IntStream.range(0, 10)
            .mapToObj(i -> new ItemPlacement("c1", 3.2, 3.2, 370)).toList();

        List<ItemPlacement> out = LayoutGeometry.clean(new LayoutResult(many, ""), req);

        assertThat(out.get(0)).isEqualTo(new ItemPlacement("p1", 1.8, 0.6, 0.0));
        assertThat(out).hasSize(1 + LayoutGeometry.MAX_NEW_ITEMS);
        assertThat(out.get(1).rotation()).isEqualTo(10.0);
    }
}
