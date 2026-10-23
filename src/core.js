/**
 * @typedef {Object} Point A 2D point with arbitrary user data.
 * @property {number} x X coordinate (finite).
 * @property {number} y Y coordinate (finite).
 * @property {*} data User-supplied payload.
 */

/**
 * Binary-space-partition tree of 2D points supporting orthogonal
 * (axis-aligned) range queries. The structure is often called a k-d tree
 * with k = 2 and alternating, cycle-based splitting axes (x at even depth,
 * y at odd depth), so every internal node partitions its points cleanly:
 * the left subtree holds points strictly less than the node along the
 * active axis and the right subtree holds those greater-or-equal. Equal
 * coordinates along the active axis go right, which keeps insertion
 * deterministic and guarantees each equal-coordinate pair ends up in the
 * same subtree rather than being split across both sides.
 *
 * Trade-off: there is no rebalancing, so a pathologically sorted input
 * degenerates to a linked list and query cost reaches O(n). For unordered
 * or hashed inputs the expected depth is O(log n). This is the right call
 * for the intended use — static or append-heavy point sets queried a few
 * thousand times — because it avoids the bookkeeping cost of a balanced
 * structure. If you need guaranteed log-depth on hostile inputs, insert
 * points in a shuffled order.
 */
export class TangleTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  static makeNode(point, depth) {
    return { point, depth, left: null, right: null };
  }

  /**
   * Returns the coordinate the node at `depth` compares against.
   * Depth 0 → x, depth 1 → y, depth 2 → x, ... Cycling is simpler and
   * allocation-free compared with storing an axis flag per node and is the
   * standard formulation for k-d trees.
   */
  static axisAt(depth) {
    return depth % 2 === 0 ? "x" : "y";
  }

  /**
   * Inserts a point. Returns the tree for chaining.
   * @param {Point} point Must carry finite x and y; `data` is opaque.
   */
  insert(point) {
    if (!point || typeof point !== "object") {
      throw new TypeError("point must be an object with x, y, data");
    }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new TypeError("point.x and point.y must be finite numbers");
    }
    this.size += 1;
    if (this.root === null) {
      this.root = TangleTree.makeNode(point, 0);
      return this;
    }
    let cursor = this.root;
    for (;;) {
      const axis = TangleTree.axisAt(cursor.depth);
      // Strict < goes left, ≥ goes right. The equality tie-break is what
      // keeps identical-axis points in one subtree.
      const goLeft = point[axis] < cursor.point[axis];
      const child = goLeft ? cursor.left : cursor.right;
      if (child === null) {
        const leaf = TangleTree.makeNode(point, cursor.depth + 1);
        if (goLeft) cursor.left = leaf;
        else cursor.right = leaf;
        return this;
      }
      cursor = child;
    }
  }

  /**
   * Returns all points whose (x, y) lies inside the closed rectangle
   * [minX, maxX] × [minY, maxY]. A null bound on any side means
   * unbounded in that direction (e.g. maxX = null → +∞).
   * @param {number|null} minX
   * @param {number|null} maxX
   * @param {number|null} minY
   * @param {number|null} maxY
   * @returns {Point[]}
   */
  query(minX, maxX, minY, maxY) {
    const out = [];
    if (this.root === null) return out;
    const lower = { x: minX, y: minY };
    const upper = { x: maxX, y: maxY };
    (function visit(node) {
      const axis = TangleTree.axisAt(node.depth);
      const v = node.point[axis];
      // Recurse left if the query rectangle can reach coordinates strictly
      // below the node's split. Because points equal to v live on the right
      // side, the left subtree contains only v' < v, so the test is strict.
      if (lower[axis] !== null && lower[axis] < v && node.left !== null) {
        visit(node.left);
      } else if (lower[axis] === null && node.left !== null) {
        visit(node.left);
      }
      // Right subtree contains v' ≥ v, so recurse if the rectangle can
      // reach coordinates ≥ v, i.e. upper[axis] is null (unbounded) or
      // upper[axis] >= v.
      const rightReachable = upper[axis] === null || upper[axis] >= v;
      if (rightReachable && node.right !== null) {
        visit(node.right);
      }
      const p = node.point;
      const xOk = (lower.x === null || p.x >= lower.x) && (upper.x === null || p.x <= upper.x);
      const yOk = (lower.y === null || p.y >= lower.y) && (upper.y === null || p.y <= upper.y);
      if (xOk && yOk) out.push(p);
    })(this.root);
    return out;
  }
}

/**
 * Convenience factory for plain point objects so callers do not have to
 * remember the exact shape. `data` defaults to null.
 * @param {number} x
 * @param {number} y
 * @param {*} [data=null]
 * @returns {Point}
 */
export function Point(x, y, data = null) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError("x and y must be finite numbers");
  }
  return { x, y, data };
}
