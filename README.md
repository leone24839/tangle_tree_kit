# tangle_tree_kit

Stores a set of 2D points in an unbalanced binary space partition (k-d tree, k=2) for orthogonal range queries. Returns all points inside a closed axis-aligned rectangle.

## Usage

```js
import { TangleTree, Point } from "./src/index.js";

const tree = new TangleTree();
tree.insert(Point(2, 3, "apple"));
tree.insert(Point(5, 1, "banana"));
tree.insert(Point(8, 8, "cherry"));

// Any null bound means open-ended on that side.
const hits = tree.query(0, 5, 0, 5); // [{x:2,y:3,data:"apple"}, {x:5,y:1,data:"banana"}]
```

## Why this exists

The problem is plain: given a growing collection of `(x, y)` points, answer "which ones lie inside this box?" repeatedly without scanning the whole set. A k-d tree with alternating x/y splits gives O(√n) expected query cost on uniformly scattered points, which is the right shape for small-to-medium static or append-heavy datasets.

The trade-off is deliberately not hiding: there is no rebalancing. Insert points in sorted order and the tree degenerates into a linked list (O(n) queries). If your input is adversarial, shuffle before inserting.

## The awkward edge

When two points share a coordinate along the active split axis, the tie-break sends the equal point to the **right** subtree. A consequence is that a pure `x = c` slab query descends both sides near the boundary; duplicates of `(c, c)` all come back, but you should not rely on a particular left/right placement of any specific point. Treat the traversal order as unspecified.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

## Limitations

Values are coerced to floats, so very large integers lose precision. If you need
exact integer aggregates over a window, this is the wrong tool.

