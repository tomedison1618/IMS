CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'barcode_type_enum') THEN
        CREATE TYPE barcode_type_enum AS ENUM ('CODE128', 'QR', 'DATAMATRIX', 'EAN13', 'UPC', 'CODE39');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type_enum') THEN
        CREATE TYPE item_type_enum AS ENUM ('FINISHED_GOOD', 'RAW_MATERIAL', 'SUB_ASSEMBLY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type_enum') THEN
        CREATE TYPE location_type_enum AS ENUM ('RECEIVING', 'STORAGE', 'PICK_FACE', 'STAGING', 'PRODUCTION', 'SHIPPING', 'QUARANTINE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_transaction_type_enum') THEN
        CREATE TYPE inventory_transaction_type_enum AS ENUM (
            'RECEIPT',
            'PUTAWAY',
            'TRANSFER',
            'BACKFLUSH',
            'SCRAP_APPROVED',
            'PICK',
            'SHIP',
            'CYCLE_COUNT_APPROVED',
            'MANUAL_ADJUSTMENT'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status_enum') THEN
        CREATE TYPE po_status_enum AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'receipt_status_enum') THEN
        CREATE TYPE receipt_status_enum AS ENUM ('OPEN', 'POSTED', 'VOIDED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_order_status_enum') THEN
        CREATE TYPE production_order_status_enum AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BACKFLUSHED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'backflush_status_enum') THEN
        CREATE TYPE backflush_status_enum AS ENUM ('PENDING', 'POSTED', 'FAILED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scrap_request_status_enum') THEN
        CREATE TYPE scrap_request_status_enum AS ENUM ('PENDING_DUAL_SIGNOFF', 'APPROVED', 'REJECTED', 'POSTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_order_status_enum') THEN
        CREATE TYPE sales_order_status_enum AS ENUM ('DRAFT', 'ALLOCATED', 'PICKING', 'PICKED', 'EXPORTED_TO_3PL', 'SHIPPED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pick_status_enum') THEN
        CREATE TYPE pick_status_enum AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status_enum') THEN
        CREATE TYPE export_status_enum AS ENUM ('CREATED', 'DOWNLOADED', 'VOIDED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cycle_count_status_enum') THEN
        CREATE TYPE cycle_count_status_enum AS ENUM ('DRAFT', 'SUBMITTED', 'DISCREPANCY_RECORDED', 'APPROVED', 'REJECTED', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discrepancy_status_enum') THEN
        CREATE TYPE discrepancy_status_enum AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'APPLIED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
        CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'serial_status_enum') THEN
        CREATE TYPE serial_status_enum AS ENUM ('AVAILABLE', 'ALLOCATED', 'SHIPPED', 'CONSUMED', 'HOLD');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code TEXT NOT NULL UNIQUE CHECK (role_code = UPPER(role_code)),
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    contact_email CITEXT,
    contact_phone TEXT,
    lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    contact_email CITEXT,
    contact_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_sku TEXT NOT NULL UNIQUE,
    supplier_sku TEXT,
    barcode_value TEXT,
    barcode_type barcode_type_enum,
    name TEXT NOT NULL,
    description TEXT,
    item_type item_type_enum NOT NULL,
    uom TEXT NOT NULL,
    min_stock_level NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
    reorder_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (reorder_quantity >= 0),
    lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
    requires_lot_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    requires_serial_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    unit_cost NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    unit_cost_currency_code CHAR(3) NOT NULL DEFAULT 'USD' CHECK (unit_cost_currency_code IN ('USD', 'VND')),
    primary_supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_items_barcode_pair CHECK (
        (barcode_value IS NULL AND barcode_type IS NULL)
        OR (barcode_value IS NOT NULL AND barcode_type IS NOT NULL)
    )
);

ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_cost_currency_code CHAR(3);
UPDATE items
SET unit_cost_currency_code = 'USD'
WHERE unit_cost_currency_code IS NULL OR BTRIM(unit_cost_currency_code) = '';
ALTER TABLE items ALTER COLUMN unit_cost_currency_code SET DEFAULT 'USD';
ALTER TABLE items ALTER COLUMN unit_cost_currency_code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_items_unit_cost_currency_code'
    ) THEN
        ALTER TABLE items
        ADD CONSTRAINT ck_items_unit_cost_currency_code
        CHECK (unit_cost_currency_code IN ('USD', 'VND'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_code TEXT NOT NULL UNIQUE,
    location_name TEXT NOT NULL,
    description TEXT,
    location_type location_type_enum NOT NULL,
    parent_location_id UUID REFERENCES locations(location_id) ON DELETE RESTRICT,
    barcode_value TEXT UNIQUE,
    max_capacity NUMERIC(18, 4),
    capacity_uom TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_locations_capacity CHECK (max_capacity IS NULL OR max_capacity >= 0)
);

CREATE TABLE IF NOT EXISTS inventory_lots (
    lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    lot_number TEXT NOT NULL,
    supplier_lot_number TEXT,
    received_date DATE,
    expiration_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, lot_number)
);

