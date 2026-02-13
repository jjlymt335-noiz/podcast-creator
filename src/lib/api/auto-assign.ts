import { apiClient } from './client';
import type { AutoAssignVoicesRequest, AutoAssignVoicesResponse } from '@/types/api';
import * as gemini from './gemini';
import * as geminiSeg from './gemini-segmentation';
import * as voiceLibrary from './voice-library';
import * as voiceDesign from './voice-design';

// Auto-assign Voices API封装（真实实现 + Mock降级）

// 控制是否使用Mock数据（false = 使用真实Gemini + Noiz API）
const USE_MOCK = false;

/**
 * Mock数据生成器 - 智能识别对话结构
 */
function generateMockAutoAssignResponse(text: string, language: string): AutoAssignVoicesResponse {
  // 改进的对话识别正则，支持：A：、B：、A (主持人)：、主持人：等格式
  // 匹配模式：字母或中文开头，后面可以有括号内容，然后是冒号
  const dialoguePattern = /([A-Za-z一-龥]+(?:\s*[（(][^)）]*[)）])?)\s*[：:]\s*/g;
  const matches = [...text.matchAll(dialoguePattern)];

  console.log('Text length:', text.length);
  console.log('Found dialogue matches:', matches.length);

  if (matches.length > 1) {
    // 检测到对话格式，按说话人切分
    return parseDialogueFormat(text, language, matches);
  } else {
    // 没有明显的对话格式，按段落切分
    console.log('No dialogue format found, using paragraph split');
    return parseByParagraphs(text, language);
  }
}

/**
 * 解析对话格式文本 (A: xxx, B: xxx)
 */
function parseDialogueFormat(
  text: string,
  language: string,
  matches: RegExpMatchArray[]
): AutoAssignVoicesResponse {
  const speakerMap = new Map<string, { name: string; role: string | null; segments: any[] }>();
  let lastIndex = 0;

  matches.forEach((match, idx) => {
    // 提取说话人名称（mock regex只有1个捕获组，index=1）
    let speakerRaw = match[1].trim();

    // 归一化speaker识别：提取基础名称和角色
    // 例如："A (主持人)" -> baseName="A", role="主持人"
    //       "A" -> baseName="A", role=null
    const bracketMatch = speakerRaw.match(/^([A-Za-z一-龥]+)\s*[（(]([^)）]+)[)）]/);
    const baseName = bracketMatch ? bracketMatch[1] : speakerRaw;
    const role = bracketMatch ? bracketMatch[2] : null;

    const segmentStart = match.index!;
    const nextMatch = matches[idx + 1];
    const segmentEnd = nextMatch ? nextMatch.index! : text.length;

    // 提取文本内容（去除说话人标记）
    let segmentText = text.slice(segmentStart, segmentEnd).trim();
    // 移除开头的说话人标记
    segmentText = segmentText.replace(/^[A-Za-z一-龥]+(?:\s*[（(][^)）]*[)）])?\s*[：:]\s*/, '').trim();

    // 使用baseName作为唯一标识，合并同一个speaker的所有segments
    if (!speakerMap.has(baseName)) {
      speakerMap.set(baseName, {
        name: baseName,
        role: role, // 保存第一次出现的角色信息
        segments: [],
      });
    } else if (role && !speakerMap.get(baseName)!.role) {
      // 如果之前没有角色信息，但这次有，更新角色信息
      speakerMap.get(baseName)!.role = role;
    }

    speakerMap.get(baseName)!.segments.push({
      text: segmentText,
      start_index: segmentStart,
      end_index: segmentEnd,
    });

    lastIndex = segmentEnd;
  });

  console.log('Normalized speakers:', Array.from(speakerMap.entries()).map(([key, val]) => `${key} (${val.role || 'no role'}): ${val.segments.length} segments`));

  const speakers = Array.from(speakerMap.entries()).map(([baseName, data], idx) => {
    // 生成清晰的说话人名称（不保留原始A/B标记）
    const cleanSpeakerName = data.role || (idx === 0 ? 'Host' : idx === 1 ? 'Guest' : `Speaker ${idx + 1}`);
    const speakerId = `speaker_${idx + 1}`;

    return {
      speaker_id: speakerId,
      speaker_name: cleanSpeakerName,
      character_description: data.role || (idx === 0 ? 'Primary speaker' : `Speaker ${idx + 1}`),
      segments: data.segments,
      matched_voice: {
        voice_id: `mock_voice_${idx + 1}`,
        display_name: idx === 0 ? 'Emma' : `Voice ${idx + 1}`,
        match_score: 0.85 - idx * 0.05,
        match_reason: 'Mock matched based on character traits',
        source: (idx % 2 === 0 ? 'public_library' : 'user_library') as 'public_library' | 'user_library',
        tags: ['warm', 'friendly', language],
        language,
        gender: idx % 2 === 0 ? 'female' : 'male',
        age: 'adult',
      },
      voice_design_fallback: null,
    };
  });

  return {
    speakers,
    processing_time_ms: 1500,
    total_speakers: speakers.length,
    total_segments: speakers.reduce((sum, s) => sum + s.segments.length, 0),
  };
}

