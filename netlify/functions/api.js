const fetch = require('node-fetch');

const WORKFLOW_URL = process.env.RETOOL_WORKFLOW_URL;
const MANUFACTURO_API_KEY = process.env.MANUFACTURO_API_KEY;
const MANUFACTURO_BASE = 'https://charm-industrial.manufacturo.cloud';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { endpoint, payload } = JSON.parse(event.body);

    // ---- Retool Workflow endpoints ----
    if (endpoint === 'lookupTag' || endpoint === 'checkDuplicate' || endpoint === 'getData') {
      let action;
      if (endpoint === 'lookupTag') action = 'lookup';
      else if (endpoint === 'checkDuplicate') action = 'checkDuplicate';
      else action = endpoint;

      const res = await fetch(WORKFLOW_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Workflow-Api-Key': process.env.RETOOL_WORKFLOW_KEY,
        },
        body: JSON.stringify({ action, payload }),
      });

      const data = await res.json();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    }

    // ---- Manufacturo direct API: Create Inventory ----
    if (endpoint === 'createInventory') {
      const res = await fetch(
        `${MANUFACTURO_BASE}/eworkin-plus/inventory/api/long-operation/integrations/inventory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;odata.metadata=minimal;odata.streaming=true',
            'X-Api-Key': MANUFACTURO_API_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }),
    };
  } catch (err) {
    console.error('[api] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
