const BASES = {
  global: 'https://api.minimax.io',
  cn: 'https://api.minimaxi.com'
};

function send(res, status, body) {
  res.status(status).json(body);
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('图片数据格式无效');
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

async function uploadInputImage({ apiKey, region, image }) {
  const { mime, buffer } = parseDataUrl(image.dataUrl);
  const form = new FormData();
  const filename = image.name || `input.${mime.split('/')[1] || 'jpg'}`;

  form.append('purpose', 'video_generation_input');
  form.append('file', new Blob([buffer], { type: image.mime || mime || 'image/jpeg' }), filename);

  const upstream = await fetch(`${BASES[region]}/v1/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!upstream.ok) {
    throw { error: '图片上传到 MiniMax 失败', details: data };
  }

  const fileId = data?.file?.file_id || data?.file_id;
  if (!fileId) {
    throw { error: '图片上传成功，但没有拿到 file_id', details: data };
  }
  return fileId;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    const {
      apiKey,
      region = 'global',
      prompt,
      duration = 5,
      ratio = '9:16',
      resolution = '768P',
      image = null
    } = req.body || {};

    if (!apiKey || typeof apiKey !== 'string') return send(res, 400, { error: '缺少 API Key' });
    if (!prompt || typeof prompt !== 'string') return send(res, 400, { error: '请输入提示词' });
    if (!BASES[region]) return send(res, 400, { error: '无效区域' });

    const safeDuration = Math.max(4, Math.min(15, Number(duration) || 5));
    const allowedRatios = new Set(['21:9','16:9','4:3','1:1','3:4','9:16','adaptive']);
    const safeRatio = allowedRatios.has(ratio) ? ratio : '9:16';
    const safeResolution = resolution === '2K' ? '2K' : '768P';

    const content = [{ type: 'text', text: prompt }];
    const payload = {
      model: 'MiniMax-H3',
      content,
      duration: safeDuration,
      resolution: safeResolution
    };

    if (image?.dataUrl) {
      const fileId = await uploadInputImage({ apiKey, region, image });
      content.push({
        type: 'image_url',
        image_url: { url: `mm_file://${fileId}` },
        role: 'first_frame'
      });
    } else {
      payload.ratio = safeRatio;
    }

    const upstream = await fetch(`${BASES[region]}/v2/video_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      return send(res, upstream.status, { error: 'MiniMax 请求失败', details: data });
    }

    return send(res, 200, data);
  } catch (err) {
    return send(res, 500, { error: err?.error || '服务器错误', details: err?.details || err?.message || String(err) });
  }
}
