package com.roomdecor.service;

import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.service.ai.LayoutAdvisor.Item;
import com.roomdecor.service.ai.LayoutAdvisor.ItemPlacement;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutRequest;
import com.roomdecor.service.ai.LayoutAdvisor.LayoutResult;
import com.roomdecor.service.ai.LayoutAdvisor.Mode;
import com.roomdecor.service.ai.LayoutAdvisor.Point;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Geometry for furniture layouts (meters, origin top-left, y grows downwards).
 * Used to check what the AI suggests (never trusted as is) and by the rule-based advisor.
 * Pure functions, no Spring, easy to unit test.
 */
public final class LayoutGeometry {

    /** Free space kept in front of a door (m) */
    static final double DOOR_CLEARANCE = 0.8;
    /** Most new pieces added from the catalog in one suggestion */
    static final int MAX_NEW_ITEMS = 6;
    private static final double CM_PER_M = 100.0;
    private static final double EPS = 0.05;

    private LayoutGeometry() {}

    /* ------------------------------ Room polygon ------------------------------ */

    /**
     * Corners of the room in order. Walls saved by the scan / the app form a closed chain;
     * if they do not, the bounding rectangle is used.
     */
    public static List<Point> polygon(List<WallSegment> walls, double width, double depth) {
        if (walls != null && walls.size() >= 3) {
            List<Point> corners = new ArrayList<>();
            boolean chained = true;
            for (int i = 0; i < walls.size(); i++) {
                WallSegment w = walls.get(i);
                WallSegment next = walls.get((i + 1) % walls.size());
                if (Math.hypot(w.x2() - next.x1(), w.y2() - next.y1()) > EPS) {
                    chained = false;
                    break;
                }
                corners.add(new Point(w.x1(), w.y1()));
            }
            if (chained) return corners;
        }
        return List.of(new Point(0, 0), new Point(width, 0), new Point(width, depth), new Point(0, depth));
    }

    public static boolean inside(Point p, List<Point> poly) {
        boolean in = false;
        for (int i = 0, j = poly.size() - 1; i < poly.size(); j = i++) {
            Point a = poly.get(i);
            Point b = poly.get(j);
            if ((a.y() > p.y()) != (b.y() > p.y())
                && p.x() < (b.x() - a.x()) * (p.y() - a.y()) / (b.y() - a.y()) + a.x()) {
                in = !in;
            }
        }
        return in;
    }

    /** Distance from p to the closest wall */
    static double distanceToWalls(Point p, List<Point> poly) {
        double best = Double.MAX_VALUE;
        for (int i = 0; i < poly.size(); i++) {
            best = Math.min(best, distanceToSegment(p, poly.get(i), poly.get((i + 1) % poly.size())));
        }
        return best;
    }

    static double distanceToSegment(Point p, Point a, Point b) {
        Point q = project(p, a, b);
        return Math.hypot(p.x() - q.x(), p.y() - q.y());
    }

    private static Point project(Point p, Point a, Point b) {
        double dx = b.x() - a.x();
        double dy = b.y() - a.y();
        double len2 = dx * dx + dy * dy;
        double t = len2 == 0 ? 0 : Math.max(0, Math.min(1, ((p.x() - a.x()) * dx + (p.y() - a.y()) * dy) / len2));
        return new Point(a.x() + t * dx, a.y() + t * dy);
    }

    /** Unit normal of wall a->b that points into the room */
    static Point inwardNormal(Point a, Point b, List<Point> poly) {
        double len = Math.hypot(b.x() - a.x(), b.y() - a.y());
        if (len == 0) return new Point(0, 0);
        Point n = new Point(-(b.y() - a.y()) / len, (b.x() - a.x()) / len);
        Point probe = new Point((a.x() + b.x()) / 2 + n.x() * 0.01, (a.y() + b.y()) / 2 + n.y() * 0.01);
        return inside(probe, poly) ? n : new Point(-n.x(), -n.y());
    }

    static Point centroid(List<Point> poly) {
        double x = 0, y = 0;
        for (Point p : poly) {
            x += p.x();
            y += p.y();
        }
        return new Point(x / poly.size(), y / poly.size());
    }

    /**
     * Moves p inside the room so it is at least `margin` meters from every wall (when the room
     * is big enough). Used for the centre of a piece of furniture.
     */
    public static Point pushInside(Point p, List<Point> poly, double margin) {
        Point cur = p;
        for (int iter = 0; iter < 8; iter++) {
            if (inside(cur, poly) && distanceToWalls(cur, poly) >= margin - 1e-6) return cur;
            // Closest wall -> step to `margin` in front of it
            int best = 0;
            double bestDist = Double.MAX_VALUE;
            for (int i = 0; i < poly.size(); i++) {
                double d = distanceToSegment(cur, poly.get(i), poly.get((i + 1) % poly.size()));
                if (d < bestDist) {
                    bestDist = d;
                    best = i;
                }
            }
            Point a = poly.get(best);
            Point b = poly.get((best + 1) % poly.size());
            Point onWall = project(cur, a, b);
            Point n = inwardNormal(a, b, poly);
            cur = new Point(onWall.x() + n.x() * margin, onWall.y() + n.y() * margin);
        }
        if (inside(cur, poly)) return cur;
        return centroid(poly);
    }

