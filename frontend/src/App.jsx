import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createApiClient } from './api.js';

const SEEDED_PERSONAS = [
  { label: 'Admin', userId: '10000000-0000-0000-0000-000000000001', name: 'System Admin', roles: ['ADMIN'] },
  { label: 'CFO', userId: '10000000-0000-0000-0000-000000000002', name: 'Finance', roles: ['CFO'] },
  { label: 'Procurement', userId: '10000000-0000-0000-0000-000000000003', name: 'Procurement', roles: ['PROCUREMENT_MANAGER'] },
  { label: 'Warehouse', userId: '10000000-0000-0000-0000-000000000004', name: 'Warehouse', roles: ['WAREHOUSE'] },
  { label: 'Production', userId: '10000000-0000-0000-0000-000000000005', name: 'Production', roles: ['PRODUCTION_MANAGER'] }
];

const DEFAULT_SESSION = { userId: SEEDED_PERSONAS[0].userId, role: SEEDED_PERSONAS[0].roles[0] };

const DEFAULT_FORMS = {
  supplier: { supplierCode: '', supplierName: '', contactEmail: '', contactPhone: '', leadTimeDays: '14' },
  customer: { customerCode: '', customerName: '', contactEmail: '', contactPhone: '' },
  item: { internalSku: '', name: '', itemType: 'RAW_MATERIAL', uom: 'EA', minStockLevel: '0', reorderQuantity: '0', leadTimeDays: '0', unitCost: '0' },
  purchaseOrder: { supplierId: '', expectedReceiptDate: '', notes: '' },
  purchaseOrderLine: { itemId: '', orderedQty: '100', unitCost: '0' },
  receipt: { purchaseOrderId: '', notes: '' },
  receiptLine: { receiptId: '', purchaseOrderLineId: '', receivedQty: '100', receivingLocationId: '', putawayLocationId: '', manualLotNumber: '' },
  salesOrder: { customerId: '', externalReference: '', requestedShipDate: '', itemId: '', orderedQty: '10' },
  cycleCount: { locationId: '', notes: '' },
  cycleCountLine: { cycleCountId: '', itemId: '', countedQty: '0', lotId: '' },
  bom: { parentItemId: '', versionName: 'v1.0', notes: '' },
  bomLine: { bomId: '', componentItemId: '', quantity: '1', scrapAllowancePct: '0' },
  productionOrder: { finishedGoodItemId: '', bomId: '', quantityPlanned: '5', externalReference: '' },
  completion: { productionOrderId: '', quantityCompleted: '5', locationId: '', serialNumbers: '' },
  scrap: { productionOrderId: '', itemId: '', locationId: '', quantity: '1', reason: 'Broken component during assembly' }
};

const NAV = ['overview', 'master', 'inbound', 'fulfillment', 'counts', 'manufacturing'];

function loadStoredSession() {
  try {
    const raw = window.localStorage.getItem('ims-front-session');
    return raw ? JSON.parse(raw) : DEFAULT_SESSION;
  } catch {
    return DEFAULT_SESSION;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value));
}

