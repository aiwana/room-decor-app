package com.roomdecor.service;

import com.roomdecor.entity.Opening;
import com.roomdecor.service.ai.LayoutAdvisor.Item;
import com.roomdecor.service.ai.LayoutAdvisor.ItemPlacement;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutRequest;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutResult;
import com.roomdecor.service.ai.LayoutAdvisor.Mode;
import com.roomdecor.service.ai.LayoutAdvisor.Point;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class RuleBasedLayoutAdvisorTest {

    private static final List<Point> ROOM = List.of(new Point(0, 0), new Point(4, 0), new Point(4, 3.5), new Point(0, 3.5));
    private static final Opening DOOR = new Opening(Opening.DOOR, 1.5, 3.5, 2.3, 3.5);

    private final RuleBasedLayoutAdvisor advisor = new RuleBasedLayoutAdvisor();

    @Test
    void piecesFitInsideDoNotOverlapAndKeepTheDoorFree() {
        List<Item> items = List.of(
            item("p1", "sofa", 210, 90), item("p2", "table", 110, 60),
            item("p3", "storage", 180, 40), item("p4", "chair", 80, 85));
        LayoutRequest req = new LayoutRequest(Mode.REARRANGE, ROOM, List.of(DOOR), 2.7, items, List.of(), null, null);

        LayoutResult result = advisor.suggest(req);

        assertThat(result.placements()).hasSize(4);
        assertThat(result.description()).isNotBlank();
        Map<String, Item> byRef = items.stream().collect(Collectors.toMap(Item::ref, Function.identity()));
        List<double[]> boxes = new ArrayList<>();
        List<double[]> doors = LayoutGeometry.doorZones(List.of(DOOR), ROOM);
        for (ItemPlacement p : result.placements()) {
            Item it = byRef.get(p.ref());
            assertThat(LayoutGeometry.fitsInRoom(LayoutGeometry.footprint(p.x(), p.y(), it.widthCm(), it.depthCm(), p.rotation()), ROOM)).isTrue();
            double[] box = LayoutGeometry.box(p.x(), p.y(), it.widthCm(), it.depthCm(), p.rotation());
            assertThat(LayoutGeometry.blocksDoor(box, doors)).isFalse();
            assertThat(boxes).noneMatch(o -> LayoutGeometry.overlaps(box, o, 0));
            boxes.add(box);
        }
    }

    @Test
    void addPicksCategoriesTheRoomDoesNotHaveYet() {
        Item sofa = new Item("p1", "Sofa", "sofa", 210, 90, 85, null, null, 2.0, 0.6, 0.0);
        List<Item> catalog = List.of(item("c1", "sofa", 200, 90), item("c2", "lighting", 40, 40), item("c3", "decor", 45, 45));
        LayoutRequest req = new LayoutRequest(Mode.ADD, ROOM, List.of(DOOR), 2.7, List.of(sofa), catalog, null, null);

        LayoutResult result = advisor.suggest(req);

        assertThat(result.placements()).extracting(ItemPlacement::ref).containsExactlyInAnyOrder("c2", "c3");
    }

    private static Item item(String ref, String category, double w, double d) {
        return new Item(ref, ref, category, w, d, 80, null, null, null, null, null);
    }
}
