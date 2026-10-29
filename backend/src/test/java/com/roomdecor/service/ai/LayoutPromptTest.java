package com.roomdecor.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomdecor.entity.Opening;
import com.roomdecor.service.ai.LayoutAdvisor.Item;
import com.roomdecor.service.ai.LayoutAdvisor.ItemPlacement;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutRequest;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutResult;
import com.roomdecor.service.ai.LayoutAdvisor.Mode;
import com.roomdecor.service.ai.LayoutAdvisor.Point;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LayoutPromptTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void promptContainsRoomFurnitureCatalogAndWish() {
        LayoutRequest req = new LayoutRequest(Mode.ADD,
            List.of(new Point(0, 0), new Point(4, 0), new Point(4, 3), new Point(0, 3)),
            List.of(new Opening(Opening.DOOR, 1, 3, 1.8, 3)), 2.7,
            List.of(new Item("p1", "Sofa", "sofa", 210, 90, 85, null, null, 2.0, 0.6, 0.0)),
            List.of(new Item("c1", "Đèn cây", "lighting", 40, 40, 160, 1_450_000.0, "hiện đại", null, null, null)),
            "hiện đại", "chừa \"lối đi\" rộng");

        String prompt = LayoutPrompt.build(req, mapper);

        assertThat(prompt).contains("Task: ADD", "\"ref\":\"p1\"", "\"ref\":\"c1\"", "\"priceVnd\":1450000",
            "Preferred style: hiện đại", "chừa 'lối đi' rộng", "Vietnamese");
    }

    @Test
    void parseSkipsBrokenEntriesAndCutsLongDescriptions() throws Exception {
        String json = """
            {"placements": [
               {"ref": "p1", "x": 1.5, "y": 0.6, "rotation": 90},
               {"ref": "p2", "x": "left", "y": 1},
               {"x": 1, "y": 1},
               {"ref": "c3", "x": 2, "y": 2}
             ],
             "description": "%s"}
            """.formatted("a".repeat(800));

        LayoutResult result = LayoutPrompt.parse(mapper.readTree(json));

        assertThat(result.placements()).containsExactly(
            new ItemPlacement("p1", 1.5, 0.6, 90), new ItemPlacement("c3", 2, 2, 0));
        assertThat(result.description()).hasSize(LayoutPrompt.MAX_DESCRIPTION_LENGTH);
    }
}
