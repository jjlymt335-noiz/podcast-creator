# Podcast Creator - 关键文件清单

## 📋 必读文件（优先级：最高）

### 1. 项目文档
- `PROJECT_CONTEXT.md` - **项目完整上下文**（在新对话中第一个要读的文件）
- `INIT_PROMPT.txt` - 新对话初始化提示词
- `KEY_FILES.md` - 本文件，关键文件清单
- `README.md` - 项目基本说明

### 2. 入口页面（Entry Page）
```
src/components/EntryPage/
├── index.tsx              ⭐⭐⭐ 主入口页面（双模式逻辑）
├── VoiceSelector.tsx      ⭐⭐⭐ Host/Guest 手动音色选择
└── AutoAssignToggle.tsx   ⭐⭐  Auto-assign 开关组件
```

**关键逻辑**:
- `index.tsx` 中的 `handleGenerate()` 函数实现了两种模式：
  - Mode A: Auto-assign ON（AI 识别 + 自动匹配）
  - Mode B: Auto-assign OFF（AI 识别 + 用户手动选择）
- VoiceSelector 显示条件: `!autoAssignEnabled && (uploadedDoc || currentProject)`

### 3. 编辑页面（Editor Page）
```
src/components/EditorPage/
├── index.tsx              ⭐⭐  编辑器主页面
├── VoicePanel.tsx         ⭐⭐⭐ 左侧说话人音色面板（可点击切换音色）
├── TextEditor.tsx         ⭐⭐⭐ 右侧文本编辑器（支持 Voice Design）
└── TopBar.tsx             ⭐   顶部状态栏
```

**关键逻辑**:
- `VoicePanel.tsx`: Speaker 卡片点击 → 打开 VoiceLibraryModal → 选择音色 → 调用 `assignVoiceToSpeaker()`
- `TextEditor.tsx`: 悬停 segment → 工具栏 → "Design Voice" 按钮 → 打开 VoiceDesignModal

### 4. 音色库组件（Voice Library）
```
src/components/VoiceLibrary/
├── VoiceLibraryModal.tsx  ⭐⭐⭐ 音色库弹窗（3 个 Tab + 搜索 + 预览）
└── VoiceDesignModal.tsx   ⭐⭐⭐ Voice Design 弹窗（描述 → 生成 3 个 → 选择 → 命名）
```

**关键逻辑**:
- `VoiceLibraryModal`: 3 个 Tab（Public / My Voices / Favorited），点击卡片调用 `onSelectVoice()`
- `VoiceDesignModal`: 输入描述 → `generateVoiceDesign()` → 返回 3 个音色 → 用户选择 → 命名 → `onSaveVoice()`

### 5. 状态管理（Zustand）
```
src/store/
├── index.ts               ⭐   Store 导出
├── project-store.ts       ⭐⭐⭐ 项目状态（最核心）
└── ui-store.ts            ⭐⭐  UI 状态（Toast/Loading）
```

**关键 API**:
```typescript
// project-store.ts
createProject(text: string, language: string)
autoAssignVoices(userId: string)
assignVoiceToSpeaker(speakerId: string, voiceId: string, voiceName: string)
updateSegmentText(segmentId: string, text: string)
```

### 6. API 封装
```
src/lib/api/
├── client.ts              ⭐⭐  Axios 客户端配置
├── index.ts               ⭐   统一导出
├── tts.ts                 ⭐⭐  TTS API
├── voice-library.ts       ⭐⭐⭐ Voice Library API
├── voice-design.ts        ⭐⭐⭐ Voice Design API
└── auto-assign.ts         ⭐⭐⭐ Auto-assign API
```

**重要提示**:
- `auto-assign.ts` 中的 API 可能需要后端配合实现
- `client.ts` 中有 Axios 拦截器，自动处理 Token 和错误

### 7. 类型定义
```
src/types/
├── api.ts                 ⭐⭐  API 请求/响应类型
└── project.ts             ⭐⭐⭐ 项目数据结构（Project/Speaker/Segment）
```

**核心类型**:
```typescript
interface Project {
  project_id: string;
  title: string;
  source_text: string;
  language: string;
  speakers: Speaker[];
  segments: Segment[];
}

interface Speaker {
  speaker_id: string;
  speaker_name: string;
  voice_id?: string;
  voice_name?: string;
  segments: Segment[];
}

interface Segment {
  id: string;
  speaker_id: string;
  text: string;
  start_index: number;
  end_index: number;
}
```

### 8. UI 组件（shadcn/ui）
```
src/components/ui/
├── button.tsx             ⭐   Button 组件
├── card.tsx               ⭐   Card 组件
├── dialog.tsx             ⭐⭐  Dialog 组件（手动创建）
├── input.tsx              ⭐   Input 组件
├── textarea.tsx           ⭐⭐  Textarea 组件（手动创建）
├── tabs.tsx               ⭐   Tabs 组件
├── badge.tsx              ⭐   Badge 组件
└── ...                    其他 shadcn/ui 组件
```

## 🔧 配置文件

### 必须配置
- `.env` - 环境变量（**必须创建，参考 .env.example**）
  ```env
  VITE_API_BASE_URL=your_api_base_url
  VITE_API_TOKEN=your_api_token
  ```

### 参考配置
- `.env.example` - 环境变量示例
- `package.json` - 依赖和脚本
- `vite.config.ts` - Vite 配置
- `tailwind.config.js` - Tailwind 配置
- `tsconfig.json` - TypeScript 配置
- `components.json` - shadcn/ui 配置

## 📊 代码阅读顺序建议

