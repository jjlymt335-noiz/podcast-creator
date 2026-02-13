# Podcast Creator - Project Context

## Overview
AI Podcast Creator — 上传文档/URL 或直接写作，自动识别对话角色，匹配或生成音色，生成播客音频。
基于 Noiz TTS API (noiz.ai) + Gemini API 构建。

## Tech Stack
- **Frontend**: React 19 + TypeScript 5.9 + Vite 7
- **Styling**: Tailwind CSS 4 + Radix UI primitives + orange 主题色
- **State**: Zustand (3 stores: project / ui / voice)
- **HTTP**: Axios (apiClient + internalClient)
- **Deploy**: Vercel (Static + Serverless Functions)
- **Repo**: https://github.com/jjlymt335-noiz/podcast-creator
- **Demo**: https://podcast-creator-murex.vercel.app

## Architecture

### 两个 API Client (`src/lib/api/client.ts`)
| Client | 用途 | 认证 | 路由 |
|--------|------|------|------|
| `apiClient` | 公开 API (TTS, Voices) | `Authorization: API_KEY` | `/v2/text-to-speech`, `/v2/voices` |
| `internalClient` | 内部 API (emotion, voice-design, TTS-large) | Cookie `access_token` via Proxy | `/api/v2/*` |

### Dev 环境 Proxy (`vite.config.ts`)
- `/api/*` → `https://noiz.ai` (注入 `access_token` cookie)

### Production 环境 (Vercel)
- `/v2/*` → Vercel Rewrites 直连 `https://noiz.ai/v2/*` (公开 API)
- `/api/v2/*` → Vercel Serverless Function (`api/v2/[...path].ts`) 代理到 `https://noiz.ai/api/v2/*` (注入 cookie)
- `/api/fetch-url` → Serverless Function，用 Jina Reader 抓取 URL 内容

### Vercel 环境变量
- `VITE_API_KEY` — Base64 编码的 API Key
- `VITE_ACCESS_TOKEN` — JWT access token (cookie 注入用)
- `VITE_GEMINI_API_KEY` — Gemini API Key

## Page Flow & UI

### EntryPage (`src/components/EntryPage/index.tsx`)
两条入口路径：
1. **Start Writing** — 底部按钮，直接创建空白项目进入编辑器写作
2. **导入内容** — 三个 Tab (Upload Document / Import URL / Existing Project)
   - 导入后出现配置区：Podcast Name、Auto-assign Toggle、Voice Selection (Host/Guest)
   - 点击 **Generate Podcast** 按钮 → 处理后进入编辑器

"Start Writing" 和 "Generate Podcast" 是底部并排的两个按钮。

### EditorPage (`src/components/EditorPage/`)
- **逐行编辑模式**：每行是一个 segment，左侧显示 speaker + voice badge
- **自动初始化**：进入编辑器时如果 segments 为空，自动创建默认 Speaker + 第一个空 segment
- **Enter 换行**：分割 segment，新行继承当前 speaker，弹出 speaker 切换面板
- **Speaker 切换面板**：换行后左侧出现，列出其他 speaker + "New Speaker"，打字或选择后消失
- **悬停工具栏**：鼠标移入行 → 显示 Undo/Redo、Pause、Emotion Tag、Smart Emotions
- **右上角快捷操作**：Preview、Download MP3、Delete（hover 时出现）
- **段间 Gap 控制**：点击段间分隔线可调整说话人切换间隔

## Directory Structure
```
src/
├── components/
│   ├── EditorPage/        # 编辑器页面
│   │   ├── index.tsx      # 主布局 (TopBar + TextEditor)
│   │   ├── TextEditor.tsx # 逐行脚本编辑器 (Enter 分段, speaker 选择, inline tools)
│   │   ├── VoicePanel.tsx # 右侧音色面板（目前未使用）
│   │   ├── TopBar.tsx     # 顶部工具栏
│   │   └── GenerationHistory.tsx
│   ├── EntryPage/         # 首页
│   │   ├── index.tsx      # 三 Tab + Start Writing + Generate Podcast
│   │   ├── DocumentUpload.tsx
│   │   ├── UrlImport.tsx  # Jina Reader 抓取 URL
│   │   ├── VoiceSelector.tsx
│   │   └── AutoAssignToggle.tsx
│   ├── VoiceLibrary/      # 音色库弹窗
│   │   ├── VoiceLibraryModal.tsx
│   │   └── VoiceDesignModal.tsx
│   └── ui/                # shadcn/ui 组件
├── lib/
│   ├── api/               # 所有 API 调用 (全部 v2)
│   │   ├── client.ts      # Axios 实例 + 拦截器
│   │   ├── tts.ts         # TTS 相关 (短/长/批量/Large/轮询)
│   │   ├── voice-library.ts # 音色库 CRUD
│   │   ├── voice-design.ts  # AI 音色生成
│   │   ├── emotion.ts     # 情绪增强
│   │   ├── auto-assign.ts # 自动角色识别 + 音色匹配 (Gemini + Voice Library)
│   │   ├── gemini.ts      # Gemini API (角色特征分析)
│   │   └── gemini-segmentation.ts # Gemini 对话切分
│   ├── parsers/           # 文档解析 (PDF/DOCX/EPUB/HTML/TXT)
│   ├── hooks/             # useAudioPlayer
│   └── utils/             # audio-merge
├── store/                 # Zustand stores
│   ├── project-store.ts   # 项目/segments/speakers 状态
│   ├── ui-store.ts        # 页面导航/toast/loading 状态
│   └── voice-store.ts     # 音色库列表状态
└── types/
    ├── api.ts             # API 响应类型
    └── project.ts         # 项目领域类型 (Project, ProjectSegment, ProjectSpeaker)

api/                       # Vercel Serverless Functions
├── fetch-url.ts           # URL 内容抓取 (Jina Reader)
├── v1/[...path].ts        # v1 代理 (旧, 可删)
└── v2/[...path].ts        # v2 代理 (当前使用)
```

