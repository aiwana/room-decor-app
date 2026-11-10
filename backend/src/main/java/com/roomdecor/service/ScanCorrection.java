package com.roomdecor.service;

import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.service.ai.RoomVisionClient.RoomAnalysisResult;
import com.roomdecor.service.ai.RoomVisionClient.ScanHints;

import java.util.ArrayList;
import java.util.List;

/**
 * Tidies the floor plan the AI returned so the user has less to fix by hand
 * (meters, origin top-left, y grows downwards). Runs after {@link FloorPlanGeometry#normalize}:
 * <ol>
 *   <li>a plan that is tilted a few degrees is turned back so the walls follow the x/y axes</li>
 *   <li>walls within 10 degrees of horizontal/vertical become exactly horizontal/vertical,
 *       straight runs split into several pieces are merged, walls shorter than 20 cm are removed</li>
 *   <li>the plan is stretched to the length/width the user measured (if any)</li>
 *   <li>corners are snapped to a 5 cm grid, doors and windows are moved onto the nearest wall</li>
 * </ol>
 * Every step is skipped when its result would be broken (crossing walls, tiny area).
 * Pure functions, no Spring.
 */
public final class ScanCorrection {

    static final double SQUARE_TOLERANCE_DEG = 10;
    /** Only a plan tilted up to this much is turned back; more is probably an angled room */
    static final double MAX_TILT_DEG = 15;
    static final double MIN_WALL = 0.2;
    static final double GRID = 0.05;
    static final double MIN_AREA = 1.0;
    /** A door/window further than this from every wall is left where the AI put it */
    static final double OPENING_SNAP_DISTANCE = 0.5;
    static final double MIN_OPENING = 0.2;
    /** User measurements far from the AI's guess are still trusted, within this factor */
    static final double MIN_SCALE = 0.2;
    static final double MAX_SCALE = 5;

    private enum Dir { H, V, OTHER }

    private ScanCorrection() {}

    public static RoomAnalysisResult apply(RoomAnalysisResult in, ScanHints hints) {
        ScanHints h = hints == null ? ScanHints.NONE : hints;
        double ceiling = h.ceilingHeightMeters() != null ? h.ceilingHeightMeters() : in.ceilingHeightMeters();
        List<double[]> poly = corners(in.walls());
        if (poly == null) {
            return new RoomAnalysisResult(in.roomWidthMeters(), in.roomDepthMeters(), ceiling,
                in.walls(), in.openings(), in.description());
        }
        List<double[]> openings = new ArrayList<>();
        List<String> types = new ArrayList<>();
        if (in.openings() != null) {
            for (Opening o : in.openings()) {
                openings.add(new double[] {o.x1(), o.y1(), o.x2(), o.y2()});
                types.add(o.type());
            }
        }

        // 1. Small overall tilt -> rotate back around the centroid
        double tilt = dominantTilt(poly);
        if (Math.abs(tilt) > 0.5 && Math.abs(tilt) <= MAX_TILT_DEG) {
            double[] c = centroid(poly);
            double rad = Math.toRadians(-tilt);
            poly = rotate(poly, c, rad);
            for (int i = 0; i < openings.size(); i++) {
                double[] o = openings.get(i);
                double[] a = rotatePoint(o[0], o[1], c, rad);
                double[] b = rotatePoint(o[2], o[3], c, rad);
                openings.set(i, new double[] {a[0], a[1], b[0], b[1]});
            }
        }

        // 2. Square corners, merge straight runs, drop tiny walls
        List<double[]> squared = square(poly);
        if (usable(squared)) poly = squared;

        // 3. Stretch to the user's measurements
        double[] box = bounds(poly);
        double[] s = scale(box[2] - box[0], box[3] - box[1], h);
        if (s[0] != 1 || s[1] != 1) {
            poly = scaleAll(poly, box[0], box[1], s);
            for (int i = 0; i < openings.size(); i++) {
                double[] o = openings.get(i);
                openings.set(i, new double[] {
                    box[0] + (o[0] - box[0]) * s[0], box[1] + (o[1] - box[1]) * s[1],
                    box[0] + (o[2] - box[0]) * s[0], box[1] + (o[3] - box[1]) * s[1]});
            }
        }

        // 4. 5 cm grid, openings onto walls
        List<double[]> snapped = new ArrayList<>();
        for (double[] p : poly) snapped.add(new double[] {snap(p[0]), snap(p[1])});
        snapped = mergeStraight(snapped);
        if (usable(snapped)) poly = snapped;

        List<WallSegment> walls = new ArrayList<>();
        for (int i = 0; i < poly.size(); i++) {
            double[] a = poly.get(i), b = poly.get((i + 1) % poly.size());
            walls.add(new WallSegment(a[0], a[1], b[0], b[1]));
        }
        List<Opening> outOpenings = new ArrayList<>();
        for (int i = 0; i < openings.size(); i++) {
            double[] o = snapOpening(openings.get(i), poly);
            if (o != null) outOpenings.add(new Opening(types.get(i), o[0], o[1], o[2], o[3]));
        }
        double[] b = bounds(poly);
        return new RoomAnalysisResult(b[2] - b[0], b[3] - b[1], ceiling, walls, outOpenings, in.description());
    }