CREATE TABLE IF NOT EXISTS inventory_serials (
    serial_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    serial_number TEXT NOT NULL UNIQUE,
    status serial_status_enum NOT NULL DEFAULT 'AVAILABLE',
    current_location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_balances (
    inventory_balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    lot_id UUID REFERENCES inventory_lots(lot_id) ON DELETE RESTRICT,
    serial_id UUID REFERENCES inventory_serials(serial_id) ON DELETE RESTRICT,
    quantity_on_hand NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    last_counted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_inventory_balances_reserved CHECK (quantity_reserved <= quantity_on_hand)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    inventory_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    location_id UUID REFERENCES locations(location_id) ON DELETE RESTRICT,
    lot_id UUID REFERENCES inventory_lots(lot_id) ON DELETE RESTRICT,
    serial_id UUID REFERENCES inventory_serials(serial_id) ON DELETE RESTRICT,
    transaction_type inventory_transaction_type_enum NOT NULL,
    quantity_delta NUMERIC(18, 4) NOT NULL CHECK (quantity_delta <> 0),
    reference_type TEXT NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reorder_alerts (
    reorder_alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    current_available_qty NUMERIC(18, 4) NOT NULL,
    min_stock_level NUMERIC(18, 4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS boms (
    bom_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    version_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (parent_item_id, version_name)
);

CREATE TABLE IF NOT EXISTS bom_lines (
    bom_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES boms(bom_id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL CHECK (line_number > 0),
    component_item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
    scrap_allowance_pct NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (scrap_allowance_pct >= 0 AND scrap_allowance_pct <= 100),
    UNIQUE (bom_id, line_number)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    purchase_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    status po_status_enum NOT NULL DEFAULT 'DRAFT',
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_receipt_date DATE,
    ordered_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    purchase_order_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL CHECK (line_number > 0),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    ordered_qty NUMERIC(18, 4) NOT NULL CHECK (ordered_qty > 0),
    received_qty NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
    unit_cost NUMERIC(14, 4) NOT NULL CHECK (unit_cost >= 0),
    UNIQUE (purchase_order_id, line_number)
);

CREATE TABLE IF NOT EXISTS receipts (
    receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE RESTRICT,
    status receipt_status_enum NOT NULL DEFAULT 'OPEN',
    received_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    posted_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS receipt_lines (
    receipt_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(receipt_id) ON DELETE CASCADE,
    purchase_order_line_id UUID REFERENCES purchase_order_lines(purchase_order_line_id) ON DELETE SET NULL,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    received_qty NUMERIC(18, 4) NOT NULL CHECK (received_qty > 0),
    receiving_location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    putaway_location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL,
    lot_id UUID REFERENCES inventory_lots(lot_id) ON DELETE SET NULL,
    manual_lot_number TEXT,
    generated_barcode_value TEXT,
    generated_barcode_type barcode_type_enum,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_receipt_lines_generated_barcode_pair CHECK (
        (generated_barcode_value IS NULL AND generated_barcode_type IS NULL)
        OR (generated_barcode_value IS NOT NULL AND generated_barcode_type IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS receipt_serials (
    receipt_serial_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_line_id UUID NOT NULL REFERENCES receipt_lines(receipt_line_id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL UNIQUE,
    inventory_serial_id UUID REFERENCES inventory_serials(serial_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS production_orders (
    production_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_number TEXT NOT NULL UNIQUE,
    external_reference TEXT UNIQUE,
    finished_good_item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    bom_id UUID REFERENCES boms(bom_id) ON DELETE SET NULL,
    quantity_planned NUMERIC(18, 4) NOT NULL CHECK (quantity_planned > 0),
    quantity_completed NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (quantity_completed >= 0),
    status production_order_status_enum NOT NULL DEFAULT 'PLANNED',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    completed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_completion_serials (
    production_completion_serial_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id UUID NOT NULL REFERENCES production_orders(production_order_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    serial_number TEXT NOT NULL UNIQUE,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backflush_runs (
    backflush_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id UUID NOT NULL UNIQUE REFERENCES production_orders(production_order_id) ON DELETE CASCADE,
    bom_id UUID NOT NULL REFERENCES boms(bom_id) ON DELETE RESTRICT,
    status backflush_status_enum NOT NULL DEFAULT 'PENDING',
    requested_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    executed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS backflush_run_lines (
    backflush_run_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backflush_run_id UUID NOT NULL REFERENCES backflush_runs(backflush_run_id) ON DELETE CASCADE,
    raw_item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    required_qty NUMERIC(18, 6) NOT NULL CHECK (required_qty > 0),
    issued_qty NUMERIC(18, 6) NOT NULL DEFAULT 0 CHECK (issued_qty >= 0),
    inventory_transaction_id UUID REFERENCES inventory_transactions(inventory_transaction_id) ON DELETE SET NULL,
    UNIQUE (backflush_run_id, raw_item_id)
);

CREATE TABLE IF NOT EXISTS scrap_requests (
    scrap_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id UUID NOT NULL REFERENCES production_orders(production_order_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL,
    quantity NUMERIC(18, 4) NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL,
    status scrap_request_status_enum NOT NULL DEFAULT 'PENDING_DUAL_SIGNOFF',
    requested_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    production_signed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    production_signed_at TIMESTAMPTZ,
    warehouse_signed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    warehouse_signed_at TIMESTAMPTZ,
    inventory_transaction_id UUID REFERENCES inventory_transactions(inventory_transaction_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_orders (
    sales_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    status sales_order_status_enum NOT NULL DEFAULT 'DRAFT',
    external_reference TEXT,
    requested_ship_date DATE,
    exported_to_3pl_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
    sales_order_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL CHECK (line_number > 0),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    ordered_qty NUMERIC(18, 4) NOT NULL CHECK (ordered_qty > 0),
    allocated_qty NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (allocated_qty >= 0),
    picked_qty NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (picked_qty >= 0),
    UNIQUE (sales_order_id, line_number)
);

CREATE TABLE IF NOT EXISTS picks (
    pick_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    status pick_status_enum NOT NULL DEFAULT 'OPEN',
    picker_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pick_lines (
    pick_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_id UUID NOT NULL REFERENCES picks(pick_id) ON DELETE CASCADE,
    sales_order_line_id UUID NOT NULL REFERENCES sales_order_lines(sales_order_line_id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    lot_id UUID REFERENCES inventory_lots(lot_id) ON DELETE SET NULL,
    serial_id UUID REFERENCES inventory_serials(serial_id) ON DELETE SET NULL,
    picked_qty NUMERIC(18, 4) NOT NULL CHECK (picked_qty > 0)
);

CREATE TABLE IF NOT EXISTS third_party_exports (
    third_party_export_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_number TEXT NOT NULL UNIQUE,
    status export_status_enum NOT NULL DEFAULT 'CREATED',
    created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    file_name TEXT,
    filters JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    downloaded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS third_party_export_orders (
    third_party_export_id UUID NOT NULL REFERENCES third_party_exports(third_party_export_id) ON DELETE CASCADE,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE RESTRICT,
    PRIMARY KEY (third_party_export_id, sales_order_id)
);

CREATE TABLE IF NOT EXISTS cycle_counts (
    cycle_count_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_count_number TEXT NOT NULL UNIQUE,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    status cycle_count_status_enum NOT NULL DEFAULT 'DRAFT',
    counted_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cycle_count_lines (
    cycle_count_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_count_id UUID NOT NULL REFERENCES cycle_counts(cycle_count_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    lot_id UUID REFERENCES inventory_lots(lot_id) ON DELETE SET NULL,
    serial_id UUID REFERENCES inventory_serials(serial_id) ON DELETE SET NULL,
    expected_qty NUMERIC(18, 4) NOT NULL CHECK (expected_qty >= 0),
    counted_qty NUMERIC(18, 4) NOT NULL CHECK (counted_qty >= 0),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS discrepancy_tickets (
    discrepancy_ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_count_line_id UUID NOT NULL UNIQUE REFERENCES cycle_count_lines(cycle_count_line_id) ON DELETE CASCADE,
    status discrepancy_status_enum NOT NULL DEFAULT 'OPEN',
    requested_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    reason TEXT,
    inventory_transaction_id UUID REFERENCES inventory_transactions(inventory_transaction_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_items_supplier_sku
    ON items (supplier_sku)
    WHERE supplier_sku IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_items_barcode_value
    ON items (barcode_value)
    WHERE barcode_value IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_items_item_type_active
    ON items (item_type, is_active);

CREATE INDEX IF NOT EXISTS ix_items_replenishment
    ON items (is_active, min_stock_level, reorder_quantity);

CREATE INDEX IF NOT EXISTS ix_locations_parent
    ON locations (parent_location_id);

CREATE INDEX IF NOT EXISTS ix_inventory_lots_item
    ON inventory_lots (item_id);

CREATE INDEX IF NOT EXISTS ix_inventory_serials_item
    ON inventory_serials (item_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_balances_natural
    ON inventory_balances (
        item_id,
        location_id,
        COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(serial_id, '00000000-0000-0000-0000-000000000000'::UUID)
    );

CREATE INDEX IF NOT EXISTS ix_inventory_balances_item_location
    ON inventory_balances (item_id, location_id);

CREATE INDEX IF NOT EXISTS ix_inventory_transactions_item_time
    ON inventory_transactions (item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_inventory_transactions_reference
    ON inventory_transactions (reference_type, reference_id);

CREATE INDEX IF NOT EXISTS ix_reorder_alerts_item_status
    ON reorder_alerts (item_id, status, generated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_boms_single_active_parent
    ON boms (parent_item_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS ix_bom_lines_bom
    ON bom_lines (bom_id, line_number);

CREATE INDEX IF NOT EXISTS ix_bom_lines_component
    ON bom_lines (component_item_id);

CREATE INDEX IF NOT EXISTS ix_user_roles_role
    ON user_roles (role_id);

CREATE INDEX IF NOT EXISTS ix_purchase_orders_status_supplier
    ON purchase_orders (status, supplier_id, expected_receipt_date);

CREATE INDEX IF NOT EXISTS ix_purchase_order_lines_item
    ON purchase_order_lines (item_id);

CREATE INDEX IF NOT EXISTS ix_receipts_po_status
    ON receipts (purchase_order_id, status, received_at DESC);

CREATE INDEX IF NOT EXISTS ix_receipt_lines_item
    ON receipt_lines (item_id);

CREATE INDEX IF NOT EXISTS ix_production_orders_status_item
    ON production_orders (status, finished_good_item_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS ix_backflush_runs_status
    ON backflush_runs (status, executed_at DESC);

CREATE INDEX IF NOT EXISTS ix_scrap_requests_status
    ON scrap_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_sales_orders_status_customer
    ON sales_orders (status, customer_id, requested_ship_date);

CREATE INDEX IF NOT EXISTS ix_sales_order_lines_item
    ON sales_order_lines (item_id);

CREATE INDEX IF NOT EXISTS ix_picks_sales_order_status
    ON picks (sales_order_id, status);

CREATE INDEX IF NOT EXISTS ix_pick_lines_item_location
    ON pick_lines (item_id, location_id);

CREATE INDEX IF NOT EXISTS ix_third_party_exports_status
    ON third_party_exports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_cycle_counts_status_location
    ON cycle_counts (status, location_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cycle_count_lines_natural
    ON cycle_count_lines (
        cycle_count_id,
        item_id,
        COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(serial_id, '00000000-0000-0000-0000-000000000000'::UUID)
    );

CREATE INDEX IF NOT EXISTS ix_discrepancy_tickets_status
    ON discrepancy_tickets (status, created_at DESC);