### 新手快速上手（30 分钟）
1. `PROJECT_CONTEXT.md` - 了解项目全貌
2. `src/types/project.ts` - 理解数据结构
3. `src/components/EntryPage/index.tsx` - 看主流程
4. `src/store/project-store.ts` - 理解状态管理

### 深入理解业务逻辑（2 小时）
1. `src/components/EntryPage/index.tsx` - 入口页面双模式逻辑
2. `src/components/EntryPage/VoiceSelector.tsx` - 手动音色选择
3. `src/components/EditorPage/VoicePanel.tsx` - 编辑器音色管理
4. `src/components/EditorPage/TextEditor.tsx` - 文本编辑和 Voice Design
5. `src/components/VoiceLibrary/VoiceLibraryModal.tsx` - 音色库交互
6. `src/components/VoiceLibrary/VoiceDesignModal.tsx` - Voice Design 工作流
7. `src/store/project-store.ts` - 完整状态管理逻辑
8. `src/lib/api/auto-assign.ts` - Auto-assign API 实现

### 完整技术架构（1 天）
1. 所有上述文件
2. `src/lib/api/` - 所有 API 封装
3. `src/lib/parsers/` - 文档解析逻辑
4. `src/components/ui/` - UI 组件实现
5. 配置文件（vite/tailwind/typescript）

## 🐛 已知问题和解决方案

### 问题 1: Auto-assign 不分配音色 ✅ 已修复
**文件**: `src/components/EntryPage/index.tsx`
**修复**: 在 `handleGenerate()` 中区分 Mode A 和 Mode B

### 问题 2: VoiceSelector 切换消失 ✅ 已修复
**文件**: `src/components/EntryPage/index.tsx`
**修复**: 显示条件改为 `uploadedDoc || currentProject`

### 问题 3: Voice Library API 401 错误 ⚠️ 待解决
**可能原因**: API Token 过期或配置错误
**检查**: `.env` 文件中的 `VITE_API_TOKEN`

## 📝 重要代码片段

### 1. Entry Page 双模式逻辑
**文件**: `src/components/EntryPage/index.tsx` (67-110行)
```typescript
// Mode A: Auto-assign (AI 识别 + 自动匹配)
if (autoAssignEnabled && project.source_text) {
  await autoAssignVoices('default_user');
}

// Mode B: Manual (AI 识别 + 用户手动选择)
else if (!autoAssignEnabled && (hostVoice || guestVoice)) {
  await autoAssignVoices('default_user'); // 仅识别

  const updatedProject = useProjectStore.getState().currentProject;
  const assignVoiceToSpeaker = useProjectStore.getState().assignVoiceToSpeaker;

  if (updatedProject && updatedProject.speakers[0] && hostVoice) {
    assignVoiceToSpeaker(updatedProject.speakers[0].speaker_id, hostVoice.voiceId, hostVoice.voiceName);
  }

  if (updatedProject && updatedProject.speakers[1] && guestVoice) {
    assignVoiceToSpeaker(updatedProject.speakers[1].speaker_id, guestVoice.voiceId, guestVoice.voiceName);
  }
}
```

### 2. Voice Design 工作流
**文件**: `src/components/VoiceLibrary/VoiceDesignModal.tsx` (46-74行, 121-141行)
```typescript
// 生成 3 个音色
const handleGenerate = async () => {
  const result = await api.generateVoiceDesigns({
    description,
    language,
    count: 3,
  });
  setGeneratedVoices(result.voices);
};

// 保存并使用
const handleSaveAndUse = () => {
  const selectedVoice = generatedVoices[selectedVoiceIndex];
  onSaveVoice(selectedVoice.voice_id, voiceName);
};
```

### 3. 状态管理核心操作
**文件**: `src/store/project-store.ts`
```typescript
assignVoiceToSpeaker: (speakerId, voiceId, voiceName) => {
  set((state) => {
    if (!state.currentProject) return state;

    const updatedSpeakers = state.currentProject.speakers.map((speaker) =>
      speaker.speaker_id === speakerId
        ? { ...speaker, voice_id: voiceId, voice_name: voiceName }
        : speaker
    );

    return {
      currentProject: {
        ...state.currentProject,
        speakers: updatedSpeakers,
      },
    };
  });
},
```

## 🎯 快速调试指南

### 问题: Entry Page 音色选择不工作
1. 检查 `VoiceSelector` 是否显示: `src/components/EntryPage/index.tsx` (185-195行)
2. 检查 `autoAssignEnabled` 状态
3. 检查 `hostVoice` / `guestVoice` 是否有值

### 问题: Editor Page 音色切换失败
1. 检查 `VoicePanel.tsx` 的 `handleSelectVoice()` 函数
2. 检查 `assignVoiceToSpeaker()` 是否被调用
3. 检查 Store 中的 `speakers` 数据是否更新

### 问题: Voice Design 生成失败
1. 检查 API 调用: `src/lib/api/voice-design.ts`
2. 检查后端 API 是否可用
3. 查看浏览器 Console 和 Network 面板

## 🔄 最近更新记录

**2026-02-10**
- ✅ 修复 Auto-assign 不分配音色的 bug
- ✅ 修复 VoiceSelector 切换消失的 bug
- ✅ 创建项目文档（PROJECT_CONTEXT.md, INIT_PROMPT.txt, KEY_FILES.md）

**2026-02-09**
- ✅ 实现 Voice Design 集成
- ✅ 添加 VoiceSelector 组件（手动选择 Host/Guest）
- ✅ VoicePanel 支持点击切换音色

---

**提示**: 在新对话中，先让 Claude 读取 `PROJECT_CONTEXT.md`，然后根据需要读取具体的源代码文件。
