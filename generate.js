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
    const { apiKey, region = 'global', prompt, duration = 5, ratio = '9:16', resolution = '768P' } = req.body || {};

    if (!apiKey || typeof apiKey !== 'string') return send(res, 400, { error: '缺少 API Key' });
    if (!prompt || typeof prompt !== 'string') return send(res, 400, { error: '请输入提示词' });
    if (!BASES[region]) return send(res, 400, { error: '无效区域' });

    const safeDuration = Math.max(4, Math.min(15, Number(duration) || 5));
    const allowedRatios = new Set(['21:9','16:9','4:3','1:1','3:4','9:16','adaptive']);
    const safeRatio = allowedRatios.has(ratio) ? ratio : '9:16';
    const safeResolution = resolution === '2K' ? '2K' : '768P';

    const upstream = await fetch(`${BASES[region]}/v2/video_generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'MiniMax-H3',
        content: [{ type: 'text', text: prompt }],
        duration: safeDuration,
        ratio: safeRatio,
        resolution: safeResolution
      })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      return send(res, upstream.status, { error: 'MiniMax 请求失败', details: data });
    }

    return send(res, 200, data);
  } catch (err) {
    return send(res, 500, { error: '服务器错误', details: err?.message || String(err) });
  }
}
