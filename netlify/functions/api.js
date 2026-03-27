const fetch = require('node-fetch');

const WORKFLOW_URL = process.env.RETOOL_WORKFLOW_URL;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { endpoint, payload } = JSON.parse(event.body);

    let action;
    if (endpoint === 'lookupTag') action = 'lookup';
    else if (endpoint === 'checkDuplicate') action = 'checkDuplicate';
    else if (endpoint === 'getData') action = endpoint;
    else return { statusCode: 400,
      body: JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }) };

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
  } catch (err) {
    console.error('[api] Error:', err);
    return { statusCode: 500,
      body: JSON.stringify({ error: err.message }) };
  }
};