/**
 * 按段落切分（降级方案）
 */
function parseByParagraphs(text: string, language: string): AutoAssignVoicesResponse {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const speakerCount = Math.min(Math.max(2, Math.ceil(paragraphs.length / 3)), 4);
  const speakers = [];

  for (let i = 0; i < speakerCount; i++) {
    const speakerParagraphs = paragraphs.filter((_, idx) => idx % speakerCount === i);
    const segments = speakerParagraphs.map((para) => {
      const allText = paragraphs.join('\n\n');
      const startIndex = allText.indexOf(para);
      return {
        text: para,
        start_index: startIndex,
        end_index: startIndex + para.length,
      };
    });

    speakers.push({
      speaker_id: `speaker_${i + 1}`,
      speaker_name: i === 0 ? 'Host' : `Guest ${i}`,
      character_description: i === 0 ? 'Primary speaker' : `Speaker ${i + 1}`,
      segments,
      matched_voice: {
        voice_id: `mock_voice_${i + 1}`,
        display_name: i === 0 ? 'Emma' : `Voice ${i + 1}`,
        match_score: 0.85 - i * 0.05,
        match_reason: 'Mock matched based on character traits',
        source: (i % 2 === 0 ? 'public_library' : 'user_library') as 'public_library' | 'user_library',
        tags: ['warm', 'friendly', language],
        language,
        gender: i % 2 === 0 ? 'female' : 'male',
        age: 'adult',
      },
      voice_design_fallback: null,
    });
  }

  return {
    speakers,
    processing_time_ms: 1500,
    total_speakers: speakers.length,
    total_segments: speakers.reduce((sum, s) => sum + s.segments.length, 0),
  };
}

/**
 * 为单个说话人匹配或生成音色
 * 优先从 Voice Library 搜索；搜索无果时走 Voice Design 自动生成并保存
 */
/**
 * 从 Voice Library 搜索一条音色，尝试多个搜索策略
 * 返回找到的 Voice 或 null
 */