    /* ------------------------------ Furniture footprint ------------------------------ */

    /** Half size (m) of the axis-aligned box around a rotated piece of furniture */
    static double[] halfExtents(double widthCm, double depthCm, double rotationDeg) {
        double r = Math.toRadians(rotationDeg);
        double hw = widthCm / CM_PER_M / 2;
        double hd = depthCm / CM_PER_M / 2;
        double c = Math.abs(Math.cos(r));
        double s = Math.abs(Math.sin(r));
        return new double[] {hw * c + hd * s, hw * s + hd * c};
    }

    /** Corners of the rotated piece of furniture */
    static List<Point> footprint(double cx, double cy, double widthCm, double depthCm, double rotationDeg) {
        double r = Math.toRadians(rotationDeg);
        double hw = widthCm / CM_PER_M / 2;
        double hd = depthCm / CM_PER_M / 2;
        double cos = Math.cos(r);
        double sin = Math.sin(r);
        List<Point> pts = new ArrayList<>(4);
        double[][] local = {{-hw, -hd}, {hw, -hd}, {hw, hd}, {-hw, hd}};
        for (double[] l : local) {
            pts.add(new Point(cx + l[0] * cos - l[1] * sin, cy + l[0] * sin + l[1] * cos));
        }
        return pts;
    }

    /** Box = {minX, minY, maxX, maxY} */
    static double[] box(double cx, double cy, double widthCm, double depthCm, double rotationDeg) {
        double[] h = halfExtents(widthCm, depthCm, rotationDeg);
        return new double[] {cx - h[0], cy - h[1], cx + h[0], cy + h[1]};
    }

    static boolean overlaps(double[] a, double[] b, double gap) {
        return a[0] < b[2] + gap && b[0] < a[2] + gap && a[1] < b[3] + gap && b[1] < a[3] + gap;
    }

    /* ------------------------------ Doors ------------------------------ */

    /** Area in front of each door that must stay free: {minX, minY, maxX, maxY} */
    static List<double[]> doorZones(List<Opening> openings, List<Point> poly) {
        List<double[]> zones = new ArrayList<>();
        if (openings == null) return zones;
        for (Opening o : openings) {
            if (!Opening.DOOR.equals(o.type())) continue;
            Point a = new Point(o.x1(), o.y1());
            Point b = new Point(o.x2(), o.y2());
            Point n = inwardNormal(a, b, poly);
            double[] xs = {a.x(), b.x(), a.x() + n.x() * DOOR_CLEARANCE, b.x() + n.x() * DOOR_CLEARANCE};
            double[] ys = {a.y(), b.y(), a.y() + n.y() * DOOR_CLEARANCE, b.y() + n.y() * DOOR_CLEARANCE};
            zones.add(new double[] {min(xs), min(ys), max(xs), max(ys)});
        }
        return zones;
    }

    static boolean blocksDoor(double[] itemBox, List<double[]> doorZones) {
        for (double[] z : doorZones) {
            if (overlaps(itemBox, z, 0)) return true;
        }
        return false;
    }

    /** All 4 corners of the piece are inside the room */
    static boolean fitsInRoom(List<Point> footprint, List<Point> poly) {
        for (Point p : footprint) {
            if (!inside(p, poly) && distanceToWalls(p, poly) > 0.02) return false;
        }
        return true;
    }

    /* ------------------------------ Cleaning AI output ------------------------------ */

    /**
     * Turns whatever the advisor returned into a safe layout:
     * <ul>
     *   <li>unknown refs are dropped, each placed item is used at most once</li>
     *   <li>REARRANGE: every placed item is in the result (missing ones stay where they were)</li>
     *   <li>ADD: placed items stay where they were, at most MAX_NEW_ITEMS new catalog pieces</li>
     *   <li>centres outside the room are pushed inside; pieces in front of a door are moved away</li>
     * </ul>
     */
    public static List<ItemPlacement> clean(LayoutResult raw, LayoutRequest req) {
        List<Point> poly = req.corners();
        List<double[]> doors = doorZones(req.openings(), poly);
        Map<String, Item> placed = byRef(req.placed());
        Map<String, Item> catalog = byRef(req.catalog());

        Map<String, ItemPlacement> moved = new HashMap<>();
        List<ItemPlacement> added = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        List<ItemPlacement> suggestions = raw == null || raw.placements() == null ? List.of() : raw.placements();
        for (ItemPlacement s : suggestions) {
            if (s == null || s.ref() == null || !Double.isFinite(s.x()) || !Double.isFinite(s.y())) continue;
            double rotation = Double.isFinite(s.rotation()) ? normalizeRotation(s.rotation()) : 0;
            if (req.mode() == Mode.REARRANGE && placed.containsKey(s.ref()) && seen.add(s.ref())) {
                moved.put(s.ref(), settle(new ItemPlacement(s.ref(), s.x(), s.y(), rotation), placed.get(s.ref()), poly, doors));
            } else if (req.mode() == Mode.ADD && catalog.containsKey(s.ref()) && added.size() < MAX_NEW_ITEMS) {
                added.add(settle(new ItemPlacement(s.ref(), s.x(), s.y(), rotation), catalog.get(s.ref()), poly, doors));
            }
        }

        List<ItemPlacement> result = new ArrayList<>();
        for (Item item : req.placed()) {
            ItemPlacement m = moved.get(item.ref());
            result.add(m != null ? m : new ItemPlacement(item.ref(),
                item.x() == null ? 0 : item.x(), item.y() == null ? 0 : item.y(),
                item.rotation() == null ? 0 : item.rotation()));
        }
        result.addAll(added);
        return result;
    }

