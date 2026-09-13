# MiniMax H3 Mobile

手机优先的 MiniMax H3 BYOK 网页客户端。

## 功能
- 使用自己的 MiniMax API Key
- 国际站 / 中国站切换
- MiniMax-H3 文生视频
- 4–15 秒
- 768P / 2K
- 9:16、16:9、1:1 等比例
- 自动轮询任务状态
- 视频预览与链接复制
- API Key 不写入数据库或 localStorage

## 一键部署到 Vercel
1. 把本目录上传到 GitHub 仓库。
2. 登录 Vercel，Import Git Repository。
3. Framework Preset 选 Other，保持默认，Deploy。
4. 手机上打开生成的网址，浏览器菜单选择“添加到主屏幕”。

## 本地运行
安装 Vercel CLI 后：
```bash
npm i -g vercel
vercel dev
```

## 安全说明
API Key 会从你的浏览器发送到你自己部署的 `/api/generate` 与 `/api/status` 函数，然后转发到 MiniMax。代码没有持久化保存 Key。不要把部署日志改成记录请求体，也不要把 Key 写进源码。

## 官方接口
- Global API base: https://api.minimax.io
- CN API base: https://api.minimaxi.com
- Create: POST /v2/video_generation
- Query: GET /v2/query/video_generation/{task_id}
- Model: MiniMax-H3
