package com.roomdecor.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoomScanParserTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void cornersBecomeClosedWallsAndOpeningsAreRead() throws Exception {
        String json = """
            {
              "corners": [ {"x": 0, "y": 0}, {"x": 5, "y": 0}, {"x": 5, "y": 3}, {"x": 0, "y": 3} ],
              "ceilingHeightMeters": 2.75,
              "openings": [ {"type": "window", "x1": 1, "y1": 0, "x2": 2.5, "y2": 0} ],
              "description": "Bright bedroom"
            }
            """;

        RoomVisionClient.RoomAnalysisResult result = RoomScanParser.parse(mapper.readTree(json), "default");

        assertThat(result.walls()).containsExactly(
            new WallSegment(0, 0, 5, 0),
            new WallSegment(5, 0, 5, 3),
            new WallSegment(5, 3, 0, 3),
            new WallSegment(0, 3, 0, 0)
        );
        assertThat(result.openings()).containsExactly(new Opening("window", 1, 0, 2.5, 0));
        assertThat(result.ceilingHeightMeters()).isEqualTo(2.75);
        assertThat(result.description()).isEqualTo("Bright bedroom");
    }

    @Test
    void oldWallsFormatIsStillAccepted() throws Exception {
        String json = """
            {
              "roomWidthMeters": 4, "roomDepthMeters": 3, "ceilingHeightMeters": 2.7,
              "walls": [ {"x1": 0, "y1": 0, "x2": 4, "y2": 0} ]
            }
            """;

        RoomVisionClient.RoomAnalysisResult result = RoomScanParser.parse(mapper.readTree(json), "default");

        assertThat(result.walls()).containsExactly(new WallSegment(0, 0, 4, 0));
        assertThat(result.openings()).isEmpty();
        assertThat(result.roomWidthMeters()).isEqualTo(4);
        assertThat(result.description()).isEqualTo("default");
    }

    @Test
    void lessThanThreeCornersGiveNoWalls() throws Exception {
        String json = """
            { "corners": [ {"x": 0, "y": 0}, {"x": 5, "y": 0} ] }
            """;

        RoomVisionClient.RoomAnalysisResult result = RoomScanParser.parse(mapper.readTree(json), "default");

        assertThat(result.walls()).isEmpty();
    }

    @Test
    void promptMentionsPhotoCountAndReferenceLength() {
        String prompt = RoomScanPrompt.build(4, new RoomVisionClient.ScanHints(3.2));

        assertThat(prompt).contains("Number of photos: 4.").contains("3.20 m long");
        assertThat(RoomScanPrompt.build(1, RoomVisionClient.ScanHints.NONE)).doesNotContain("measured");
    }
}
