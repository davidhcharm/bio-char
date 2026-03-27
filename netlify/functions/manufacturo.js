const fetch = require('node-fetch');

const BASE_URL = 'https://charm-industrial.manufacturo.cloud';
const API_KEY = process.env.MANUFACTURO_API_KEY;
const CT = 'application/json;odata.metadata=minimal;odata.streaming=true';

const ROUTES = {
  adjustInventory: '/eworkin-plus/inventory/api/integrations/inventory/adjust',
  adjustITag: '/eworkin-plus/inventory/api/integrations/itags/adjust',
  moveOrder: '/eworkin-plus/inventory/api/integrations/move-order-import',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { action, payload } = JSON.parse(event.body);

    const path = ROUTES[action];
    if (!path)
      return { statusCode: 400,
        body: JSON.stringify({ error: `Unknown action: ${action}` }) };

    console.log(`[manufacturo] ${action} ->`, path);

    const res = await fetch(BASE_URL + path, {
      method: 'POST',
      headers: {
        'Content-Type': CT,
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log(`[manufacturo] Response ${res.status}:`, JSON.stringify(data).slice(0, 200));

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[manufacturo] Error:', err);
    return { statusCode: 500,
      body: JSON.stringify({ error: err.message }) };
  }
};
