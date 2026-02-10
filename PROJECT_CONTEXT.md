# Podcast Creator - 项目上下文

## 🎯 项目概述

这是一个**广播剧（Podcast）创作工具**，用于将文本文档转换为多角色对话音频。

**核心功能**：
1. 上传文档（PDF/EPUB/DOCX/TXT/HTML）自动解析
2. AI 自动识别说话人并匹配音色（Auto-assign voices）
3. 手动选择 Host/Guest 音色
4. 文本编辑器支持分段编辑和音色调整
5. Voice Library 集成（公共库/我的音色/收藏）
6. Voice Design 功能（文本描述生成音色）
7. TTS 合成和导出音频

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **状态管理**: Zustand
- **HTTP**: Axios
- **文档解析**: PDF.js, epub.js, mammoth.js

## 📁 项目结构

```
C:\Users\江嘉骝\podcast-creator\
├── src/
│   ├── components/
│   │   ├── EntryPage/              # 入口页面
│   │   │   ├── index.tsx           # 主入口（上传/选择项目）
│   │   │   ├── VoiceSelector.tsx   # Host/Guest 音色选择
│   │   │   └── AutoAssignToggle.tsx # Auto-assign 开关
│   │   ├── EditorPage/             # 创作页面
│   │   │   ├── index.tsx           # 编辑器主页面
│   │   │   ├── VoicePanel.tsx      # 左侧音色面板
│   │   │   ├── TextEditor.tsx      # 右侧文本编辑器
│   │   │   └── TopBar.tsx          # 顶部状态栏
│   │   ├── VoiceLibrary/           # 音色库组件
│   │   │   ├── VoiceLibraryModal.tsx  # 音色库弹窗
│   │   │   └── VoiceDesignModal.tsx   # Voice Design 弹窗
│   │   └── ui/                     # shadcn/ui 组件
│   ├── lib/
│   │   ├── api/                    # API 封装
│   │   │   ├── client.ts           # Axios 客户端
│   │   │   ├── tts.ts              # TTS API
│   │   │   ├── voice-library.ts    # Voice Library API
│   │   │   ├── voice-design.ts     # Voice Design API
│   │   │   ├── auto-assign.ts      # Auto-assign API
│   │   │   └── index.ts            # 统一导出
│   │   ├── parsers/                # 文档解析器
│   │   │   ├── pdf.ts
│   │   │   ├── epub.ts
│   │   │   ├── docx.ts
│   │   │   └── index.ts
│   │   └── utils/
│   ├── store/                      # Zustand 状态管理
│   │   ├── index.ts                # Store 导出
│   │   ├── project-store.ts        # 项目状态
│   │   └── ui-store.ts             # UI 状态
│   ├── types/                      # TypeScript 类型
│   │   ├── api.ts                  # API 类型
│   │   └── project.ts              # 项目类型
│   ├── App.tsx                     # 根组件
│   └── main.tsx                    # 入口文件
├── .env                            # 环境变量
├── package.json
└── vite.config.ts
```

## 🔑 关键文件说明

### 1. 入口页面逻辑
**文件**: `src/components/EntryPage/index.tsx`

两种工作模式：
- **Mode A (Auto-assign ON)**: AI 识别说话人 + 自动匹配音色
- **Mode B (Auto-assign OFF)**: AI 识别说话人 + 用户手动选择 Host/Guest 音色

```typescript
// Mode A: 完全自动
if (autoAssignEnabled && project.source_text) {
  await autoAssignVoices('default_user');
}

// Mode B: 半自动（识别 + 手动）
else if (!autoAssignEnabled && (hostVoice || guestVoice)) {
  await autoAssignVoices('default_user'); // 仅识别说话人

  // 手动分配用户选择的音色
  const assignVoiceToSpeaker = useProjectStore.getState().assignVoiceToSpeaker;
  if (updatedProject.speakers[0] && hostVoice) {
    assignVoiceToSpeaker(updatedProject.speakers[0].speaker_id, hostVoice.voiceId, hostVoice.voiceName);
  }
  if (updatedProject.speakers[1] && guestVoice) {
    assignVoiceToSpeaker(updatedProject.speakers[1].speaker_id, guestVoice.voiceId, guestVoice.voiceName);
  }
}
```

### 2. 状态管理
**文件**: `src/store/project-store.ts`

核心状态：
```typescript
interface ProjectState {
  currentProject: Project | null;
  speakers: Speaker[];        // 说话人列表
  segments: Segment[];        // 对话片段

  // 关键操作
  createProject: (text: string, language: string) => void;
  autoAssignVoices: (userId: string) => Promise<void>;
  assignVoiceToSpeaker: (speakerId: string, voiceId: string, voiceName: string) => void;
  updateSegmentText: (segmentId: string, text: string) => void;
}
```

