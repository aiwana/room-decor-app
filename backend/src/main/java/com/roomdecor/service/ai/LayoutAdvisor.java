package com.roomdecor.service.ai;

import com.roomdecor.entity.Opening;

import java.util.List;

/**
 * Suggests where to put furniture in a scanned room. Works on the floor plan only (no photo),
 * so a call is cheap. Coordinates are in METERS, origin = top-left corner of the room.
 * Results are not trusted: LayoutGeometry cleans them up afterwards.
 */
public interface LayoutAdvisor {

    LayoutResult suggest(LayoutRequest request);

    /** True when the result comes from a real AI model (false = simple rules). */
    boolean usesAi();

    enum Mode {
        /** Move the furniture already in the room */
        REARRANGE,
        /** Keep the current furniture and add a few pieces from the catalog */
        ADD
    }

    record Point(double x, double y) {}

    /**
     * @param ref       short id used in the prompt (p1, p2... for placed items, c1, c2... for catalog items)
     * @param widthCm   size along the item's own x axis when rotation = 0
     * @param depthCm   size along the item's own y axis when rotation = 0
     * @param x         current center (meters), null for catalog items
     */
    record Item(String ref, String name, String category, double widthCm, double depthCm, double heightCm,
                Double price, String style, Double x, Double y, Double rotation) {}

    record LayoutRequest(Mode mode,
                         List<Point> corners,
                         List<Opening> openings,
                         double ceilingHeight,
                         List<Item> placed,
                         List<Item> catalog,
                         String style,
                         String note) {}

    /** One suggested position: ref of a placed item (REARRANGE) or of a catalog item (ADD). */
    record ItemPlacement(String ref, double x, double y, double rotation) {}

    record LayoutResult(List<ItemPlacement> placements, String description) {}
}