## Data Model (`src/types/project.ts`)
- **Project**: id, title, source_text, language, speakers[], segments[], status, gen_product_id, audio_blobs, generation_history
- **ProjectSegment**: id, speaker_id, text, voice_id, start_index, end_index, speaker_gap, pause_before
- **ProjectSpeaker**: speaker_id, speaker_name, voice_id, voice_name, character_description

## API Endpoints (All v2)

### Public API (apiClient, API Key 认证)
- `POST /v2/text-to-speech` — 短文本 TTS (≤150字符)
- `GET /v2/voices` — 音色列表 (params: skip, limit, keyword, gender, age, language_type)
- `GET /v2/voices/{id}` — 音色详情
- `DELETE /v2/voices/{id}` — 删除音色

### Internal API (internalClient, Cookie 认证)
- `POST /api/v2/text-to-speech-long` — 长文本 TTS (≤1000字符)
- `POST /api/v2/text-to-speech-batch` — 批量 TTS
- `POST /api/v2/text-to-speech-large` — 超长文本 TTS (异步)
- `GET /api/v2/text-to-speech-large/gen_products/{id}` — Large 结果
- `POST /api/v2/text-to-speech-large-progress` — 进度查询
- `PUT /api/v2/text-to-speech-large-stop` — 停止任务
- `POST /api/v2/text-to-speech-large-regen` — 重新生成片段
- `GET /api/v2/text-to-speech-large-candidates` — 候选集
- `PUT /api/v2/text-to-speech-large-candidates` — 选择候选
- `PUT /api/v2/text-to-speech-large-concat` — 合并片段
- `GET /api/v2/text-to-speech-history` — 历史记录
- `DELETE /api/v2/text-to-speech/{id}` — 删除历史
- `POST /api/v2/text-to-speech/download` — 记录下载
- `PUT /api/v2/text-to-speech/{id}/like` — 点赞
- `POST /api/v2/emotion-enhance` — 情绪增强
- `POST /api/v2/voice-design` — AI 音色生成
- `POST /api/v2/voices` — 保存生成的音色

## Key Workflows

### Auto-Assign Flow
1. 用户上传文档 → 解析文本
2. 正则检测对话格式 (A: / B:)；无对话格式 → Gemini 智能切分
3. Gemini 分析每个 speaker 特征 (gender, age, tags)
4. 从 Voice Library 搜索匹配音色 (多策略降级: keyword+gender+age → gender+language → language-only → no-filter → pinned)
5. 搜索无果 → Voice Design 自动生成并保存

### Manual Writing Flow
1. 点击 "Start Writing" → 创建空白项目 → 进入编辑器
2. 编辑器自动创建 "Speaker 1" + 一个空 segment
3. 用户逐行输入，Enter 换行 → 继承 speaker，可切换
4. 在编辑器中选择音色 → 点击 Generate All

### TTS Generation Flow
1. 编辑器按 Enter 分段，每段选 speaker + 音色
2. 点击 Generate All → `textToSpeech` 逐段生成音频
3. 生成完成后保存到 `generation_history`
4. Export 可合并所有音频下载

## Commands
```bash
npm run dev                    # 启动开发服务器 (port 5173)
npm run build                  # TypeScript 编译 + Vite 构建
npx vercel@50.15.1 --yes --prod  # 部署到 Vercel (指定版本避免依赖冲突)
```

## Important Notes
- `tsconfig.app.json`: `noUnusedLocals: false`, `noUnusedParameters: false`
- `api/v1/` 目录是旧版代理，可以清理
- 音色语言过滤用 `language_type` 参数（不是 `language`）
- 音色列表分页用 `skip`/`limit`（不是 `page`/`page_size`）
- Vercel 部署用 `npx vercel@50.15.1`（50.17.0 有依赖冲突）
- Zustand store 使用 `persist` middleware，数据存在 localStorage
- TextEditor 的 `useEffect` 在 `currentProject?.id` 变化时自动初始化 segments
