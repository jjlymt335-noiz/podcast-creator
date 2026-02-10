# 广播剧创作工具 - 后端API规格文档

## 概述

本文档定义广播剧创作工具所需的**新增后端API**。这些API用于实现Auto-assign Voices功能，即自动识别文本中的角色并匹配最合适的音色。

---

## API 1: 角色识别与音色匹配

### 基本信息

| 项目 | 说明 |
|------|------|
| **URL** | `POST /api/v1/podcast/auto-assign-voices` |
| **功能** | 1. 分析文本，识别所有说话人（用LLM如Gemini）<br>2. 为每个说话人从Voice Library匹配最合适的音色<br>3. 如果找不到合适的音色，生成Voice Design的描述文本 |
| **认证** | 需要登录（Bearer Token） |
| **限流** | 10次/60秒 |

---

### 入参（JSON Body）

```json
{
  "text": "完整的文本内容...",
  "language": "en",
  "user_id": "user_123456"
}
```

#### 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `text` | string | ✅ | 完整文本内容，最大长度100,000字符 |
| `language` | string | ✅ | 语言代码（en/zh/ja/ar等），用于语言检测和音色匹配 |
| `user_id` | string | ✅ | 用户ID，用于访问用户的自定义音色库 |

---

### 出参（JSON Response）

#### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "speakers": [
      {
        "speaker_id": "speaker_1",
        "speaker_name": "Host",
        "character_description": "A warm and friendly host with an engaging personality",
        "segments": [
          {
            "text": "Welcome to today's show!",
            "start_index": 0,
            "end_index": 26
          },
          {
            "text": "Let's dive into our topic.",
            "start_index": 150,
            "end_index": 177
          }
        ],
        "matched_voice": {
          "voice_id": "voice_abc123",
          "display_name": "Emma",
          "match_score": 0.85,
          "match_reason": "Matched tags: warm, friendly, narrator",
          "source": "public_library",
          "tags": ["warm", "friendly", "narrator"],
          "language": "en",
          "gender": "female",
          "age": "young"
        },
        "voice_design_fallback": null
      },
      {
        "speaker_id": "speaker_2",
        "speaker_name": "Guest Expert",
        "character_description": "A knowledgeable expert with an authoritative tone",
        "segments": [
          {
            "text": "Thank you for having me.",
            "start_index": 27,
            "end_index": 51
          }
        ],
        "matched_voice": {
          "voice_id": "voice_def456",
          "display_name": "Michael",
          "match_score": 0.72,
          "match_reason": "Matched tags: authoritative, professional",
          "source": "public_library",
          "tags": ["authoritative", "professional", "deep"],
          "language": "en",
          "gender": "male",
          "age": "middleAged"
        },
        "voice_design_fallback": null
      },
      {
        "speaker_id": "speaker_3",
        "speaker_name": "Narrator",
        "character_description": "A calm and neutral narrator voice",
        "segments": [
          {
            "text": "Meanwhile, in another part of town...",
            "start_index": 178,
            "end_index": 215
          }
        ],
        "matched_voice": null,
        "voice_design_fallback": {
          "description": "A calm, neutral narrator with a soothing tone. Clear pronunciation, steady pace, natural and human-like delivery.",
          "suggested_tags": ["calm", "neutral", "narrator", "soothing"]
        }
      }
    ],
    "processing_time_ms": 2500,
    "total_speakers": 3,
    "total_segments": 4
  }
}
```

#### 出参字段说明

| 字段路径 | 类型 | 说明 |
|---------|------|------|
| `data.speakers` | Array | 识别出的说话人列表 |
| `data.speakers[].speaker_id` | string | 说话人唯一标识符 |
| `data.speakers[].speaker_name` | string | LLM识别出的角色名称（如"Host", "Guest", "Narrator"） |
| `data.speakers[].character_description` | string | 角色的详细描述 |
| `data.speakers[].segments` | Array | 该说话人的所有对话片段 |
| `data.speakers[].segments[].text` | string | 对话内容 |
| `data.speakers[].segments[].start_index` | int | 在原文本中的起始位置 |
| `data.speakers[].segments[].end_index` | int | 在原文本中的结束位置 |
| `data.speakers[].matched_voice` | Object\|null | 匹配到的音色信息（如果match_score ≥ 0.6） |
| `data.speakers[].matched_voice.voice_id` | string | 音色ID |
| `data.speakers[].matched_voice.match_score` | float | 匹配度（0-1），≥0.6视为可接受 |
| `data.speakers[].matched_voice.match_reason` | string | 匹配依据说明 |
| `data.speakers[].matched_voice.source` | string | 音色来源：`public_library` / `user_library` |
| `data.speakers[].voice_design_fallback` | Object\|null | 当匹配度<0.6或无匹配时的备选方案 |
| `data.speakers[].voice_design_fallback.description` | string | Voice Design的输入描述文本 |
| `data.speakers[].voice_design_fallback.suggested_tags` | Array\<string\> | 建议的标签 |
| `data.processing_time_ms` | int | 处理耗时（毫秒） |
| `data.total_speakers` | int | 识别出的说话人总数 |
| `data.total_segments` | int | 对话片段总数 |

---

### 错误响应

#### 400 - 参数错误

```json
{
  "code": 400,
  "message": "Text is empty or too long (max 100,000 characters)",
  "data": null
}
```

#### 401 - 未认证

```json
{
  "code": 401,
  "message": "Unauthorized",
  "data": null
}
```

#### 500 - 服务器错误

```json
{
  "code": 500,
  "message": "LLM analysis failed: Gemini API timeout",
  "data": null
}
```

---

## 后端实现建议

### 1. 技术架构

```
用户请求
    ↓
