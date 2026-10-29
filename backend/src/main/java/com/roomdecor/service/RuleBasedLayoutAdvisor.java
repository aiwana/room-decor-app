package com.roomdecor.service;

import com.roomdecor.service.ai.LayoutAdvisor;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Layout without AI (no API key, or the AI is down): big pieces first, back against the longest
 * free wall, never in front of a door, no overlaps. Simple but always sensible.
 */
public class RuleBasedLayoutAdvisor implements LayoutAdvisor {

    /** Gap between furniture and wall / between two pieces (m) */
    private static final double GAP = 0.05;
    private static final double STEP = 0.1;
    /** New pieces picked from the catalog in ADD mode */
    private static final int ADD_COUNT = 3;

    @Override
    public boolean usesAi() {
        return false;
    }

    @Override
    public LayoutResult suggest(LayoutRequest req) {
        List<Point> poly = req.corners();
        List<double[]> doors = LayoutGeometry.doorZones(req.openings(), poly);
        List<double[]> taken = new ArrayList<>();
        List<ItemPlacement> out = new ArrayList<>();

        if (req.mode() == Mode.REARRANGE) {
            List<Item> items = new ArrayList<>(req.placed());
            items.sort(Comparator.comparingDouble((Item i) -> i.widthCm() * i.depthCm()).reversed());
            for (Item item : items) {
                ItemPlacement p = place(item, poly, doors, taken);
                if (p != null) out.add(p);
            }
            return new LayoutResult(out,
                "Xếp tự động: đồ lớn đặt sát tường dài nhất, chừa lối đi trước cửa ra vào.");
        }

        // ADD: current furniture stays, it only blocks space
        for (Item item : req.placed()) {
            if (item.x() == null || item.y() == null) continue;
            double rotation = item.rotation() == null ? 0 : item.rotation();
            taken.add(LayoutGeometry.box(item.x(), item.y(), item.widthCm(), item.depthCm(), rotation));
        }
        Set<String> categories = new HashSet<>();
        req.placed().forEach(i -> categories.add(lower(i.category())));
        for (Item candidate : pickFromCatalog(req.catalog(), categories, req.style())) {
            if (out.size() >= ADD_COUNT) break;
            ItemPlacement p = place(candidate, poly, doors, taken);
            if (p != null) out.add(p);
        }
        return new LayoutResult(out, out.isEmpty()
            ? "Phòng không còn chỗ trống phù hợp để thêm đồ."
            : "Gợi ý tự động: thêm vài món thuộc loại phòng chưa có, đặt sát tường để giữ lối đi.");
    }

    /** One piece per category the room does not have yet, matching style first, small pieces first */
    private static List<Item> pickFromCatalog(List<Item> catalog, Set<String> have, String style) {
        String wanted = lower(style);
        List<Item> sorted = new ArrayList<>(catalog);
        sorted.sort(Comparator
            .comparing((Item i) -> !wanted.isBlank() && wanted.equals(lower(i.style())) ? 0 : 1)
            .thenComparingDouble(i -> i.widthCm() * i.depthCm()));
        List<Item> picked = new ArrayList<>();
        Set<String> used = new HashSet<>(have);
        for (Item i : sorted) {
            if (used.add(lower(i.category()))) picked.add(i);
        }
        return picked;
    }

    /** First spot along the walls (longest wall first) where the piece fits */
    private static ItemPlacement place(Item item, List<Point> poly, List<double[]> doors, List<double[]> taken) {
        List<Integer> walls = new ArrayList<>();
        for (int i = 0; i < poly.size(); i++) walls.add(i);
        walls.sort(Comparator.comparingDouble((Integer i) -> wallLength(poly, i)).reversed());

        for (int w : walls) {
            Point a = poly.get(w);
            Point b = poly.get((w + 1) % poly.size());
            double len = wallLength(poly, w);
            double ux = (b.x() - a.x()) / len;
            double uy = (b.y() - a.y()) / len;
            Point n = LayoutGeometry.inwardNormal(a, b, poly);
            // Long side along the wall, front (+y at rotation 0) facing into the room
            double rotation = LayoutGeometry.normalizeRotation(Math.toDegrees(Math.atan2(-n.x(), n.y())));
            double half = item.widthCm() / 200.0;
            double off = item.depthCm() / 200.0 + GAP;
            for (double t = half + GAP; t <= len - half - GAP + 1e-9; t += STEP) {
                double cx = a.x() + ux * t + n.x() * off;
                double cy = a.y() + uy * t + n.y() * off;
                List<Point> fp = LayoutGeometry.footprint(cx, cy, item.widthCm(), item.depthCm(), rotation);
                if (!LayoutGeometry.fitsInRoom(fp, poly)) continue;
                double[] box = LayoutGeometry.box(cx, cy, item.widthCm(), item.depthCm(), rotation);
                if (LayoutGeometry.blocksDoor(box, doors)) continue;
                if (taken.stream().anyMatch(o -> LayoutGeometry.overlaps(box, o, GAP))) continue;
                taken.add(box);
                return new ItemPlacement(item.ref(), LayoutGeometry.round(cx), LayoutGeometry.round(cy), rotation);
            }
        }
        return null;
    }

    private static double wallLength(List<Point> poly, int i) {
        Point a = poly.get(i);
        Point b = poly.get((i + 1) % poly.size());
        return Math.hypot(b.x() - a.x(), b.y() - a.y());
    }

    private static String lower(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
    }
}
