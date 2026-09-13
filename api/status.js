const BASES = {
  global: 'https://api.minimax.io',
  cn: 'https://api.minimaxi.com'
};

function send(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    const { apiKey, region = 'global', taskId } = req.body || {};
    if (!apiKey || !taskId) return send(res, 400, { error: '缺少 API Key 或 taskId' });
    if (!BASES[region]) return send(res, 400, { error: '无效区域' });

    const upstream = await fetch(`${BASES[region]}/v2/query/video_generation/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      return send(res, upstream.status, { error: 'MiniMax 查询失败', details: data });
    }

    return send(res, 200, data);
  } catch (err) {
    return send(res, 500, { error: '服务器错误', details: err?.message || String(err) });
  }
}