[验证&限流层]
    ↓
[文本预处理]
    ↓
[Gemini 2.5 Pro 分析] ← Prompt Engineering
    ↓
[角色识别结果]
    ↓
[音色匹配层]
    ├─→ [Milvus向量检索] ← Voice Library（用户+公共）
    ├─→ [相似度计算]
    └─→ [生成Voice Design描述]（fallback）
    ↓
[结果聚合&返回]
```

---

### 2. Gemini Prompt设计

#### Prompt模板（推荐）

```
你是一个专业的对话分析助手。请分析以下文本，识别所有说话人并提取其对话内容。

输入文本：
"""
{text}
"""

请按以下JSON格式输出：
{{
  "speakers": [
    {{
      "speaker_name": "说话人名称（如Host/Guest/Narrator）",
      "character_description": "角色描述（性格、语气、特征）",
      "segments": [
        {{
          "text": "对话内容",
          "start_index": 起始位置,
          "end_index": 结束位置
        }}
      ],
      "suggested_tags": ["warm", "friendly", "professional"] // 建议的音色标签
    }}
  ]
}}

要求：
1. 识别所有不同的说话人（包括叙述者/旁白）
2. 为每个说话人生成准确的角色描述
3. 提取所有对话片段并标注位置
4. 根据角色特征建议3-5个音色标签（如warm/cold/friendly/professional/young/old等）
```

#### 预期Gemini输出

```json
{
  "speakers": [
    {
      "speaker_name": "Host",
      "character_description": "A warm and friendly host with an engaging personality",
      "segments": [
        {"text": "Welcome to today's show!", "start_index": 0, "end_index": 26}
      ],
      "suggested_tags": ["warm", "friendly", "engaging", "narrator"]
    }
  ]
}
```

---

### 3. 音色匹配逻辑

#### 步骤1: 生成查询向量

```python
# 根据角色描述和suggested_tags生成查询文本
query_text = f"{character_description}. Tags: {', '.join(suggested_tags)}"

# 调用Embedding模型（如text-embedding-004）生成向量
query_vector = embed_model.encode(query_text)
```

#### 步骤2: Milvus向量检索

```python
# 搜索参数
search_params = {
    "metric_type": "COSINE",  # 余弦相似度
    "params": {"nprobe": 10}
}

# 先搜索用户音色库
results_user = milvus_client.search(
    collection_name="user_voices",
    data=[query_vector],
    filter=f"user_id == '{user_id}'",
    limit=5,
    output_fields=["voice_id", "display_name", "tags", "language", "gender", "age"],
    search_params=search_params
)

# 如果用户库无结果或分数<0.6，搜索公共库
if not results_user or results_user[0].distance < 0.6:
    results_public = milvus_client.search(
        collection_name="public_voices",
        data=[query_vector],
        filter=f"language == '{language}'",  # 语言过滤
        limit=10,
        output_fields=["voice_id", "display_name", "tags", "language", "gender", "age"],
        search_params=search_params
    )
```

#### 步骤3: 选择最佳匹配

```python
def select_best_match(results):
    if not results or len(results[0]) == 0:
        return None

    best_match = results[0][0]  # 相似度最高的结果
    match_score = best_match.distance  # Milvus返回的相似度

    if match_score >= 0.6:  # 阈值：0.6
        return {
            "voice_id": best_match.entity.get("voice_id"),
            "display_name": best_match.entity.get("display_name"),
            "match_score": match_score,
            "match_reason": f"Matched tags: {', '.join(best_match.entity.get('tags'))}",
            "source": "user_library" if is_user_library else "public_library",
            "tags": best_match.entity.get("tags"),
            "language": best_match.entity.get("language"),
            "gender": best_match.entity.get("gender"),
            "age": best_match.entity.get("age")
        }
    else:
        return None  # 匹配度不够，需要fallback
