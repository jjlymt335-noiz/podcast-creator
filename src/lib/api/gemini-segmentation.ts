// Gemini智能文本切分 - 用于无明确说话人标记的文本

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface SegmentedDialogue {
  segments: Array<{
    speaker_name: string;
    speaker_role?: string;
    text: string;
    start_index: number;
    end_index: number;
  }>;
}

/**
 * 使用Gemini智能切分对话
 * 适用于没有明确 "A:" "B:" 标记的文本
 */
export async function segmentDialogueWithGemini(text: string, language: string): Promise<SegmentedDialogue> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `You are analyzing a podcast/audiobook transcript that doesn't have clear speaker markers.

Language: ${language}
Text:
${text.slice(0, 3000)}${text.length > 3000 ? '\n... (text truncated for analysis)' : ''}

Task: Intelligently segment this text into speaker turns. Identify:
1. How many speakers are there (usually 1-4)
2. Where each speaker change occurs
3. What role each speaker plays (host, guest, narrator, etc.)

Rules:
- Detect natural dialogue boundaries (topic changes, turn-taking cues, speaking style shifts)
- If only one speaker, create segments by natural breaks (paragraphs)
- For podcasts, typically has 2 speakers (host + guest)
- Be conservative - better to have fewer, longer segments than too many short ones

Respond ONLY with valid JSON in this exact format:
{
  "segments": [
    {
      "speaker_name": "A",
      "speaker_role": "Host",
      "text": "full text of what this speaker says",
      "start_index": 0,
      "end_index": 150
    },
    {
      "speaker_name": "B",
      "speaker_role": "Guest",
      "text": "full text of what this speaker says",
      "start_index": 151,
      "end_index": 300
    }
  ]
}

Important:
- speaker_name should be simple: "A", "B", "C", etc. or "Host", "Guest", "Narrator"
- start_index and end_index must match the original text positions
- Include ALL text - don't omit any parts
- Segments should be in chronological order`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // 更低的temperature以保证一致性
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No response from Gemini');
    }

    // 提取JSON
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    const result: SegmentedDialogue = JSON.parse(jsonMatch[0]);

    // 验证结果
    if (!result.segments || result.segments.length === 0) {
      throw new Error('Gemini returned empty segments');
    }

    console.log(`Gemini segmented text into ${result.segments.length} segments across ${new Set(result.segments.map(s => s.speaker_name)).size} speakers`);

    return result;
  } catch (error) {
    console.error('Gemini segmentation error:', error);

    // 降级：简单按段落切分
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const segments = paragraphs.map((para, idx) => {
      const startIndex = text.indexOf(para);
      return {
        speaker_name: idx % 2 === 0 ? 'A' : 'B',
        speaker_role: idx % 2 === 0 ? 'Host' : 'Guest',
        text: para.trim(),
        start_index: startIndex,
        end_index: startIndex + para.length,
      };
    });

    return { segments };
  }
}