    /* ------------------------------ Steps ------------------------------ */

    /** Polygon corners if the walls form one closed chain, else null */
    static List<double[]> corners(List<WallSegment> walls) {
        if (walls == null || walls.size() < 3) return null;
        List<double[]> pts = new ArrayList<>();
        for (int i = 0; i < walls.size(); i++) {
            WallSegment w = walls.get(i);
            WallSegment next = walls.get((i + 1) % walls.size());
            if (Math.hypot(w.x2() - next.x1(), w.y2() - next.y1()) > 0.01) return null;
            pts.add(new double[] {w.x1(), w.y1()});
        }
        return pts;
    }

    /** Average wall angle folded into (-45, 45] degrees, longer walls count more */
    static double dominantTilt(List<double[]> poly) {
        double c = 0, s = 0;
        for (int i = 0; i < poly.size(); i++) {
            double[] a = poly.get(i), b = poly.get((i + 1) % poly.size());
            double len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            double ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 4; // period 90 degrees
            c += len * Math.cos(ang);
            s += len * Math.sin(ang);
        }
        if (c == 0 && s == 0) return 0;
        return Math.toDegrees(Math.atan2(s, c) / 4);
    }

    static List<double[]> square(List<double[]> input) {
        List<double[]> p = mergeStraight(dropShortWalls(copy(input)));
        for (int iter = 0; iter < 3 && p.size() >= 3; iter++) {
            p = mergeSameDirection(p);
            int n = p.size();
            Dir[] dirs = new Dir[n];
            for (int i = 0; i < n; i++) dirs[i] = direction(p.get(i), p.get((i + 1) % n));
            for (int i = 0; i < n; i++) {
                double[] a = p.get(i), b = p.get((i + 1) % n);
                if (dirs[i] == Dir.H) {
                    double y = (a[1] + b[1]) / 2;
                    a[1] = y;
                    b[1] = y;
                } else if (dirs[i] == Dir.V) {
                    double x = (a[0] + b[0]) / 2;
                    a[0] = x;
                    b[0] = x;
                }
            }
            p = mergeStraight(dropShortWalls(p));
        }
        return p;
    }

    /** Two walls in a row that are both almost horizontal (or both almost vertical) become one */
    private static List<double[]> mergeSameDirection(List<double[]> input) {
        List<double[]> p = copy(input);
        boolean changed = true;
        while (changed && p.size() > 3) {
            changed = false;
            int n = p.size();
            for (int i = 0; i < n; i++) {
                double[] prev = p.get((i - 1 + n) % n), cur = p.get(i), next = p.get((i + 1) % n);
                Dir d1 = direction(prev, cur), d2 = direction(cur, next);
                boolean sameWay = (cur[0] - prev[0]) * (next[0] - cur[0]) + (cur[1] - prev[1]) * (next[1] - cur[1]) > 0;
                if (d1 == d2 && d1 != Dir.OTHER && sameWay) {
                    p.remove(i);
                    changed = true;
                    break;
                }
            }
        }
        return p;
    }

