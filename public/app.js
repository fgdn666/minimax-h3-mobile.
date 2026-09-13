const $ = (s) => document.querySelector(s);
let region = 'global';
let resolution = '768P';
let polling = null;

const apiKey = $('#apiKey');
const prompt = $('#prompt');
const generate = $('#generate');
const statusCard = $('#statusCard');
const resultCard = $('#resultCard');
const errorCard = $('#errorCard');

for (const b of document.querySelectorAll('.seg[data-region]')) {
  b.addEventListener('click', () => {
    document.querySelectorAll('.seg[data-region]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); region = b.dataset.region;
  });
}
for (const b of document.querySelectorAll('.res')) {
  b.addEventListener('click', () => {
    document.querySelectorAll('.res').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); resolution = b.dataset.resolution;
  });
}

$('#toggleKey').addEventListener('click', () => {
  const show = apiKey.type === 'password';
  apiKey.type = show ? 'text' : 'password';
  $('#toggleKey').textContent = show ? '隐藏' : '显示';
});

prompt.addEventListener('input', () => $('#charCount').textContent = prompt.value.length);

function setProgress(percent, title, badge, text) {
  statusCard.classList.remove('hidden');
  $('#progressBar').style.width = `${percent}%`;
  $('#statusTitle').textContent = title;
  $('#statusBadge').textContent = badge;
  $('#statusText').textContent = text;
}

function showError(err) {
  generate.disabled = false;
  generate.textContent = '生成视频';
  errorCard.classList.remove('hidden');
  $('#errorText').textContent = typeof err === 'string' ? err : JSON.stringify(err, null, 2);
}

function extractStatus(data) {
  return data?.task?.status || data?.status || data?.data?.status || 'unknown';
}
function extractVideoUrl(data) {
  return data?.task?.content?.url || data?.video_url || data?.data?.video_url || data?.file?.download_url || null;
}
function normalizeStatus(s) {
  return String(s || '').toLowerCase();
}

async function postJSON(url, body) {
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw data;
  return data;
}

async function checkTask(taskId) {
  try {
    const data = await postJSON('/api/status', { apiKey: apiKey.value.trim(), region, taskId });
    const raw = extractStatus(data);
    const s = normalizeStatus(raw);
    const url = extractVideoUrl(data);

    if (url || ['success','succeeded','completed','done'].includes(s)) {
      clearInterval(polling); polling = null;
      setProgress(100, '生成完成', '完成', '视频已生成。');
      generate.disabled = false; generate.textContent = '再生成一个';
      if (url) {
        $('#video').src = url;
        $('#openVideo').href = url;
        $('#copyUrl').dataset.url = url;
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior:'smooth', block:'start' });
      } else {
        showError('任务显示完成，但没有读取到视频 URL。可稍后再次查询 task_id：' + taskId);
      }
      return;
    }

    if (['failed','error','cancelled','canceled'].includes(s)) {
      clearInterval(polling); polling = null;
      showError(data);
      return;
    }

    const queued = ['queue','queued','pending','created','unknown'].includes(s);
    setProgress(queued ? 34 : 68, queued ? '排队中' : '生成中', raw, queued ? '任务已提交，等待 MiniMax 开始处理。' : 'MiniMax 正在生成视频。');
  } catch (err) {
    clearInterval(polling); polling = null;
    showError(err);
  }
}

generate.addEventListener('click', async () => {
  errorCard.classList.add('hidden'); resultCard.classList.add('hidden');
  if (!apiKey.value.trim()) return showError('请输入你的 MiniMax API Key。');
  if (!prompt.value.trim()) return showError('请输入视频提示词。');

  generate.disabled = true; generate.textContent = '提交中…';
  setProgress(10, '正在提交', '连接中', '正在向 MiniMax H3 创建任务。');

  try {
    const data = await postJSON('/api/generate', {
      apiKey: apiKey.value.trim(), region,
      prompt: prompt.value.trim(),
      duration: Number($('#duration').value),
      ratio: $('#ratio').value,
      resolution
    });
    const taskId = data?.task_id || data?.task?.id || data?.data?.task_id;
    if (!taskId) throw { error:'MiniMax 已返回响应，但没有找到 task_id', details:data };

    $('#taskText').textContent = `Task ID: ${taskId}`;
    setProgress(28, '任务已提交', '排队', '页面会自动查询任务状态。');
    generate.textContent = '生成中…';
    await checkTask(taskId);
    if (!polling) polling = setInterval(() => checkTask(taskId), 5000);
  } catch (err) {
    showError(err);
  }
});

$('#copyUrl').addEventListener('click', async () => {
  const url = $('#copyUrl').dataset.url;
  if (!url) return;
  await navigator.clipboard.writeText(url);
  $('#copyUrl').textContent = '已复制';
  setTimeout(() => $('#copyUrl').textContent = '复制链接', 1600);
});