async function findVoiceFromLibrary(
  speakerName: string,
  char: { gender?: string; age?: string; suggested_tags: string[] },
  language: string,
  excludeVoiceIds: Set<string> = new Set(),
): Promise<any | null> {
  // 策略列表：从精确到宽泛
  const strategies = [
    // 1. keyword + gender + age
    {
      label: 'keyword+gender+age',
      params: { keyword: char.suggested_tags.slice(0, 3).join(' '), gender: char.gender, age: char.age, language_type: language, limit: 20 },
    },
    // 2. gender + language（去掉 keyword 和 age）
    {
      label: 'gender+language',
      params: { gender: char.gender, language_type: language, limit: 20 },
    },
    // 3. 仅 language（最宽泛）
    {
      label: 'language-only',
      params: { language_type: language, limit: 20 },
    },
    // 4. 无筛选（兜底）
    {
      label: 'no-filter',
      params: { limit: 20 },
    },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`🔍 [${strategy.label}] Searching Voice Library for ${speakerName}:`, strategy.params);
      const result = await voiceLibrary.getPublicVoices(strategy.params);

      if (result.voices && result.voices.length > 0) {
        // 跳过已分配给其他说话人的音色
        const available = result.voices.filter((v: any) => !excludeVoiceIds.has(v.voice_id));
        if (available.length > 0) {
          console.log(`✅ [${strategy.label}] Found ${available.length} available voices for ${speakerName} (excluded ${excludeVoiceIds.size})`);
          return available[0];
        }
        console.log(`⚠️ [${strategy.label}] Found ${result.voices.length} voices but all already assigned`);
      } else {
        console.log(`❌ [${strategy.label}] No voices found`);
      }
    } catch (error) {
      console.warn(`⚠️ [${strategy.label}] Search failed:`, error);
    }
  }

  // 5. 最后尝试 pinned voices
  try {
    console.log(`🔍 [pinned] Trying pinned voices for ${speakerName}`);
    const pinned = await voiceLibrary.getPinnedVoices(language);
    if (pinned && pinned.length > 0) {
      const available = pinned.filter((v: any) => !excludeVoiceIds.has(v.voice_id));
      if (available.length > 0) {
        console.log(`✅ [pinned] Found ${available.length} available pinned voices`);
        return available[0];
      }
    }
  } catch (error) {
    console.warn(`⚠️ [pinned] Failed:`, error);
  }

  return null;
}

async function matchOrDesignVoice(
  speakerName: string,
  char: {
    gender?: string;
    age?: string;
    voice_description: string;
    suggested_tags: string[];
  },
  language: string,
  excludeVoiceIds: Set<string> = new Set(),
): Promise<{ matched_voice: any; voice_design_fallback: any }> {
  let matched_voice = null;

  // Step A: 从 Voice Library 搜索（多策略降级，排除已分配的音色）
  const foundVoice = await findVoiceFromLibrary(speakerName, char, language, excludeVoiceIds);

  if (foundVoice) {
    matched_voice = {
      voice_id: foundVoice.voice_id,
      display_name: foundVoice.display_name,
      match_score: 0.85,
      match_reason: `Matched: ${char.suggested_tags.slice(0, 3).join(', ')}`,
      source: foundVoice.voice_type === 'built-in' ? 'public_library' : 'user_library',
      tags: char.suggested_tags,
      language,
      gender: char.gender || 'neutral',
      age: char.age || 'adult',
    };
    console.log(`✅ Voice Library matched for ${speakerName}: ${foundVoice.display_name} (${foundVoice.voice_id})`);
    return { matched_voice, voice_design_fallback: null };
  }

  // Step B: Voice Library 全部失败 → 走 Voice Design 自动生成
  console.log(`🎨 No Voice Library match for ${speakerName}, using Voice Design...`);

  try {
    const designResult = await voiceDesign.generateVoiceDesign({
      voice_description: char.voice_description,
    });

    if (designResult.previews && designResult.previews.length > 0) {
      const preview = designResult.previews[0];
      const displayName = designResult.features?.display_name || speakerName;

      console.log(`💾 Saving designed voice for ${speakerName}: ${displayName}`);
      const saved = await voiceDesign.saveVoiceDesign({
        generated_voice_id: preview.generated_voice_id,
        display_name: displayName,
        voice_description: char.voice_description,
        gender: char.gender,
        age: char.age,
        language_type: language,
      });

      matched_voice = {
        voice_id: saved.voice_id,
        display_name: displayName,
        match_score: 0.7,
        match_reason: `Voice Design: ${char.voice_description}`,
        source: 'user_library',
        tags: char.suggested_tags,
        language,
        gender: char.gender || 'neutral',
        age: char.age || 'adult',
      };
      console.log(`✅ Voice Design created for ${speakerName}: ${displayName} (${saved.voice_id})`);
    }
  } catch (designError) {
    console.error(`❌ Voice Design failed for ${speakerName}:`, designError);
  }

  return {
    matched_voice,
    voice_design_fallback: matched_voice ? null : {
      description: char.voice_description,
      suggested_tags: char.suggested_tags,
    },
  };
}