### 3. API 调用
**文件**: `src/lib/api/`

主要 API：
- `textToSpeech()` - TTS 合成
- `getVoiceLibrary()` - 获取音色库
- `generateVoiceDesign()` - Voice Design 生成音色
- `autoAssignVoices()` - Auto-assign（调用 Gemini + Voice Library）

### 4. 组件交互

**VoiceSelector** (Entry Page)
- 显示条件: `!autoAssignEnabled && (uploadedDoc || currentProject)`
- 用户点击 Host/Guest 卡片 → 打开 VoiceLibraryModal
- 选择音色后保存到本地状态 `hostVoice` / `guestVoice`
- Generate 时传递给 handleGenerate

**VoicePanel** (Editor Page)
- 显示所有 speakers
- 点击 speaker 卡片 → 打开 VoiceLibraryModal
- 选择音色后调用 `assignVoiceToSpeaker()`

**TextEditor** (Editor Page)
- 显示所有 segments
- 悬停显示工具栏（试听、Smart Emotion、**Design Voice**）
- "Design Voice" 按钮 → 打开 VoiceDesignModal
- Voice Design 完成后自动分配给当前 speaker

## 🎨 UI 组件库

使用 shadcn/ui，已安装的组件：
- Button, Card, Dialog, Input, Textarea
- Tabs, Select, Badge, Toast
- 基于 Radix UI primitives

## 🐛 已知问题和解决方案

### 问题 1: Auto-assign 不分配音色
**原因**: handleGenerate 只调用了识别逻辑，没有实际分配
**解决**: 区分 Mode A 和 Mode B，在 Mode B 中手动调用 `assignVoiceToSpeaker()`

### 问题 2: VoiceSelector 切换消失
**原因**: 显示条件只检查 `uploadedDoc`，切换时 `uploadedDoc` 变为 null
**解决**: 改为 `uploadedDoc || currentProject`

### 问题 3: Voice Library API 401 错误
**原因**: API Token 可能过期或未正确配置
**解决**: 检查 `.env` 文件中的 `VITE_API_TOKEN`

## 🔐 环境配置

创建 `.env` 文件：
```env
VITE_API_BASE_URL=your_api_base_url
VITE_API_TOKEN=your_api_token
```

## 🚀 快速开始

```bash
cd C:\Users\江嘉骝\podcast-creator
npm install
npm run dev
```

浏览器访问: http://localhost:5173

## 📝 开发历史

1. **Phase 1**: 项目初始化 + 基础组件
2. **Phase 2**: Entry Page + Auto-assign 功能
3. **Phase 3**: Voice Library 集成
4. **Phase 4**: Voice Design 功能
5. **Phase 5**: 手动音色选择（Host/Guest）
6. **Current**: 完整功能已实现，处于测试和优化阶段

## 🔄 最近的重要改动

1. **Entry Page 双模式支持** (2026-02-10)
   - 添加 VoiceSelector 组件
   - handleGenerate 支持 Auto-assign 和 Manual 两种模式
   - 修复 VoiceSelector 显示逻辑

2. **Voice Design 集成** (2026-02-09)
   - TextEditor 添加 "Design Voice" 按钮
   - 实现 3 选 1 工作流
   - 自动保存到音色库

3. **VoicePanel 优化** (2026-02-09)
   - Speaker 卡片可点击
   - 集成 VoiceLibraryModal
   - 添加音色预览功能

## 💡 下一步计划

- [ ] 测试完整工作流（上传 → 编辑 → 生成 → 导出）
- [ ] 优化音色预览性能
- [ ] 添加撤销/重做功能
- [ ] 实现音频导出
- [ ] 添加项目保存/加载（使用 LocalStorage）

## 📞 API 依赖

本项目依赖后端 Speech Service API，包括：
- TTS API (v1/tts/*)
- Voice Library API (v1/voice-library/*)
- Voice Design API (v1/voice-design/*)
- Auto-assign API (v1/auto-assign/*) - **注意：这个 API 可能尚未完全实现**

## 🎯 测试要点

1. **文档上传**: 测试各种格式（PDF/EPUB/DOCX/TXT/HTML）
2. **Auto-assign**: 开启后应自动识别并匹配音色
3. **手动选择**: 关闭 Auto-assign，手动选择 Host/Guest 音色
4. **Voice Design**: 输入描述 → 生成 3 个音色 → 选择 → 命名 → 保存
5. **音色切换**: 在 Editor Page 点击 speaker 切换音色
6. **文本编辑**: 修改对话内容，确保 segments 更新
7. **音色预览**: 点击 Play 按钮预览音色

---

**最后更新**: 2026-02-10
**版本**: v0.1.0 (Alpha)
**开发者**: Claude Code (Sonnet 4.5)
