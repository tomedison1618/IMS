-- Header-based auth is still in use, so these records exist mainly to satisfy
-- foreign keys for write operations and to give stable IDs for local testing.

INSERT INTO roles (role_id, role_code, role_name, description)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'ADMIN', 'Admin', 'Full system access'),
    ('20000000-0000-0000-0000-000000000002', 'FINANCE', 'Finance', 'Financial visibility and discrepancy approval'),
    ('20000000-0000-0000-0000-000000000003', 'OPERATIONS', 'Operations', 'Combined procurement, warehouse, and production operations')
ON CONFLICT (role_id) DO UPDATE
SET
    role_code = EXCLUDED.role_code,
    role_name = EXCLUDED.role_name,
    description = EXCLUDED.description;

INSERT INTO users (user_id, email, password_hash, first_name, last_name, status)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'admin@ims.local', 'TEMP_NO_AUTH_YET', 'System', 'Admin', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000002', 'finance@ims.local', 'TEMP_NO_AUTH_YET', 'Finance', 'Lead', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000003', 'operations@ims.local', 'TEMP_NO_AUTH_YET', 'Operations', 'Lead', 'ACTIVE')
ON CONFLICT (user_id) DO UPDATE
SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    status = EXCLUDED.status;

INSERT INTO user_roles (user_role_id, user_id, role_id, assigned_at)
VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', NOW()),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', NOW()),
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', NOW())
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO suppliers (
    supplier_id,
    supplier_code,
    supplier_name,
    contact_email,
    contact_phone,
    lead_time_days,
    is_active
)
VALUES
    ('40000000-0000-0000-0000-000000000001', 'SUP-DEMO', 'Demo Electronics Supplier', 'purchasing@demo-supplier.local', '555-0100', 7, TRUE)
ON CONFLICT (supplier_code) DO UPDATE
SET
    supplier_name = EXCLUDED.supplier_name,
    contact_email = EXCLUDED.contact_email,
    contact_phone = EXCLUDED.contact_phone,
    lead_time_days = EXCLUDED.lead_time_days,
    is_active = EXCLUDED.is_active;

INSERT INTO locations (
    location_id,
    location_code,
    location_name,
    description,
    location_type,
    barcode_value,
    max_capacity,
    capacity_uom,
    sort_order,
    is_active
)
VALUES
    ('50000000-0000-0000-0000-000000000001', 'RCV-01', 'Receiving Dock 01', 'Default receiving location for inbound goods', 'RECEIVING', 'LOC-RCV-01', NULL, NULL, 10, TRUE),
    ('50000000-0000-0000-0000-000000000002', 'STOR-01', 'Main Storage 01', 'Default storage rack for putaway suggestions', 'STORAGE', 'LOC-STOR-01', 10000, 'EA', 20, TRUE)
ON CONFLICT (location_code) DO UPDATE
SET
    location_name = EXCLUDED.location_name,
    description = EXCLUDED.description,
    location_type = EXCLUDED.location_type,
    barcode_value = EXCLUDED.barcode_value,
    max_capacity = EXCLUDED.max_capacity,
    capacity_uom = EXCLUDED.capacity_uom,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;