/**
 * 真实的auto-assign实现
 * 1. 解析对话识别speakers
 * 2. 使用Gemini分析每个speaker的特征
 * 3. 从Voice Library搜索匹配的音色
 * 4. 如果无匹配，自动走Voice Design生成并保存
 */
async function realAutoAssignVoices(params: AutoAssignVoicesRequest): Promise<AutoAssignVoicesResponse> {
  console.log('🚀 [REAL AUTO-ASSIGN] Starting...');
  console.log('📝 Text length:', params.text.length);
  console.log('🌍 Language:', params.language);

  const startTime = Date.now();

  // Step 1: 解析对话，识别speakers
  // 严格匹配：识别短名称（1-3个字符）+ 可选括号 + 冒号
  // 例如: "A:", "B (嘉宾):", "主持人:", "Alice:"
  // 排除: "重点讲一个问题:", "告诉全行业:" 这种长句
  // 要求：前面必须是空格、句号、换行或字符串开头（避免匹配句子中间）
  const dialoguePattern = /(^|[\s。！？\n])([A-Za-z一-龥]{1,3}(?:\s*[（(][^)）]*[)）])?)\s*[：:]\s*/gm;
  const matches = [...params.text.matchAll(dialoguePattern)];

  console.log(`🔍 Found ${matches.length} dialogue markers using strict pattern`);
  if (matches.length > 0) {
    console.log('📋 Sample matches:', matches.slice(0, 5).map(m => m[2]));
  }

  if (matches.length < 2) {
    console.log('⚠️ No clear dialogue format detected');
    console.log('🤖 Using Gemini intelligent segmentation instead...');

    // 使用Gemini智能切分
    try {
      const segmented = await geminiSeg.segmentDialogueWithGemini(params.text, params.language);
      console.log(`✅ Gemini segmented into ${segmented.segments.length} segments`);

      // 按说话人分组
      const speakerMap = new Map<string, { role: string | null; segments: any[] }>();

      segmented.segments.forEach((seg) => {
        const speakerName = seg.speaker_name;
        const role = seg.speaker_role || null;

        if (!speakerMap.has(speakerName)) {
          speakerMap.set(speakerName, { role, segments: [] });
        }

        speakerMap.get(speakerName)!.segments.push({
          text: seg.text,
          start_index: seg.start_index,
          end_index: seg.end_index,
        });
      });

      // 继续使用Gemini分析特征和匹配音色
      const speakerArray = Array.from(speakerMap.entries()).map(([name, data]) => ({
        name,
        role: data.role,
        dialogueText: data.segments.map(s => s.text).join('\n'),
      }));

      console.log(`👥 Detected ${speakerArray.length} speakers from Gemini segmentation:`, speakerArray.map(s => s.name));

      // 继续执行后续的分析和匹配步骤（复用下面的代码）
      const characteristics = await gemini.analyzeSpeakersCharacteristics(
        speakerArray.map((s) => ({ name: s.name, dialogueText: s.dialogueText })),
        params.language
      );

      console.log('✅ Gemini analysis complete:', characteristics.map(c => ({
        name: c.speaker_name,
        gender: c.gender,
        tags: c.suggested_tags.slice(0, 3)
      })));

      // 顺序为每个speaker匹配音色（避免分配重复音色）
      const usedVoiceIds = new Set<string>();
      const speakers = [];

      for (let idx = 0; idx < speakerArray.length; idx++) {
        const speakerData = speakerArray[idx];
        const char = characteristics[idx];
        const segments = speakerMap.get(speakerData.name)!.segments;
        const cleanSpeakerName = speakerData.role || (idx === 0 ? 'Host' : idx === 1 ? 'Guest' : `Speaker ${idx + 1}`);
        const speakerId = `speaker_${idx + 1}`;

        const { matched_voice, voice_design_fallback } = await matchOrDesignVoice(
          speakerData.name,
          char,
          params.language,
          usedVoiceIds,
        );

        if (matched_voice?.voice_id) {
          usedVoiceIds.add(matched_voice.voice_id);
        }

        console.log(`✨ Assigned voice for ${speakerData.name}:`, {
          speakerId,
          cleanName: cleanSpeakerName,
          voiceId: matched_voice?.voice_id,
          voiceName: matched_voice?.display_name,
        });

        speakers.push({
          speaker_id: speakerId,
          speaker_name: cleanSpeakerName,
          character_description: char.voice_description,
          segments,
          matched_voice,
          voice_design_fallback,
        });
      }

      const processingTime = Date.now() - startTime;

      return {
        speakers,
        processing_time_ms: processingTime,
        total_speakers: speakers.length,
        total_segments: speakers.reduce((sum, s) => sum + s.segments.length, 0),
      };
    } catch (error) {
      console.error('❌ Gemini segmentation failed:', error);
      throw error; // 向上抛出错误，让外层处理
    }
  }

  // 提取每个speaker的对话
  const speakerDialogues = new Map<string, { role: string | null; text: string }>();

  matches.forEach((match, idx) => {
    const speakerRaw = match[2].trim();
    const bracketMatch = speakerRaw.match(/^([A-Za-z一-龥]+)\s*[（(]([^)）]+)[)）]/);
    const baseName = bracketMatch ? bracketMatch[1] : speakerRaw;
    const role = bracketMatch ? bracketMatch[2] : null;

    const segmentStart = match.index!;
    const nextMatch = matches[idx + 1];
    const segmentEnd = nextMatch ? nextMatch.index! : params.text.length;

    let segmentText = params.text.slice(segmentStart, segmentEnd).trim();
    segmentText = segmentText.replace(/^[A-Za-z一-龥]+(?:\s*[（(][^)）]*[)）])?\s*[：:]\s*/, '').trim();

    if (!speakerDialogues.has(baseName)) {
      speakerDialogues.set(baseName, { role, text: segmentText });
    } else {
      speakerDialogues.get(baseName)!.text += '\n' + segmentText;
    }
  });

  console.log(`👥 Detected ${speakerDialogues.size} speakers:`, Array.from(speakerDialogues.keys()));

  // Step 2: 使用Gemini分析每个speaker的特征
  console.log('🤖 Calling Gemini API to analyze speaker characteristics...');
  const speakerArray = Array.from(speakerDialogues.entries()).map(([name, data]) => ({
    name,
    role: data.role,
    dialogueText: data.text,
  }));

  const characteristics = await gemini.analyzeSpeakersCharacteristics(
    speakerArray.map((s) => ({ name: s.name, dialogueText: s.dialogueText })),
    params.language
  );

  console.log('✅ Gemini analysis complete:', characteristics.map(c => ({
    name: c.speaker_name,
    gender: c.gender,
    tags: c.suggested_tags.slice(0, 3)
  })));

  // Step 3: 顺序为每个speaker匹配音色（避免分配重复音色）
  const usedVoiceIds = new Set<string>();
  const speakers = [];

  for (let idx = 0; idx < speakerArray.length; idx++) {
    const speakerData = speakerArray[idx];
    const char = characteristics[idx];
    const cleanSpeakerName = speakerData.role || (idx === 0 ? 'Host' : idx === 1 ? 'Guest' : `Speaker ${idx + 1}`);
    const speakerId = `speaker_${idx + 1}`;

    // 解析该说话人的segments
    const segments: any[] = [];
    matches.forEach((match) => {
      const speakerRaw = match[2].trim();
      const bracketMatch = speakerRaw.match(/^([A-Za-z一-龥]+)\s*[（(]([^)）]+)[)）]/);
      const baseName = bracketMatch ? bracketMatch[1] : speakerRaw;

      if (baseName === speakerData.name) {
        const segmentStart = match.index!;
        const nextMatchIdx = matches.indexOf(match) + 1;
        const nextMatch = matches[nextMatchIdx];
        const segmentEnd = nextMatch ? nextMatch.index! : params.text.length;

        let segmentText = params.text.slice(segmentStart, segmentEnd).trim();
        segmentText = segmentText.replace(/^[A-Za-z一-龥]+(?:\s*[（(][^)）]*[)）])?\s*[：:]\s*/, '').trim();

        segments.push({
          text: segmentText,
          start_index: segmentStart,
          end_index: segmentEnd,
        });
      }
    });

    const { matched_voice, voice_design_fallback } = await matchOrDesignVoice(
      speakerData.name,
      char,
      params.language,
      usedVoiceIds,
    );

    if (matched_voice?.voice_id) {
      usedVoiceIds.add(matched_voice.voice_id);
    }

    console.log(`✨ Assigned voice for ${speakerData.name}:`, {
      speakerId,
      cleanName: cleanSpeakerName,
      voiceId: matched_voice?.voice_id,
      voiceName: matched_voice?.display_name,
    });

    speakers.push({
      speaker_id: speakerId,
      speaker_name: cleanSpeakerName,
      character_description: char.voice_description,
      segments,
      matched_voice,
      voice_design_fallback,
    });
  }

  const processingTime = Date.now() - startTime;

  return {
    speakers,
    processing_time_ms: processingTime,
    total_speakers: speakers.length,
    total_segments: speakers.reduce((sum, s) => sum + s.segments.length, 0),
  };
}

