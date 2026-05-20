-- Parameters:
--   $1 = finished_good_item_id (UUID)
--   $2 = completed_quantity (NUMERIC)
--
-- This query explodes the currently active multi-level BoM for a finished good,
-- multiplies component demand by the completed quantity, applies per-line scrap,
-- prevents simple cyclic recursion, and returns the aggregated raw material demand
-- that should be consumed by the backflush transaction set.

WITH RECURSIVE bom_tree AS (
    SELECT
        b.bom_id,
        b.parent_item_id AS root_item_id,
        bl.component_item_id,
        1 AS depth,
        (bl.quantity * $2::NUMERIC(18, 6) * (1 + (bl.scrap_allowance_pct / 100.0)))::NUMERIC(18, 6) AS required_qty,
        ARRAY[b.parent_item_id, bl.component_item_id]::UUID[] AS traversal_path
    FROM boms b
    INNER JOIN bom_lines bl
        ON bl.bom_id = b.bom_id
    WHERE b.parent_item_id = $1
      AND b.is_active = TRUE

    UNION ALL

    SELECT
        child_bom.bom_id,
        bt.root_item_id,
        child_line.component_item_id,
        bt.depth + 1 AS depth,
        (bt.required_qty * child_line.quantity * (1 + (child_line.scrap_allowance_pct / 100.0)))::NUMERIC(18, 6) AS required_qty,
        bt.traversal_path || child_line.component_item_id
    FROM bom_tree bt
    INNER JOIN boms child_bom
        ON child_bom.parent_item_id = bt.component_item_id
       AND child_bom.is_active = TRUE
    INNER JOIN bom_lines child_line
        ON child_line.bom_id = child_bom.bom_id
    WHERE NOT child_line.component_item_id = ANY(bt.traversal_path)
),
leaf_components AS (
    SELECT
        bt.component_item_id AS raw_item_id,
        SUM(bt.required_qty) AS total_required_qty
    FROM bom_tree bt
    INNER JOIN items component_item
        ON component_item.item_id = bt.component_item_id
    LEFT JOIN boms next_bom
        ON next_bom.parent_item_id = bt.component_item_id
       AND next_bom.is_active = TRUE
    WHERE next_bom.bom_id IS NULL
       OR component_item.item_type = 'RAW_MATERIAL'
    GROUP BY bt.component_item_id
)
SELECT
    lc.raw_item_id,
    i.internal_sku,
    i.name,
    i.uom,
    lc.total_required_qty
FROM leaf_components lc
INNER JOIN items i
    ON i.item_id = lc.raw_item_id
ORDER BY i.internal_sku;