    private static Dir direction(double[] a, double[] b) {
        double dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
        double tan = Math.tan(Math.toRadians(SQUARE_TOLERANCE_DEG));
        if (dy <= tan * dx) return Dir.H;
        if (dx <= tan * dy) return Dir.V;
        return Dir.OTHER;
    }

    /** Remove corners in the middle of a straight run (both walls horizontal, or both vertical) */
    static List<double[]> mergeStraight(List<double[]> input) {
        List<double[]> p = copy(input);
        boolean changed = true;
        while (changed && p.size() > 3) {
            changed = false;
            int n = p.size();
            for (int i = 0; i < n; i++) {
                double[] prev = p.get((i - 1 + n) % n), cur = p.get(i), next = p.get((i + 1) % n);
                double cross = (cur[0] - prev[0]) * (next[1] - cur[1]) - (cur[1] - prev[1]) * (next[0] - cur[0]);
                double l1 = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
                double l2 = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
                boolean sameWay = (cur[0] - prev[0]) * (next[0] - cur[0]) + (cur[1] - prev[1]) * (next[1] - cur[1]) > 0;
                if (l1 < 1e-6 || l2 < 1e-6 || (sameWay && Math.abs(cross) <= 1e-2 * l1 * l2)) {
                    p.remove(i);
                    changed = true;
                    break;
                }
            }
        }
        return p;
    }

    /** Collapse walls shorter than MIN_WALL into one corner (never below 3 corners) */
    static List<double[]> dropShortWalls(List<double[]> input) {
        List<double[]> p = copy(input);
        boolean changed = true;
        while (changed && p.size() > 3) {
            changed = false;
            int n = p.size();
            for (int i = 0; i < n; i++) {
                double[] a = p.get(i), b = p.get((i + 1) % n);
                if (Math.hypot(b[0] - a[0], b[1] - a[1]) < MIN_WALL) {
                    a[0] = (a[0] + b[0]) / 2;
                    a[1] = (a[1] + b[1]) / 2;
                    p.remove((i + 1) % n);
                    changed = true;
                    break;
                }
            }
        }
        return p;
    }

    /** {sx, sy} so the bounding box matches what the user measured; {1, 1} without measurements */
    static double[] scale(double width, double depth, ScanHints h) {
        Double len = valid(h.roomLengthMeters());
        Double wid = valid(h.roomWidthMeters());
        if (width <= 0 || depth <= 0 || (len == null && wid == null)) return new double[] {1, 1};
        double longSide = Math.max(width, depth), shortSide = Math.min(width, depth);
        if (len != null && wid != null) {
            double l = Math.max(len, wid), s = Math.min(len, wid);
            // The longer measurement goes to the longer side of the plan
            double sx = width >= depth ? l / width : s / width;
            double sy = width >= depth ? s / depth : l / depth;
            return new double[] {limit(sx), limit(sy)};
        }
        double k = len != null ? len / longSide : wid / shortSide;
        return new double[] {limit(k), limit(k)};
    }

    private static Double valid(Double v) {
        return v != null && Double.isFinite(v) && v > 0 ? v : null;
    }

    private static double limit(double k) {
        return Math.max(MIN_SCALE, Math.min(MAX_SCALE, k));
    }

    /** Opening moved onto its nearest wall, or kept as is when no wall is close; null when too short */
    static double[] snapOpening(double[] o, List<double[]> poly) {
        double mx = (o[0] + o[2]) / 2, my = (o[1] + o[3]) / 2;
        int best = -1;
        double bestDist = Double.MAX_VALUE;
        for (int i = 0; i < poly.size(); i++) {
            double d = distanceToSegment(mx, my, poly.get(i), poly.get((i + 1) % poly.size()));
            if (d < bestDist) {
                bestDist = d;
                best = i;
            }
        }
        double[] out = o;
        if (best >= 0 && bestDist <= OPENING_SNAP_DISTANCE) {
            double[] a = poly.get(best), b = poly.get((best + 1) % poly.size());
            double[] p1 = project(o[0], o[1], a, b);
            double[] p2 = project(o[2], o[3], a, b);
            out = new double[] {snap(p1[0]), snap(p1[1]), snap(p2[0]), snap(p2[1])};
        }
        return Math.hypot(out[2] - out[0], out[3] - out[1]) < MIN_OPENING ? null : out;
    }