/**
 * 自动分配音色（角色识别 + 音色匹配）
 *
 * Mock模式：
 * - 使用简单规则生成模拟的角色和音色匹配
 * - 可用于前端开发和演示
 *
 * 真实模式：
 * - 调用Gemini LLM识别角色特征
 * - 使用Noiz Voice Library API匹配音色
 * - 如果无匹配，自动走Voice Design生成并保存到音色库
 *
 * @param params 请求参数
 */
export async function autoAssignVoices(params: AutoAssignVoicesRequest): Promise<AutoAssignVoicesResponse> {
  console.log('=' .repeat(60));
  console.log('🎯 AUTO-ASSIGN VOICES CALLED');
  console.log('=' .repeat(60));
  console.log('Mode:', USE_MOCK ? '🎭 MOCK' : '✨ REAL (Gemini + Voice Library)');
  console.log('Text preview:', params.text.slice(0, 100) + '...');
  console.log('-'.repeat(60));

  if (USE_MOCK) {
    // Mock模式：模拟API延迟
    console.log('⏳ Using Mock mode with simulated delay...');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return generateMockAutoAssignResponse(params.text, params.language);
  }

  // 真实模式：使用Gemini + Voice Library
  try {
    console.log('🚀 Invoking REAL auto-assign with Gemini + Voice Library...');
    const result = await realAutoAssignVoices(params);
    console.log('✅ REAL auto-assign completed successfully!');
    console.log('=' .repeat(60));
    return result;
  } catch (error) {
    console.error('❌ Auto-assign voices error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    // 降级到Mock模式
    console.warn('⚠️ Falling back to mock data due to error');
    console.log('=' .repeat(60));
    return generateMockAutoAssignResponse(params.text, params.language);
  }
}

/**
 * 检查Auto-assign API是否可用
 */
export async function checkAutoAssignAvailability(): Promise<boolean> {
  if (USE_MOCK) {
    return true;
  }

  try {
    await apiClient.get('/api/v2/podcast/health');
    return true;
  } catch {
    return false;
  }
}

/**
 * 切换Mock/Real模式（用于开发调试）
 */
export function setAutoAssignMode(useMock: boolean): void {
  if (typeof window !== 'undefined') {
    (window as any).__USE_MOCK_AUTO_ASSIGN__ = useMock;
  }
}