```

#### 步骤4: Fallback - 生成Voice Design描述

```python
def generate_voice_design_fallback(speaker):
    """当找不到合适音色时，生成Voice Design的输入描述"""
    description = speaker["character_description"]
    tags = speaker["suggested_tags"]

    # 基于描述和tags生成Voice Design prompt
    voice_design_prompt = (
        f"{description}. "
        f"A voice with these characteristics: {', '.join(tags)}. "
        f"Clear pronunciation, natural delivery."
    )

    return {
        "description": voice_design_prompt,
        "suggested_tags": tags
    }
```

---

### 4. 性能优化建议

| 优化点 | 建议 |
|--------|------|
| **LLM调用** | 1. 使用Gemini 2.5 Flash（更快更便宜）<br>2. 设置timeout=30s<br>3. 缓存常见文本的分析结果（Redis） |
| **向量检索** | 1. 使用Milvus的HNSW索引<br>2. 预加载热门音色到内存<br>3. 批量查询多个角色的音色 |
| **异步处理** | 对于超长文本（>10,000字符），使用异步Job处理<br>返回job_id，前端轮询结果 |
| **缓存策略** | 1. LLM结果缓存（文本hash为key，7天TTL）<br>2. 音色匹配结果缓存（1天TTL） |

---

### 5. 测试用例

#### 测试用例1: 标准对话

**输入：**
```json
{
  "text": "Host: Welcome to our show! Today we have a special guest. Guest: Thank you for having me. Narrator: And so the interview began.",
  "language": "en",
  "user_id": "user_123"
}
```

**预期输出：**
- 识别3个角色：Host, Guest, Narrator
- 每个角色匹配到合适音色（match_score ≥ 0.6）
- 正确提取所有对话片段

#### 测试用例2: 无明确标记的对话

**输入：**
```json
{
  "text": "欢迎来到今天的节目。今天我们要讨论一个重要话题。谢谢你的邀请，我很高兴能来。",
  "language": "zh",
  "user_id": "user_123"
}
```

**预期输出：**
- LLM正确推断说话人（即使没有明确标记）
- 匹配中文音色
- 生成合理的角色描述

#### 测试用例3: 找不到合适音色

**输入：**
```json
{
  "text": "Robot: Beep boop, analyzing data. Error code 404.",
  "language": "en",
  "user_id": "user_123"
}
```

**预期输出：**
- 识别Robot角色
- matched_voice = null（因为音色库可能没有机器人声音）
- voice_design_fallback 包含合理的生成描述

---

### 6. 错误处理

| 错误场景 | 处理方式 | 返回码 |
|---------|---------|--------|
| 文本为空 | 返回400，提示"Text is empty" | 400 |
| 文本过长（>100,000字符） | 返回400，提示超长 | 400 |
| Gemini API超时 | 重试3次，失败返回500 | 500 |
| Gemini返回格式错误 | 返回500，记录日志 | 500 |
| Milvus连接失败 | 重试3次，失败返回500 | 500 |
| 用户未登录 | 返回401 | 401 |
| 超过限流 | 返回429 | 429 |

---

### 7. 监控指标

建议监控以下指标：

1. **性能指标**
   - API响应时间（P50/P95/P99）
   - Gemini调用耗时
   - Milvus检索耗时
   - 整体成功率

2. **业务指标**
   - 每天调用次数
   - 平均识别说话人数量
   - 音色匹配成功率（match_score ≥ 0.6的比例）
   - Fallback使用率

3. **质量指标**
   - 用户手动修改匹配结果的比例
   - 用户反馈（点赞/点踩）

---

## 部署要求

### 环境变量

```bash
# Gemini API
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash  # 或 gemini-2.5-pro

# Milvus
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_USER=root
MILVUS_PASSWORD=your_password

# Redis缓存
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# API限流
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_SECONDS=60
```

### 依赖服务

| 服务 | 版本 | 用途 |
|------|------|------|
| Gemini API | 2.5 Flash/Pro | LLM分析文本 |
| Milvus | ≥2.3 | 向量检索 |
| Redis | ≥7.0 | 缓存&限流 |
| PostgreSQL | ≥14 | Voice Library元数据 |

---

## 联系方式

如有API实现问题，请联系：
- 前端团队：frontend@example.com
- 产品经理：pm@example.com

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 1.0 | 2026-02-09 | 初版发布 |