    /* ------------------------------ Helpers ------------------------------ */

    static boolean usable(List<double[]> p) {
        return p.size() >= 3 && Math.abs(area(p)) >= MIN_AREA && !selfIntersecting(p);
    }

    static double area(List<double[]> p) {
        double s = 0;
        for (int i = 0; i < p.size(); i++) {
            double[] a = p.get(i), b = p.get((i + 1) % p.size());
            s += a[0] * b[1] - b[0] * a[1];
        }
        return s / 2;
    }

    static boolean selfIntersecting(List<double[]> p) {
        int n = p.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (j == i + 1 || (i == 0 && j == n - 1)) continue; // neighbours share a corner
                if (segmentsCross(p.get(i), p.get((i + 1) % n), p.get(j), p.get((j + 1) % n))) return true;
            }
        }
        return false;
    }

    private static boolean segmentsCross(double[] a, double[] b, double[] c, double[] d) {
        double d1 = orient(c, d, a), d2 = orient(c, d, b), d3 = orient(a, b, c), d4 = orient(a, b, d);
        return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9))
            && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
    }

    private static double orient(double[] a, double[] b, double[] c) {
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }

    private static double[] project(double x, double y, double[] a, double[] b) {
        double dx = b[0] - a[0], dy = b[1] - a[1];
        double len2 = dx * dx + dy * dy;
        double t = len2 == 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2));
        return new double[] {a[0] + t * dx, a[1] + t * dy};
    }

    private static double distanceToSegment(double x, double y, double[] a, double[] b) {
        double[] q = project(x, y, a, b);
        return Math.hypot(x - q[0], y - q[1]);
    }

    private static double[] centroid(List<double[]> p) {
        double x = 0, y = 0;
        for (double[] q : p) {
            x += q[0];
            y += q[1];
        }
        return new double[] {x / p.size(), y / p.size()};
    }

    private static double[] rotatePoint(double x, double y, double[] c, double rad) {
        double cos = Math.cos(rad), sin = Math.sin(rad);
        double dx = x - c[0], dy = y - c[1];
        return new double[] {c[0] + dx * cos - dy * sin, c[1] + dx * sin + dy * cos};
    }

    private static List<double[]> rotate(List<double[]> p, double[] c, double rad) {
        List<double[]> out = new ArrayList<>();
        for (double[] q : p) out.add(rotatePoint(q[0], q[1], c, rad));
        return out;
    }

    private static List<double[]> scaleAll(List<double[]> p, double ox, double oy, double[] s) {
        List<double[]> out = new ArrayList<>();
        for (double[] q : p) out.add(new double[] {ox + (q[0] - ox) * s[0], oy + (q[1] - oy) * s[1]});
        return out;
    }

    /** {minX, minY, maxX, maxY} */
    static double[] bounds(List<double[]> p) {
        double minX = Double.MAX_VALUE, minY = Double.MAX_VALUE, maxX = -Double.MAX_VALUE, maxY = -Double.MAX_VALUE;
        for (double[] q : p) {
            minX = Math.min(minX, q[0]);
            minY = Math.min(minY, q[1]);
            maxX = Math.max(maxX, q[0]);
            maxY = Math.max(maxY, q[1]);
        }
        return new double[] {minX, minY, maxX, maxY};
    }

    private static List<double[]> copy(List<double[]> p) {
        List<double[]> out = new ArrayList<>();
        for (double[] q : p) out.add(new double[] {q[0], q[1]});
        return out;
    }

    private static double snap(double v) {
        return Math.round(v / GRID) * GRID;
    }
}
