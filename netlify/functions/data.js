const jwt = require('jsonwebtoken');

function verifyToken(event) {
  const auth = event.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

const GIST_URL = `https://api.github.com/gists/${process.env.GIST_ID}`;
const GIST_HEADERS = {
  'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'Content-Type': 'application/json'
};

async function getGistContent(gist) {
  const file = gist.files['recipes.json'];
  if (!file) throw new Error('recipes.json not found in gist');
  if (file.truncated) {
    const raw = await fetch(file.raw_url);
    return await raw.text();
  }
  return file.content;
}

exports.handler = async (event) => {
  if (!verifyToken(event)) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  if (event.httpMethod === 'GET') {
    const res = await fetch(GIST_URL, { headers: GIST_HEADERS });
    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gist fetch failed' })
      };
    }
    const content = await getGistContent(await res.json());
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: content
    };
  }

  if (event.httpMethod === 'PUT') {
    const res = await fetch(GIST_URL, {
      method: 'PATCH',
      headers: GIST_HEADERS,
      body: JSON.stringify({ files: { 'recipes.json': { content: event.body } } })
    });
    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gist update failed' })
      };
    }
    const content = await getGistContent(await res.json());
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: content
    };
  }

  return { statusCode: 405 };
};
