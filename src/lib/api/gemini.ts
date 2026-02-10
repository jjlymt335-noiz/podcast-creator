// Gemini API客户端，用于角色特征分析

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// 使用 Gemini 2.5 Flash - 最新最快的模型，性价比最高
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface SpeakerCharacteristics {
  speaker_name: string;
  gender?: 'male' | 'female' | 'neutral';
  age?: 'child' | 'young_adult' | 'adult' | 'elderly';
  personality_traits: string[];
  voice_description: string;
  suggested_tags: string[];
  emotions?: string[];
}

/**
 * 使用Gemini分析speaker的特征
 */
export async function analyzeSpeakerCharacteristics(
  speakerName: string,
  dialogueText: string,
  language: string
): Promise<SpeakerCharacteristics> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `You are analyzing a character in a podcast/audiobook for voice casting.

Speaker: ${speakerName}
Language: ${language}
Dialogue samples:
${dialogueText.slice(0, 1000)} ${dialogueText.length > 1000 ? '...' : ''}

Based on the dialogue, analyze this speaker's characteristics for voice casting:
1. Gender (male/female/neutral)
2. Age group (child/young_adult/adult/elderly)
3. Personality traits (3-5 keywords like: warm, professional, energetic, calm, etc.)
4. Voice description (1-2 sentences describing ideal voice characteristics)
5. Suggested voice tags (5-8 tags for voice library search: e.g., friendly, narrator, deep, soft, etc.)
6. Emotions expressed (e.g., happy, serious, enthusiastic, etc.)

Respond ONLY with a valid JSON object in this exact format:
{
  "speaker_name": "${speakerName}",
  "gender": "male|female|neutral",
  "age": "child|young_adult|adult|elderly",
  "personality_traits": ["trait1", "trait2", "trait3"],
  "voice_description": "description here",
  "suggested_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "emotions": ["emotion1", "emotion2"]
}`;

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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
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

    // 提取JSON（可能包裹在```json...```中）
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    const characteristics: SpeakerCharacteristics = JSON.parse(jsonMatch[0]);
    return characteristics;
  } catch (error) {
    console.error('Gemini API error:', error);
    // 返回降级的默认值
    return {
      speaker_name: speakerName,
      gender: 'neutral',
      age: 'adult',
      personality_traits: ['professional', 'clear', 'neutral'],
      voice_description: `A clear and professional voice suitable for ${speakerName}`,
      suggested_tags: ['professional', 'clear', 'narrator', language],
      emotions: ['neutral'],
    };
  }
}

/**
 * 批量分析多个speakers
 */
export async function analyzeSpeakersCharacteristics(
  speakers: Array<{ name: string; dialogueText: string }>,
  language: string
): Promise<SpeakerCharacteristics[]> {
  const results = await Promise.all(
    speakers.map((speaker) =>
      analyzeSpeakerCharacteristics(speaker.name, speaker.dialogueText, language)
    )
  );
  return results;
}