    /** Pieces whose back belongs against a wall (front = seat side, doors, drawers) */
    private static final Set<String> BACK_TO_WALL = Set.of("sofa", "bed", "storage", "chair");
    /** Max gap between the back of a piece and the wall to count as "against the wall" (m) */
    static final double WALL_SNAP = 0.35;
    /** Tolerance when comparing the piece's axis with the wall direction (degrees) */
    private static final double AXIS_TOLERANCE = 20;

    /**
     * Rotation whose front faces the room. Convention: at rotation 0 the front faces +y (down),
     * rotation is clockwise, so the front direction is (-sin r, cos r).
     * Only fixes a piece that stands along a wall but looks at it (AI got the side 180 degrees wrong);
     * any other rotation is kept, so the footprint never changes.
     */
    static double faceIntoRoom(double cx, double cy, Item item, double rotation, List<Point> poly) {
        String category = item.category() == null ? "" : item.category().trim().toLowerCase(Locale.ROOT);
        if (!BACK_TO_WALL.contains(category)) return rotation;
        Point c = new Point(cx, cy);
        int best = -1;
        double bestDist = Double.MAX_VALUE;
        for (int i = 0; i < poly.size(); i++) {
            double d = distanceToSegment(c, poly.get(i), poly.get((i + 1) % poly.size()));
            if (d < bestDist) {
                bestDist = d;
                best = i;
            }
        }
        if (best < 0 || bestDist > item.depthCm() / 200.0 + WALL_SNAP) return rotation;
        Point n = inwardNormal(poly.get(best), poly.get((best + 1) % poly.size()), poly);
        double intoRoom = normalizeRotation(Math.toDegrees(Math.atan2(-n.x(), n.y())));
        double diff = Math.abs(normalizeRotation(rotation - intoRoom));
        if (diff > 180) diff = 360 - diff;
        // Facing the wall (about 180 degrees off) -> turn around; facing the room already -> keep
        return Math.abs(diff - 180) <= AXIS_TOLERANCE ? intoRoom : rotation;
    }

    /** Push one piece inside the room and out of door zones, then make it face the room */
    static ItemPlacement settle(ItemPlacement p, Item item, List<Point> poly, List<double[]> doors) {
        double[] h = halfExtents(item.widthCm(), item.depthCm(), p.rotation());
        double margin = Math.min(h[0], h[1]);
        Point c = pushInside(new Point(p.x(), p.y()), poly, margin);
        double[] box = box(c.x(), c.y(), item.widthCm(), item.depthCm(), p.rotation());
        if (blocksDoor(box, doors)) {
            // Try moving away from the door towards the middle of the room
            Point mid = centroid(poly);
            for (int step = 1; step <= 20 && blocksDoor(box, doors); step++) {
                double t = step / 20.0;
                Point q = pushInside(new Point(c.x() + (mid.x() - c.x()) * t, c.y() + (mid.y() - c.y()) * t), poly, margin);
                box = box(q.x(), q.y(), item.widthCm(), item.depthCm(), p.rotation());
                if (!blocksDoor(box, doors)) c = q;
            }
        }
        return new ItemPlacement(p.ref(), round(c.x()), round(c.y()), faceIntoRoom(c.x(), c.y(), item, p.rotation(), poly));
    }

    static double normalizeRotation(double deg) {
        double r = Math.round(deg) % 360;
        return r < 0 ? r + 360 : r;
    }

    private static Map<String, Item> byRef(List<Item> items) {
        Map<String, Item> map = new HashMap<>();
        if (items != null) items.forEach(i -> map.put(i.ref(), i));
        return map;
    }

    private static double min(double[] v) {
        double m = v[0];
        for (double x : v) m = Math.min(m, x);
        return m;
    }

    private static double max(double[] v) {
        double m = v[0];
        for (double x : v) m = Math.max(m, x);
        return m;
    }

    static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