function Badge({ value }) {
  const safe = String(value ?? 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <span className={`badge badge--${safe}`}>{value}</span>;
}

function Table({ columns, rows, rowKey, onPick, selectedId, emptyMessage = 'No records yet.' }) {
  if (!rows.length) return <div className="empty-state">{emptyMessage}</div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              className={selectedId === row[rowKey] ? 'is-selected' : ''}
              onClick={onPick ? () => onPick(row) : undefined}
            >
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(loadStoredSession);
  const [section, setSection] = useState('overview');
  const [forms, setForms] = useState(DEFAULT_FORMS);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Ready.');
  const [selected, setSelected] = useState({});
  const [inventoryDetail, setInventoryDetail] = useState(null);
  const [backflushPreview, setBackflushPreview] = useState([]);
  const [picksByOrder, setPicksByOrder] = useState({});
  const [itemSearch, setItemSearch] = useState('');
  const deferredItemSearch = useDeferredValue(itemSearch);
  const [data, setData] = useState({
    me: null,
    users: [],
    suppliers: [],
    customers: [],
    items: [],
    locations: [],
    inventory: [],
    purchaseOrders: [],
    receipts: [],
    salesOrders: [],
    cycleCounts: [],
    discrepancyTickets: [],
    boms: [],
    productionOrders: [],
    scrapRequests: []
  });
  const api = useMemo(() => createApiClient(session), [session]);
  const financeVisible = ['ADMIN', 'CFO', 'PROCUREMENT_MANAGER'].includes(session.role);

  useEffect(() => {
    window.localStorage.setItem('ims-front-session', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy('Refreshing workspace');
      try {
        const safe = async (path, fallback) => {
          try {
            return await api.request(path);
          } catch (error) {
            if (error.status === 403 || error.status === 404) return fallback;
            throw error;
          }
        };

        const [me, users, suppliers, customers, items, locations, inventory, purchaseOrders, receipts, salesOrders, cycleCounts, discrepancyTickets, boms, productionOrders, scrapRequests] = await Promise.all([
          safe('/auth/me', { data: null }),
          safe('/users', { data: [] }),
          safe('/suppliers', { data: [] }),
          safe('/customers', { data: [] }),
          safe('/items?limit=200', { data: [] }),
          safe('/locations?limit=200', { data: [] }),
          safe('/inventory/balances?limit=200', { data: [] }),
          safe('/purchase-orders?limit=50', { data: [] }),
          safe('/receipts?limit=50', { data: [] }),
          safe('/sales-orders?limit=50', { data: [] }),
          safe('/cycle-counts?limit=50', { data: [] }),
          safe('/cycle-counts/discrepancy-tickets?limit=50', { data: [] }),
          safe('/boms?limit=50', { data: [] }),
          safe('/manufacturing/production-orders?limit=50', { data: [] }),
          safe('/manufacturing/scrap-requests?limit=50', { data: [] })
        ]);

        if (cancelled) return;
        setData({
          me: me.data,
          users: users.data,
          suppliers: suppliers.data,
          customers: customers.data,
          items: items.data,
          locations: locations.data,
          inventory: inventory.data,
          purchaseOrders: purchaseOrders.data,
          receipts: receipts.data,
          salesOrders: salesOrders.data,
          cycleCounts: cycleCounts.data,
          discrepancyTickets: discrepancyTickets.data,
          boms: boms.data,
          productionOrders: productionOrders.data,
          scrapRequests: scrapRequests.data
        });
        setMessage(`Workspace refreshed for ${session.role}.`);
      } catch (error) {
        if (!cancelled) setMessage(error.message);
      } finally {
        if (!cancelled) setBusy('');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api, session.role, session.userId]);

  function updateForm(group, key, value) {
    setForms((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  }

  async function run(label, callback) {
    setBusy(label);
    try {
      const result = await callback();
      setMessage(`${label} completed.`);
      setSession((current) => ({ ...current }));
      return result;
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setBusy('');
    }
  }

  const personas = useMemo(() => {
    const loaded = data.users.map((user) => ({
      label: `${user.firstName} ${user.lastName}`,
      userId: user.userId,
      name: `${user.firstName} ${user.lastName}`,
      roles: user.roles.map((role) => role.roleCode)
    }));
    const byId = new Map();
    [...SEEDED_PERSONAS, ...loaded].forEach((persona) => {
      if (!byId.has(persona.userId)) byId.set(persona.userId, persona);
    });
    return [...byId.values()];
  }, [data.users]);

  const currentPersona = personas.find((persona) => persona.userId === session.userId) ?? SEEDED_PERSONAS[0];
  const filteredItems = useMemo(() => {
    const query = deferredItemSearch.trim().toLowerCase();
    if (!query) return data.items;
    return data.items.filter((item) => item.internalSku.toLowerCase().includes(query) || item.name.toLowerCase().includes(query));
  }, [data.items, deferredItemSearch]);

  async function refreshInventory(itemId) {
    if (!itemId) return;
    const response = await api.request(`/items/${itemId}/inventory`);
    setInventoryDetail(response.data);
  }

  async function createSupplier() {
    await run('Supplier creation', () =>
      api.request('/suppliers', {
        method: 'POST',
        body: {
          supplierCode: forms.supplier.supplierCode,
          supplierName: forms.supplier.supplierName,
          contactEmail: forms.supplier.contactEmail || null,
          contactPhone: forms.supplier.contactPhone || null,
          leadTimeDays: Number(forms.supplier.leadTimeDays || 0)
        }
      })
    );
  }

  async function createCustomer() {
    await run('Customer creation', () =>
      api.request('/customers', {
        method: 'POST',
        body: {
          customerCode: forms.customer.customerCode,
          customerName: forms.customer.customerName,
          contactEmail: forms.customer.contactEmail || null,
          contactPhone: forms.customer.contactPhone || null
        }
      })
    );
  }

  async function createItem() {
    const payload = {
      internalSku: forms.item.internalSku,
      name: forms.item.name,
      itemType: forms.item.itemType,
      uom: forms.item.uom,
      minStockLevel: Number(forms.item.minStockLevel || 0),
      reorderQuantity: Number(forms.item.reorderQuantity || 0),
      leadTimeDays: Number(forms.item.leadTimeDays || 0)
    };
    if (financeVisible) payload.unitCost = Number(forms.item.unitCost || 0);

    const response = await run('Item creation', () =>
      api.request('/items', { method: 'POST', body: payload })
    );
    setSelected((current) => ({ ...current, itemId: response.data.itemId }));
  }

  async function createPurchaseOrder() {
    const response = await run('Purchase order creation', () =>
      api.request('/purchase-orders', {
        method: 'POST',
        body: {
          supplierId: forms.purchaseOrder.supplierId,
          expectedReceiptDate: forms.purchaseOrder.expectedReceiptDate || null,
          notes: forms.purchaseOrder.notes || null
        }
      })
    );
    setSelected((current) => ({ ...current, purchaseOrderId: response.data.purchaseOrderId }));
  }

  async function addPurchaseOrderLine() {
    const purchaseOrderId = selected.purchaseOrderId;
    const response = await run('Purchase order line add', () =>
      api.request(`/purchase-orders/${purchaseOrderId}/lines`, {
        method: 'POST',
        body: {
          itemId: forms.purchaseOrderLine.itemId,
          orderedQty: Number(forms.purchaseOrderLine.orderedQty),
          unitCost: Number(forms.purchaseOrderLine.unitCost || 0)
        }
      })
    );
    const line = response.data.lines.at(-1);
    updateForm('receiptLine', 'purchaseOrderLineId', line?.purchaseOrderLineId ?? '');
  }

  async function approvePurchaseOrder() {
    await run('Purchase order approval', () => api.request(`/purchase-orders/${selected.purchaseOrderId}/approve`, { method: 'POST' }));
  }

  async function createReceipt() {
    const response = await run('Receipt creation', () =>
      api.request('/receipts', {
        method: 'POST',
        body: {
          purchaseOrderId: selected.purchaseOrderId || forms.receipt.purchaseOrderId,
          notes: forms.receipt.notes || null
        }
      })
    );
    setSelected((current) => ({ ...current, receiptId: response.data.receiptId }));
  }

  async function addReceiptLine() {
    await run('Receipt line add', () =>
      api.request(`/receipts/${selected.receiptId}/lines`, {
        method: 'POST',
        body: {
          purchaseOrderLineId: forms.receiptLine.purchaseOrderLineId,
          receivedQty: Number(forms.receiptLine.receivedQty),
          receivingLocationId: forms.receiptLine.receivingLocationId,
          putawayLocationId: forms.receiptLine.putawayLocationId || null,
          manualLotNumber: forms.receiptLine.manualLotNumber || null
        }
      })
    );
  }

  async function postReceipt() {
    await run('Receipt posting', () => api.request(`/receipts/${selected.receiptId}/post`, { method: 'POST' }));
  }

  async function createSalesOrder() {
    const response = await run('Sales order creation', () =>
      api.request('/sales-orders', {
        method: 'POST',
        body: {
          customerId: forms.salesOrder.customerId,
          externalReference: forms.salesOrder.externalReference || null,
          requestedShipDate: forms.salesOrder.requestedShipDate || null,
          lines: [{ itemId: forms.salesOrder.itemId, orderedQty: Number(forms.salesOrder.orderedQty) }]
        }
      })
    );
    setSelected((current) => ({ ...current, salesOrderId: response.data.salesOrderId }));
  }

  async function allocateSalesOrder() {
    await run('Sales order allocation', () => api.request(`/sales-orders/${selected.salesOrderId}/allocate`, { method: 'POST' }));
  }

  async function createPick() {
    const response = await run('Pick creation', () => api.request(`/fulfillment/sales-orders/${selected.salesOrderId}/picks`, { method: 'POST' }));
    setPicksByOrder((current) => ({ ...current, [selected.salesOrderId]: response.data.pick }));
  }

  async function confirmPick() {
    const pick = picksByOrder[selected.salesOrderId];
    if (!pick) throw new Error('Create a pick first.');
    await run('Pick confirmation', () => api.request(`/fulfillment/sales-orders/${selected.salesOrderId}/picks/${pick.pickId}/confirm`, { method: 'POST' }));
  }

  async function createCycleCount() {
    const response = await run('Cycle count creation', () =>
      api.request('/cycle-counts', {
        method: 'POST',
        body: {
          locationId: forms.cycleCount.locationId,
          notes: forms.cycleCount.notes || null
        }
      })
    );
    setSelected((current) => ({ ...current, cycleCountId: response.data.cycleCountId }));
  }

  async function addCycleCountLine() {
    await run('Cycle count line add', () =>
      api.request(`/cycle-counts/${selected.cycleCountId}/lines`, {
        method: 'POST',
        body: {
          itemId: forms.cycleCountLine.itemId,
          lotId: forms.cycleCountLine.lotId || null,
          countedQty: Number(forms.cycleCountLine.countedQty)
        }
      })
    );
  }

  async function submitCycleCount() {
    await run('Cycle count submit', () => api.request(`/cycle-counts/${selected.cycleCountId}/submit`, { method: 'POST' }));
  }

  async function approveTicket() {
    await run('Discrepancy approval', () => api.request(`/cycle-counts/discrepancy-tickets/${selected.ticketId}/approve`, { method: 'POST' }));
  }

  async function createBom() {
    const response = await run('BoM creation', () =>
      api.request('/boms', {
        method: 'POST',
        body: {
          parentItemId: forms.bom.parentItemId,
          versionName: forms.bom.versionName,
          notes: forms.bom.notes || null
        }
      })
    );
    setSelected((current) => ({ ...current, bomId: response.data.bomId }));
  }

  async function addBomLine() {
    await run('BoM line add', () =>
      api.request(`/boms/${selected.bomId}/lines`, {
        method: 'POST',
        body: {
          componentItemId: forms.bomLine.componentItemId,
          quantity: Number(forms.bomLine.quantity),
          scrapAllowancePct: Number(forms.bomLine.scrapAllowancePct || 0)
        }
      })
    );
  }

  async function activateBom() {
    await run('BoM activation', () => api.request(`/boms/${selected.bomId}/activate`, { method: 'POST' }));
  }

  async function createProductionOrder() {
    const response = await run('Production order creation', () =>
      api.request('/manufacturing/production-orders', {
        method: 'POST',
        body: {
          finishedGoodItemId: forms.productionOrder.finishedGoodItemId,
          bomId: forms.productionOrder.bomId || selected.bomId || null,
          quantityPlanned: Number(forms.productionOrder.quantityPlanned),
          externalReference: forms.productionOrder.externalReference || null
        }
      })
    );
    setSelected((current) => ({ ...current, productionOrderId: response.data.productionOrderId }));
  }

  async function recordCompletion() {
    const serialNumbers = forms.completion.serialNumbers
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    await run('Production completion', () =>
      api.request(`/manufacturing/production-orders/${selected.productionOrderId}/completions`, {
        method: 'POST',
        body: {
          quantityCompleted: Number(forms.completion.quantityCompleted),
          locationId: forms.completion.locationId,
          serialNumbers
        }
      })
    );
  }

  async function previewBackflush() {
    const response = await run('Backflush preview', () => api.request(`/manufacturing/production-orders/${selected.productionOrderId}/backflush-preview`));
    setBackflushPreview(response.data);
  }

  async function runBackflush() {
    await run('Backflush execution', () => api.request(`/manufacturing/production-orders/${selected.productionOrderId}/backflush`, { method: 'POST' }));
  }

  async function createScrapRequest() {
    const response = await run('Scrap request creation', () =>
      api.request('/manufacturing/scrap-requests', {
        method: 'POST',
        body: {
          productionOrderId: selected.productionOrderId || forms.scrap.productionOrderId,
          itemId: forms.scrap.itemId,
          locationId: forms.scrap.locationId || null,
          quantity: Number(forms.scrap.quantity),
          reason: forms.scrap.reason
        }
      })
    );
    setSelected((current) => ({ ...current, scrapRequestId: response.data.scrapRequestId }));
  }

  async function signProductionScrap() {
    await run('Production scrap signoff', () => api.request(`/manufacturing/scrap-requests/${selected.scrapRequestId}/sign-production`, { method: 'POST' }));
  }

  async function signWarehouseScrap() {
    await run('Warehouse scrap signoff', () => api.request(`/manufacturing/scrap-requests/${selected.scrapRequestId}/sign-warehouse`, { method: 'POST' }));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__eyebrow">Electronics IMS</span>
          <h1>Operations Workbench</h1>
          <p>Scanner-friendly UI for receiving, inventory control, fulfillment, and production.</p>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <button key={item} type="button" className={section === item ? 'nav__button nav__button--active' : 'nav__button'} onClick={() => setSection(item)}>
              {item}
            </button>
          ))}
        </nav>

        <div className="session-card">
          <label className="field">
            <span>Persona</span>
            <select
              value={session.userId}
              onChange={(event) => {
                const next = personas.find((persona) => persona.userId === event.target.value) ?? SEEDED_PERSONAS[0];
                setSession({ userId: next.userId, role: next.roles[0] ?? DEFAULT_SESSION.role });
              }}
            >
              {personas.map((persona) => (
                <option key={persona.userId} value={persona.userId}>
                  {persona.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Request role</span>
            <select value={session.role} onChange={(event) => setSession((current) => ({ ...current, role: event.target.value }))}>
              {(currentPersona.roles.length ? currentPersona.roles : [session.role]).map((roleCode) => (
                <option key={roleCode} value={roleCode}>
                  {roleCode}
                </option>
              ))}
            </select>
          </label>

          <div className="session-card__meta">
            <span>{currentPersona.name}</span>
            <small>{session.userId}</small>
          </div>

          <div className="session-card__chips">
            {(data.me?.roles ?? []).map((role) => (
              <span key={role.roleId ?? role.roleCode} className="chip">
                {role.roleCode}
              </span>
            ))}
          </div>

          <button type="button" className="button button--ghost button--block" onClick={() => setSession((current) => ({ ...current }))}>
            Refresh workspace
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="hero">
          <div>
            <span className="hero__eyebrow">Live warehouse + production console</span>
            <h2>Single-warehouse IMS frontend</h2>
            <p>The UI uses the current REST API directly and keeps the backend RBAC visible through persona switching.</p>
          </div>

          <div className="toast">
            <strong>{busy || 'Status'}</strong>
            <span>{busy ? `Working on ${busy.toLowerCase()}...` : message}</span>
          </div>
        </header>

        {section === 'overview' ? (
          <div className="stack">
            <section className="metrics-grid">
              <div className="metric"><span>Open POs</span><strong>{data.purchaseOrders.length}</strong><small>Purchasing pipeline</small></div>
              <div className="metric metric--accent"><span>Receipts</span><strong>{data.receipts.length}</strong><small>Inbound activity</small></div>
              <div className="metric"><span>Sales Orders</span><strong>{data.salesOrders.length}</strong><small>Outbound demand</small></div>
              <div className="metric metric--warning"><span>Discrepancies</span><strong>{data.discrepancyTickets.length}</strong><small>Approval queue</small></div>
              <div className="metric"><span>Production Orders</span><strong>{data.productionOrders.length}</strong><small>Manufacturing queue</small></div>
              <div className="metric metric--danger"><span>Zero Available</span><strong>{data.inventory.filter((row) => row.quantityAvailable <= 0).length}</strong><small>At-risk balances</small></div>
            </section>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>Live Inventory</h2>
                  <p>Visible balances in the current warehouse state.</p>
                </div>
              </div>
              <Table
                rowKey="inventoryBalanceId"
                rows={data.inventory.slice(0, 12)}
                columns={[
                  { key: 'internalSku', label: 'SKU' },
                  { key: 'locationCode', label: 'Location' },
                  { key: 'lotNumber', label: 'Lot' },
                  { key: 'quantityOnHand', label: 'On hand', render: (row) => formatNumber(row.quantityOnHand) },
                  { key: 'quantityAvailable', label: 'Available', render: (row) => formatNumber(row.quantityAvailable) }
                ]}
              />
            </div>
          </div>
        ) : null}

        {section === 'master' ? (
          <div className="stack">
            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Create Item</h2>
                    <p>Raw materials, sub-assemblies, or finished goods.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field"><span>Internal SKU</span><input value={forms.item.internalSku} onChange={(event) => updateForm('item', 'internalSku', event.target.value)} /></label>
                  <label className="field"><span>Name</span><input value={forms.item.name} onChange={(event) => updateForm('item', 'name', event.target.value)} /></label>
                  <label className="field">
                    <span>Item Type</span>
                    <select value={forms.item.itemType} onChange={(event) => updateForm('item', 'itemType', event.target.value)}>
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="SUB_ASSEMBLY">Sub-Assembly</option>
                      <option value="FINISHED_GOOD">Finished Good</option>
                    </select>
                  </label>
                  <label className="field"><span>UoM</span><input value={forms.item.uom} onChange={(event) => updateForm('item', 'uom', event.target.value)} /></label>
                  <label className="field"><span>Min stock</span><input value={forms.item.minStockLevel} onChange={(event) => updateForm('item', 'minStockLevel', event.target.value)} /></label>
                  <label className="field"><span>Reorder qty</span><input value={forms.item.reorderQuantity} onChange={(event) => updateForm('item', 'reorderQuantity', event.target.value)} /></label>
                  <label className="field"><span>Lead time</span><input value={forms.item.leadTimeDays} onChange={(event) => updateForm('item', 'leadTimeDays', event.target.value)} /></label>
                  <label className="field"><span>Unit cost</span><input value={financeVisible ? forms.item.unitCost : 'Restricted'} disabled={!financeVisible} onChange={(event) => updateForm('item', 'unitCost', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createItem}>Create item</button>
                </div>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Partners</h2>
                    <p>Quick-create suppliers and customers for testing.</p>
                  </div>
                </div>
                <div className="subpanel">
                  <h3>Supplier</h3>
                  <div className="form-grid">
                    <label className="field"><span>Code</span><input value={forms.supplier.supplierCode} onChange={(event) => updateForm('supplier', 'supplierCode', event.target.value)} /></label>
                    <label className="field"><span>Name</span><input value={forms.supplier.supplierName} onChange={(event) => updateForm('supplier', 'supplierName', event.target.value)} /></label>
                  </div>
                  <button type="button" className="button button--secondary" onClick={createSupplier}>Create supplier</button>
                </div>
                <div className="subpanel">
                  <h3>Customer</h3>
                  <div className="form-grid">
                    <label className="field"><span>Code</span><input value={forms.customer.customerCode} onChange={(event) => updateForm('customer', 'customerCode', event.target.value)} /></label>
                    <label className="field"><span>Name</span><input value={forms.customer.customerName} onChange={(event) => updateForm('customer', 'customerName', event.target.value)} /></label>
                  </div>
                  <button type="button" className="button button--secondary" onClick={createCustomer}>Create customer</button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>Items and Inventory</h2>
                  <p>Inspect stock and generate internal barcodes.</p>
                </div>
                <input className="search" placeholder="Search SKU or name" value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} />
              </div>
              <Table
                rowKey="itemId"
                rows={filteredItems}
                selectedId={selected.itemId}
                onPick={(row) => {
                  setSelected((current) => ({ ...current, itemId: row.itemId }));
                  refreshInventory(row.itemId).catch(() => {});
                }}
                columns={[
                  { key: 'internalSku', label: 'SKU' },
                  { key: 'name', label: 'Name' },
                  { key: 'itemType', label: 'Type' },
                  { key: 'barcodeValue', label: 'Barcode' },
                  { key: 'unitCost', label: 'Unit cost', render: (row) => (row.unitCost === undefined ? 'Restricted' : `$${formatNumber(row.unitCost)}`) }
                ]}
              />
              {inventoryDetail ? (
                <div className="detail-card">
                  <div className="button-row">
                    <button type="button" className="button button--secondary" onClick={() => refreshInventory(selected.itemId)}>Refresh inventory</button>
                    <button type="button" className="button button--ghost" onClick={() => run('Barcode generation', () => api.request(`/items/${selected.itemId}/internal-barcode`, { method: 'POST' }))}>Generate barcode</button>
                  </div>
                  <div className="inventory-summary">
                    <div className="metric"><span>On hand</span><strong>{formatNumber(inventoryDetail.totals.quantityOnHand)}</strong></div>
                    <div className="metric"><span>Reserved</span><strong>{formatNumber(inventoryDetail.totals.quantityReserved)}</strong></div>
                    <div className="metric metric--accent"><span>Available</span><strong>{formatNumber(inventoryDetail.totals.quantityAvailable)}</strong></div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {section === 'inbound' ? (
          <div className="stack">
            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Purchase Orders</h2>
                    <p>Create, line, and approve procurement orders.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Supplier</span>
                    <select value={forms.purchaseOrder.supplierId} onChange={(event) => updateForm('purchaseOrder', 'supplierId', event.target.value)}>
                      <option value="">Select supplier</option>
                      {data.suppliers.map((supplier) => <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.supplierCode} - {supplier.supplierName}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Expected receipt</span><input type="date" value={forms.purchaseOrder.expectedReceiptDate} onChange={(event) => updateForm('purchaseOrder', 'expectedReceiptDate', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createPurchaseOrder}>Create PO</button>
                  <button type="button" className="button button--secondary" onClick={approvePurchaseOrder}>Approve selected PO</button>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Item</span>
                    <select value={forms.purchaseOrderLine.itemId} onChange={(event) => updateForm('purchaseOrderLine', 'itemId', event.target.value)}>
                      <option value="">Select item</option>
                      {data.items.map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Qty</span><input value={forms.purchaseOrderLine.orderedQty} onChange={(event) => updateForm('purchaseOrderLine', 'orderedQty', event.target.value)} /></label>
                </div>
                <button type="button" className="button button--ghost" onClick={addPurchaseOrderLine}>Add PO line</button>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Receiving</h2>
                    <p>Capture lot numbers and post stock into storage.</p>
                  </div>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createReceipt}>Create receipt</button>
                  <button type="button" className="button button--secondary" onClick={postReceipt}>Post selected receipt</button>
                </div>
                <div className="form-grid">
                  <label className="field"><span>PO line UUID</span><input value={forms.receiptLine.purchaseOrderLineId} onChange={(event) => updateForm('receiptLine', 'purchaseOrderLineId', event.target.value)} /></label>
                  <label className="field"><span>Received qty</span><input value={forms.receiptLine.receivedQty} onChange={(event) => updateForm('receiptLine', 'receivedQty', event.target.value)} /></label>
                  <label className="field">
                    <span>Receiving bin</span>
                    <select value={forms.receiptLine.receivingLocationId} onChange={(event) => updateForm('receiptLine', 'receivingLocationId', event.target.value)}>
                      <option value="">Select location</option>
                      {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Putaway bin</span>
                    <select value={forms.receiptLine.putawayLocationId} onChange={(event) => updateForm('receiptLine', 'putawayLocationId', event.target.value)}>
                      <option value="">Select location</option>
                      {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Manual lot</span><input value={forms.receiptLine.manualLotNumber} onChange={(event) => updateForm('receiptLine', 'manualLotNumber', event.target.value)} /></label>
                </div>
                <button type="button" className="button button--ghost" onClick={addReceiptLine}>Add receipt line</button>
              </div>
            </div>

            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Recent Purchase Orders</h2>
                    <p>Select one to set the receipt context.</p>
                  </div>
                </div>
                <Table
                  rowKey="purchaseOrderId"
                  rows={data.purchaseOrders}
                  selectedId={selected.purchaseOrderId}
                  onPick={(row) => setSelected((current) => ({ ...current, purchaseOrderId: row.purchaseOrderId }))}
                  columns={[
                    { key: 'poNumber', label: 'PO' },
                    { key: 'supplierName', label: 'Supplier' },
                    { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
                    { key: 'expectedReceiptDate', label: 'Expected', render: (row) => formatDate(row.expectedReceiptDate) }
                  ]}
                />
              </div>
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Recent Receipts</h2>
                    <p>Posted receipts create lot-level inventory balances.</p>
                  </div>
                </div>
                <Table
                  rowKey="receiptId"
                  rows={data.receipts}
                  selectedId={selected.receiptId}
                  onPick={(row) => setSelected((current) => ({ ...current, receiptId: row.receiptId }))}
                  columns={[
                    { key: 'receiptNumber', label: 'Receipt' },
                    { key: 'poNumber', label: 'PO' },
                    { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
                    { key: 'postedAt', label: 'Posted', render: (row) => formatDate(row.postedAt) }
                  ]}
                />
              </div>
            </div>
          </div>
        ) : null}
        {section === 'fulfillment' ? (
          <div className="stack">
            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Create Sales Order</h2>
                    <p>Outbound picking remains one order at a time.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Customer</span>
                    <select value={forms.salesOrder.customerId} onChange={(event) => updateForm('salesOrder', 'customerId', event.target.value)}>
                      <option value="">Select customer</option>
                      {data.customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.customerCode} - {customer.customerName}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>External reference</span><input value={forms.salesOrder.externalReference} onChange={(event) => updateForm('salesOrder', 'externalReference', event.target.value)} /></label>
                  <label className="field"><span>Requested ship date</span><input type="date" value={forms.salesOrder.requestedShipDate} onChange={(event) => updateForm('salesOrder', 'requestedShipDate', event.target.value)} /></label>
                  <label className="field">
                    <span>Item</span>
                    <select value={forms.salesOrder.itemId} onChange={(event) => updateForm('salesOrder', 'itemId', event.target.value)}>
                      <option value="">Select item</option>
                      {data.items.map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Qty</span><input value={forms.salesOrder.orderedQty} onChange={(event) => updateForm('salesOrder', 'orderedQty', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createSalesOrder}>Create sales order</button>
                  <button type="button" className="button button--secondary" onClick={allocateSalesOrder}>Allocate</button>
                  <button type="button" className="button button--ghost" onClick={createPick}>Create pick</button>
                  <button type="button" className="button button--ghost" onClick={confirmPick}>Confirm pick</button>
                </div>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Picker Context</h2>
                    <p>Use the Warehouse persona to stay aligned with permissions.</p>
                  </div>
                </div>
                <div className="detail-card">
                  <p className="inline-note">Current request role: <strong>{session.role}</strong></p>
                  {selected.salesOrderId && picksByOrder[selected.salesOrderId] ? (
                    <div className="pick-summary">
                      <div><span>Current pick</span><strong>{picksByOrder[selected.salesOrderId].pickId}</strong></div>
                      <Badge value={picksByOrder[selected.salesOrderId].status} />
                    </div>
                  ) : (
                    <div className="empty-state">Create a pick to track it here.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>Sales Orders</h2>
                  <p>Select an order to allocate and pick it.</p>
                </div>
              </div>
              <Table
                rowKey="salesOrderId"
                rows={data.salesOrders}
                selectedId={selected.salesOrderId}
                onPick={(row) => setSelected((current) => ({ ...current, salesOrderId: row.salesOrderId }))}
                columns={[
                  { key: 'salesOrderNumber', label: 'SO' },
                  { key: 'customerName', label: 'Customer' },
                  { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
                  { key: 'requestedShipDate', label: 'Ship', render: (row) => formatDate(row.requestedShipDate) }
                ]}
              />
            </div>
          </div>
        ) : null}
        {section === 'counts' ? (
          <div className="stack">
            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Cycle Count Entry</h2>
                    <p>Counts never auto-adjust. Mismatches become approval tickets.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Location</span>
                    <select value={forms.cycleCount.locationId} onChange={(event) => updateForm('cycleCount', 'locationId', event.target.value)}>
                      <option value="">Select location</option>
                      {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode} - {location.locationName}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Notes</span><input value={forms.cycleCount.notes} onChange={(event) => updateForm('cycleCount', 'notes', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createCycleCount}>Create count</button>
                  <button type="button" className="button button--secondary" onClick={submitCycleCount}>Submit selected count</button>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Item</span>
                    <select value={forms.cycleCountLine.itemId} onChange={(event) => updateForm('cycleCountLine', 'itemId', event.target.value)}>
                      <option value="">Select item</option>
                      {data.items.map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Counted qty</span><input value={forms.cycleCountLine.countedQty} onChange={(event) => updateForm('cycleCountLine', 'countedQty', event.target.value)} /></label>
                </div>
                <button type="button" className="button button--ghost" onClick={addCycleCountLine}>Add count line</button>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Discrepancy Approvals</h2>
                    <p>Finance/Admin only.</p>
                  </div>
                </div>
                <Table
                  rowKey="discrepancyTicketId"
                  rows={data.discrepancyTickets}
                  selectedId={selected.ticketId}
                  onPick={(row) => setSelected((current) => ({ ...current, ticketId: row.discrepancyTicketId }))}
                  columns={[
                    { key: 'cycleCountNumber', label: 'Count' },
                    { key: 'internalSku', label: 'SKU' },
                    { key: 'discrepancyQty', label: 'Delta', render: (row) => formatNumber(row.discrepancyQty) },
                    { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> }
                  ]}
                />
                <div className="button-row">
                  <button type="button" className="button button--secondary" onClick={approveTicket}>Approve selected ticket</button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>Recent Cycle Counts</h2>
                  <p>Warehouse submits, finance/admin resolves mismatches.</p>
                </div>
              </div>
              <Table
                rowKey="cycleCountId"
                rows={data.cycleCounts}
                selectedId={selected.cycleCountId}
                onPick={(row) => setSelected((current) => ({ ...current, cycleCountId: row.cycleCountId }))}
                columns={[
                  { key: 'cycleCountNumber', label: 'Count' },
                  { key: 'locationCode', label: 'Location' },
                  { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
                  { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) }
                ]}
              />
            </div>
          </div>
        ) : null}
        {section === 'manufacturing' ? (
          <div className="stack">
            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Bill of Materials</h2>
                    <p>Create and activate a versioned BoM for a finished good.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Parent finished good</span>
                    <select value={forms.bom.parentItemId} onChange={(event) => updateForm('bom', 'parentItemId', event.target.value)}>
                      <option value="">Select FG</option>
                      {data.items.filter((item) => item.itemType === 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Version</span><input value={forms.bom.versionName} onChange={(event) => updateForm('bom', 'versionName', event.target.value)} /></label>
                  <label className="field">
                    <span>Component</span>
                    <select value={forms.bomLine.componentItemId} onChange={(event) => updateForm('bomLine', 'componentItemId', event.target.value)}>
                      <option value="">Select component</option>
                      {data.items.filter((item) => item.itemType !== 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Quantity</span><input value={forms.bomLine.quantity} onChange={(event) => updateForm('bomLine', 'quantity', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createBom}>Create BoM</button>
                  <button type="button" className="button button--secondary" onClick={addBomLine}>Add line</button>
                  <button type="button" className="button button--ghost" onClick={activateBom}>Activate</button>
                </div>
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Production and Backflush</h2>
                    <p>Record finished goods, then deduct recursive raw demand.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Finished good</span>
                    <select value={forms.productionOrder.finishedGoodItemId} onChange={(event) => updateForm('productionOrder', 'finishedGoodItemId', event.target.value)}>
                      <option value="">Select FG</option>
                      {data.items.filter((item) => item.itemType === 'FINISHED_GOOD').map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku} - {item.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Planned qty</span><input value={forms.productionOrder.quantityPlanned} onChange={(event) => updateForm('productionOrder', 'quantityPlanned', event.target.value)} /></label>
                  <label className="field">
                    <span>FG location</span>
                    <select value={forms.completion.locationId} onChange={(event) => updateForm('completion', 'locationId', event.target.value)}>
                      <option value="">Select location</option>
                      {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Completed qty</span><input value={forms.completion.quantityCompleted} onChange={(event) => updateForm('completion', 'quantityCompleted', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createProductionOrder}>Create order</button>
                  <button type="button" className="button button--secondary" onClick={recordCompletion}>Record completion</button>
                  <button type="button" className="button button--ghost" onClick={previewBackflush}>Preview backflush</button>
                  <button type="button" className="button button--ghost" onClick={runBackflush}>Run backflush</button>
                </div>
              </div>
            </div>

            <div className="grid grid--2">
              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Backflush Preview</h2>
                    <p>Recursive BoM demand for the selected production order.</p>
                  </div>
                </div>
                <Table
                  rowKey="rawItemId"
                  rows={backflushPreview}
                  columns={[
                    { key: 'internalSku', label: 'SKU' },
                    { key: 'name', label: 'Name' },
                    { key: 'uom', label: 'UoM' },
                    { key: 'totalRequiredQty', label: 'Required', render: (row) => formatNumber(row.totalRequiredQty) }
                  ]}
                  emptyMessage="Run backflush preview to load requirements."
                />
              </div>

              <div className="panel">
                <div className="panel__header">
                  <div>
                    <h2>Scrap Dual Signoff</h2>
                    <p>Production signs first, warehouse signs second.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Item</span>
                    <select value={forms.scrap.itemId} onChange={(event) => updateForm('scrap', 'itemId', event.target.value)}>
                      <option value="">Select item</option>
                      {data.items.map((item) => <option key={item.itemId} value={item.itemId}>{item.internalSku}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Qty</span><input value={forms.scrap.quantity} onChange={(event) => updateForm('scrap', 'quantity', event.target.value)} /></label>
                  <label className="field">
                    <span>Location</span>
                    <select value={forms.scrap.locationId} onChange={(event) => updateForm('scrap', 'locationId', event.target.value)}>
                      <option value="">Select location</option>
                      {data.locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.locationCode}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Reason</span><input value={forms.scrap.reason} onChange={(event) => updateForm('scrap', 'reason', event.target.value)} /></label>
                </div>
                <div className="button-row">
                  <button type="button" className="button" onClick={createScrapRequest}>Create scrap request</button>
                  <button type="button" className="button button--secondary" onClick={signProductionScrap}>Production sign</button>
                  <button type="button" className="button button--ghost" onClick={signWarehouseScrap}>Warehouse sign</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
