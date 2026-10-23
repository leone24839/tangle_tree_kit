import { test } from "node:test";
import * as assert from "node:assert/strict";
import { TangleTree, Point } from "../src/index.js";

/** Helper: collect only the data payloads, sorted for easy comparison. */
function datasOf(points) {
  return points.map((p) => p.data).sort();
}

test("empty tree query returns an empty array", () => {
  const t = new TangleTree();
  assert.deepEqual(t.query(-10, 10, -10, 10), []);
});

// We assert on the ONE behaviour the implementation guarantees about
// insertion order: a single point lands at the root. We do NOT assert any
// particular left/right placement of later points, because that depends on
// tie-breaks that callers should not rely on.
test("first insert becomes the root", () => {
  const t = new TangleTree();
  t.insert(Point(1, 2, "a"));
  assert.deepEqual(t.root.point, { x: 1, y: 2, data: "a" });
  assert.equal(t.size, 1);
});

// Distinct, well-separated coordinates produce a canonical k-d tree shape,
// so in this one case we check the full layout as a regression test against
// accidental axis-cycle changes.
test("distinct points are partitioned along alternating axes", () => {
  // Insert left-to-right so the root is the first point.
  const t = new TangleTree();
  t.insert(Point(5, 5, "root"));
  t.insert(Point(3, 5, "left"));
  t.insert(Point(7, 5, "right"));
  assert.equal(t.root.point.data, "root");
  assert.equal(t.root.left.point.data, "left");
  assert.equal(t.root.right.point.data, "right");
});

test("insert rejects non-finite coordinates", () => {
  const t = new TangleTree();
  assert.throws(() => t.insert(Point(NaN, 1)), TypeError);
  assert.throws(() => t.insert(Point(1, Infinity)), TypeError);
});

test("insert chains and updates size", () => {
  const t = new TangleTree();
  t.insert(Point(1, 1)).insert(Point(2, 2)).insert(Point(3, 3));
  assert.equal(t.size, 3);
});

test("closed-range query returns points on the boundary", () => {
  const t = new TangleTree();
  t.insert(Point(0, 0, "origin"));
  t.insert(Point(10, 0, "right-edge"));
  t.insert(Point(0, 10, "top-edge"));
  t.insert(Point(10, 10, "corner"));
  t.insert(Point(20, 20, "outside"));
  assert.deepEqual(
    datasOf(t.query(0, 10, 0, 10)),
    ["corner", "origin", "right-edge", "top-edge"],
  );
});

test("unbounded sides via null", () => {
  const t = new TangleTree();
  t.insert(Point(-100, -100, "lo"));
  t.insert(Point(0, 0, "mid"));
  t.insert(Point(100, 100, "hi"));
  // x unbounded both sides, y restricted to >= 0
  assert.deepEqual(datasOf(t.query(null, null, 0, null)), ["hi", "mid"]);
  // x <= 0, y unbounded
  assert.deepEqual(datasOf(t.query(null, 0, null, null)), ["lo", "mid"]);
});

test("semi-infinite slab query", () => {
  const t = new TangleTree();
  t.insert(Point(1, -5, "a"));
  t.insert(Point(1, 5, "b"));
  t.insert(Point(1, 15, "c"));
  // All points have x=1; a slab over x returns all of them.
  assert.deepEqual(datasOf(t.query(1, 1, null, null)), ["a", "b", "c"]);
});

test("point query with duplicated coordinates returns all copies", () => {
  const t = new TangleTree();
  t.insert(Point(2, 2, "first"));
  t.insert(Point(2, 2, "second"));
  t.insert(Point(2, 2, "third"));
  const got = datasOf(t.query(2, 2, 2, 2));
  assert.deepEqual(got, ["first", "second", "third"]);
});

test("query region smaller than every point returns nothing", () => {
  const t = new TangleTree();
  t.insert(Point(10, 10, "a"));
  t.insert(Point(20, 20, "b"));
  assert.deepEqual(t.query(0, 5, 0, 5), []);
});

test("negative coordinates are handled", () => {
  const t = new TangleTree();
  t.insert(Point(-3, -3, "lo"));
  t.insert(Point(-1, -1, "near"));
  t.insert(Point(3, 3, "hi"));
  assert.deepEqual(datasOf(t.query(-5, 0, -5, 0)), ["lo", "near"]);
});

test("Point factory defaults data to null", () => {
  const p = Point(1, 2);
  assert.equal(p.data, null);
  assert.equal(p.x, 1);
  assert.equal(p.y, 2);
});

test("insert throws a TypeError on a non-object point", () => {
  const t = new TangleTree();
  assert.throws(() => t.insert(null), TypeError);
  assert.throws(() => t.insert(undefined), TypeError);
  assert.throws(() => t.insert(7), TypeError);
});

test("mass insert then full-range query returns every point", () => {
  const t = new TangleTree();
  const n = 500;
  for (let i = 0; i < n; i++) {
    // Deterministic pseudo-random coordinates.
    const x = ((i * 1103515245 + 12345) & 0x7fffffff) % 1000;
    const y = ((i * 2147001237 + 77777) & 0x7fffffff) % 1000;
    t.insert(Point(x, y, i));
  }
  assert.equal(t.size, n);
  const all = t.query(null, null, null, null);
  assert.equal(all.length, n);
  // Confirm every inserted id is present exactly once.
  const seen = new Set(all.map((p) => p.data));
  assert.equal(seen.size, n);
});
