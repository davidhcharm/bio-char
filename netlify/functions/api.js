const fetch = require('node-fetch');

const WORKFLOW_URL = process.env.RETOOL_WORKFLOW_URL;
const WORKFLOW_KEY = process.env.RETOOL_WORKFLOW_KEY;
const MANUFACTURO_API_KEY = process.env.MANUFACTURO_API_KEY;
const MANUFACTURO_BASE = 'https://charm-industrial.manufacturo.cloud';
const MANUFACTURO_CT = 'application/json;odata.metadata=minimal;odata.streaming=true';

// ============================================================
// Helper: Call Retool Workflow (for SQL lookups)
// ============================================================
async function callRetoolWorkflow(action, payload) {
  const res = await fetch(WORKFLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Workflow-Api-Key': WORKFLOW_KEY,
    },
    body: JSON.stringify({ action, payload }),
  });
  return { status: res.status, data: await res.json() };
}

// ============================================================
// Helper: Call Manufacturo REST API (direct)
// ============================================================
async function callManufacturo(path, payload) {
  const res = await fetch(`${MANUFACTURO_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': MANUFACTURO_CT,
      'X-Api-Key': MANUFACTURO_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text, statusCode: res.status };
  }
  return { status: res.status, data };
}

// ============================================================
// Endpoint routing map
// ============================================================
const ROUTES = {
  // SQL lookups via Retool Workflow
  lookupTag:        { type: 'workflow', action: 'lookup' },
  checkDuplicate:   { type: 'workflow', action: 'checkDuplicate' },
  getData:          { type: 'workflow', action: 'getData' },

  // Inventory adjustments via Retool Workflow (goes through adjustRouter → callManufacturo in workflow)
  adjustViaWorkflow: { type: 'workflow', action: 'adjust' },

  // Direct Manufacturo REST API calls
  createInventory:  { type: 'manufacturo', path: '/eworkin-plus/inventory/api/long-operation/integrations/inventory' },
  adjustInventory:  { type: 'manufacturo', path: '/eworkin-plus/inventory/api/integrations/inventory/adjust' },
  adjustITag:       { type: 'manufacturo', path: '/eworkin-plus/inventory/api/integrations/itags/adjust' },
  moveOrder:        { type: 'manufacturo', path: '/eworkin-plus/inventory/api/integrations/move-order-import' },
};

// ============================================================
// Main handler
// ============================================================
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { endpoint, payload } = JSON.parse(event.body);
    const route = ROUTES[endpoint];

    if (!route) {
      console.error(`[api] Unknown endpoint: ${endpoint}`);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }),
      };
    }

    console.log(`[api] ${endpoint} → ${route.type}${route.path || ''}`);

    let result;

    if (route.type === 'workflow') {
      result = await callRetoolWorkflow(route.action, payload);
    } else if (route.type === 'manufacturo') {
      result = await callManufacturo(route.path, payload);
    }

    return {
      statusCode: result.status || 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    };

  } catch (err) {
    console.error('[api] Error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
