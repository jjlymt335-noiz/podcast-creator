import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectSpeaker, ProjectSegment, DocumentParseResult } from '@/types/project';
import * as api from '@/lib/api';

interface ProjectState {
  // 当前项目
  currentProject: Project | null;

  // 操作方法
  createProject: (doc: DocumentParseResult) => void;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  updateProjectTitle: (title: string) => void;
  updateSourceText: (text: string) => void;

  // Speaker管理
  addSpeaker: (name: string) => string; // returns speaker_id
  updateSpeaker: (speakerId: string, updates: Partial<ProjectSpeaker>) => void;
  assignVoiceToSpeaker: (speakerId: string, voiceId: string, voiceName?: string) => void;

  // Segment管理
  addSegment: (speakerId: string, afterSegmentId?: string) => string; // returns new segment id
  updateSegment: (segmentId: string, updates: Partial<ProjectSegment>) => void;
  splitSegment: (segmentId: string, splitIndex: number) => void;
  mergeSegments: (segmentId1: string, segmentId2: string) => void;
  addEmotionTag: (segmentId: string, position: number, emotionValue: string) => void;
  splitSegmentWithPause: (segmentId: string, position: number, pauseDuration: number) => void;
  deleteSegments: (segmentIds: string[]) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;
  reorderZoneSfx: (speechSegmentId: string, newSfxIdOrder: string[]) => void;

  // SFX 音效管理
  sfxAudioBlobs: Record<string, Blob>;
  insertSfxSegment: (afterSegmentId: string | null, text?: string, duration?: number) => void;
  removeSfxSegment: (segmentId: string) => void;
  updateSfxSegment: (segmentId: string, updates: { text?: string; sfx_duration?: number }) => void;
  generateSfxAudio: (segmentId: string) => Promise<Blob>;

  // Auto-assign
  autoAssignVoices: (userId: string) => Promise<void>;

  // TTS生成
  generateAudio: () => Promise<void>;
  checkGenerationProgress: (genProductId: string) => Promise<void>;

  // 导出
  exportAudio: () => Promise<string | null>;

  // 重置
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      sfxAudioBlobs: {} as Record<string, Blob>,

      // ── SFX 音效管理 ──────────────────────────────────────────

      insertSfxSegment: (afterSegmentId: string | null, text?: string, duration?: number) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const newSegment: ProjectSegment = {
          id: `sfx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'sfx',
          speaker_id: '__sfx__',
          text: text || '',
          voice_id: null,
          start_index: -1,
          end_index: -1,
          sfx_duration: duration || 5,
        };

        let updatedSegments: ProjectSegment[];
        if (afterSegmentId === null) {
          updatedSegments = [newSegment, ...currentProject.segments];
        } else {
          const index = currentProject.segments.findIndex((s) => s.id === afterSegmentId);
          if (index === -1) return;
          updatedSegments = [
            ...currentProject.segments.slice(0, index + 1),
            newSegment,
            ...currentProject.segments.slice(index + 1),
          ];
        }

        set({
          currentProject: {
            ...currentProject,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });
      },

      removeSfxSegment: (segmentId: string) => {
        const { currentProject, sfxAudioBlobs } = get();
        if (!currentProject) return;

        const segment = currentProject.segments.find((s) => s.id === segmentId);
        if (!segment || (segment.type || 'speech') !== 'sfx') return;

        const updatedBlobs = { ...sfxAudioBlobs };
        delete updatedBlobs[segmentId];

        set({
          currentProject: {
            ...currentProject,
            segments: currentProject.segments.filter((s) => s.id !== segmentId),
            updated_at: Date.now(),
          },
          sfxAudioBlobs: updatedBlobs,
        });
      },

      updateSfxSegment: (segmentId: string, updates: { text?: string; sfx_duration?: number }) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: {
            ...currentProject,
            segments: currentProject.segments.map((s) =>
              s.id === segmentId ? { ...s, ...updates } : s
            ),
            updated_at: Date.now(),
          },
        });
      },

      generateSfxAudio: async (segmentId: string) => {
        const { currentProject } = get();
        if (!currentProject) throw new Error('No project');

        const segment = currentProject.segments.find((s) => s.id === segmentId);
        if (!segment || (segment.type || 'speech') !== 'sfx') throw new Error('Not an SFX segment');
        if (!segment.text.trim()) throw new Error('SFX description is empty');

        const audioBlob = await api.generateSoundEffect({
          text: segment.text,
          duration: segment.sfx_duration || 5,
        });

        set({
          sfxAudioBlobs: {
            ...get().sfxAudioBlobs,
            [segmentId]: audioBlob,
          },
        });

        return audioBlob;
      },

      // ── 项目 CRUD ─────────────────────────────────────────────

      createProject: (doc: DocumentParseResult) => {
        const projectId = `project_${Date.now()}`;

        const newProject: Project = {
          id: projectId,
          title: doc.title || 'Untitled Project',
          source_text: doc.text,
          language: doc.language,
          speakers: [],
          segments: [],
          created_at: Date.now(),
          updated_at: Date.now(),
          status: 'draft',
        };

        set({ currentProject: newProject });
      },

      loadProject: async (projectId: string) => {
        // 从localStorage加载项目
        const stored = localStorage.getItem(`project_${projectId}`);
        if (stored) {
          const project: Project = JSON.parse(stored);
          set({ currentProject: project });
        } else {
          throw new Error('Project not found');
        }
      },

      saveProject: async () => {
        const { currentProject } = get();
        if (!currentProject) return;

        // 更新时间戳
        const updatedProject = {
          ...currentProject,
          updated_at: Date.now(),
        };

        // 保存到localStorage
        localStorage.setItem(`project_${currentProject.id}`, JSON.stringify(updatedProject));
        set({ currentProject: updatedProject });
      },

      updateProjectTitle: (title: string) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: {
            ...currentProject,
            title,
            updated_at: Date.now(),
          },
        });
      },

      updateSourceText: (text: string) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: {
            ...currentProject,
            source_text: text,
            updated_at: Date.now(),
          },
        });
      },

      addSpeaker: (name: string): string => {
        const { currentProject } = get();
        if (!currentProject) return '';

        const speakerId = `speaker_${Date.now()}`;
        const newSpeaker: ProjectSpeaker = {
          speaker_id: speakerId,
          speaker_name: name,
          voice_id: null,
          segments: [],
        };

        set({
          currentProject: {
            ...currentProject,
            speakers: [...currentProject.speakers, newSpeaker],
            updated_at: Date.now(),
          },
        });

        return speakerId;
      },

      updateSpeaker: (speakerId: string, updates: Partial<ProjectSpeaker>) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const updatedSpeakers = currentProject.speakers.map((speaker) =>
          speaker.speaker_id === speakerId ? { ...speaker, ...updates } : speaker
        );

        set({
          currentProject: {
            ...currentProject,
            speakers: updatedSpeakers,
            updated_at: Date.now(),
          },
        });
      },

      assignVoiceToSpeaker: (speakerId: string, voiceId: string, voiceName?: string) => {
        const { currentProject } = get();
        if (!currentProject) return;

        // 更新speaker的voice
        const updatedSpeakers = currentProject.speakers.map((speaker) =>
          speaker.speaker_id === speakerId
            ? { ...speaker, voice_id: voiceId, voice_name: voiceName }
            : speaker
        );

        // 更新该speaker的所有segments
        const updatedSegments = currentProject.segments.map((segment) =>
          segment.speaker_id === speakerId ? { ...segment, voice_id: voiceId } : segment
        );

        set({
          currentProject: {
            ...currentProject,
            speakers: updatedSpeakers,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });
      },

      addSegment: (speakerId: string, afterSegmentId?: string): string => {
        const { currentProject } = get();
        if (!currentProject) return '';

        const speaker = currentProject.speakers.find((s) => s.speaker_id === speakerId);
        const newId = `seg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newSegment: ProjectSegment = {
          id: newId,
          speaker_id: speakerId,
          text: '',
          voice_id: speaker?.voice_id ?? null,
          start_index: 0,
          end_index: 0,
        };

        let updatedSegments: ProjectSegment[];
        if (afterSegmentId) {
          const idx = currentProject.segments.findIndex((s) => s.id === afterSegmentId);
          updatedSegments = [...currentProject.segments];
          updatedSegments.splice(idx + 1, 0, newSegment);
        } else {
          updatedSegments = [...currentProject.segments, newSegment];
        }

        set({
          currentProject: {
            ...currentProject,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });

        return newId;
      },

      updateSegment: (segmentId: string, updates: Partial<ProjectSegment>) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const updatedSegments = currentProject.segments.map((segment) =>
          segment.id === segmentId ? { ...segment, ...updates } : segment
        );

        set({
          currentProject: {
            ...currentProject,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });
      },

      splitSegment: (segmentId: string, splitIndex: number) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const segment = currentProject.segments.find((s) => s.id === segmentId);
        if (!segment) return;

        const text1 = segment.text.slice(0, splitIndex);
        const text2 = segment.text.slice(splitIndex);

        const newSegment1: ProjectSegment = {
          ...segment,
          text: text1,
          end_index: segment.start_index + splitIndex,
        };

        const newSegment2: ProjectSegment = {
          ...segment,
          id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          text: text2,
          start_index: segment.start_index + splitIndex,
        };

        const updatedSegments = currentProject.segments.flatMap((s) =>
          s.id === segmentId ? [newSegment1, newSegment2] : [s]
        );

        set({
          currentProject: {
            ...currentProject,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });
      },

      mergeSegments: (segmentId1: string, segmentId2: string) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const segment1 = currentProject.segments.find((s) => s.id === segmentId1);
        const segment2 = currentProject.segments.find((s) => s.id === segmentId2);

        if (!segment1 || !segment2) return;

        const mergedSegment: ProjectSegment = {
          ...segment1,
          text: segment1.text + ' ' + segment2.text,
          end_index: segment2.end_index,
        };

        const updatedSegments = currentProject.segments
          .filter((s) => s.id !== segmentId2)
          .map((s) => (s.id === segmentId1 ? mergedSegment : s));

        set({
          currentProject: {
            ...currentProject,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });
      },

      addEmotionTag: (segmentId: string, position: number, emotionValue: string) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const segment = currentProject.segments.find((s) => s.id === segmentId);
        if (!segment) return;

        // 将情绪标签插入到指定位置（文本开头）
        const emotionTag = `[${emotionValue}]`;
        const newText = emotionTag + ' ' + segment.text;

        const updatedSegments = currentProject.segments.map((s) =>
          s.id === segmentId ? { ...s, text: newText } : s
        );

        set({
          currentProject: {
            ...currentProject,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });
      },

      splitSegmentWithPause: (segmentId: string, position: number, pauseDuration: number) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const segment = currentProject.segments.find((s) => s.id === segmentId);
        if (!segment) return;

        // 根据Noiz的逻辑：添加暂停会将段落分成两部分，中间添加0.35s空白
        // 这意味着两个段落会分别生成，然后在合并时添加暂停

        const text1 = segment.text.slice(0, position).trim();
        const text2 = segment.text.slice(position).trim();

        if (!text1 || !text2) return; // 如果分割后有空文本，不执行分割

        const newSegment1: ProjectSegment = {
          ...segment,
          text: text1,
          end_index: segment.start_index + position,
        };

        const newSegment2: ProjectSegment = {
          ...segment,
          id: `${segment.id}_pause_${Date.now()}`,
          text: text2,
          start_index: segment.start_index + position,
          // 标记这个segment前面有暂停
          pause_before: pauseDuration,
        };

        const segmentIndex = currentProject.segments.findIndex((s) => s.id === segmentId);
        const updatedSegments = [
          ...currentProject.segments.slice(0, segmentIndex),
          newSegment1,
          newSegment2,
          ...currentProject.segments.slice(segmentIndex + 1),
        ];

        set({
          currentProject: {
            ...currentProject,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });
      },

      deleteSegments: (segmentIds: string[]) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const idSet = new Set(segmentIds);
        const updatedSegments = currentProject.segments.filter((s) => !idSet.has(s.id));

        set({
          currentProject: {
            ...currentProject,
            segments: updatedSegments,
            updated_at: Date.now(),
          },
        });
      },

      reorderSegments: (fromIndex: number, toIndex: number) => {
        const { currentProject } = get();
        if (!currentProject) return;
        if (fromIndex === toIndex) return;

        const segments = [...currentProject.segments];
        const [moved] = segments.splice(fromIndex, 1);
        segments.splice(toIndex, 0, moved);

        set({
          currentProject: {
            ...currentProject,
            segments,
            updated_at: Date.now(),
          },
        });
      },

      reorderZoneSfx: (speechSegmentId: string, newSfxIdOrder: string[]) => {
        const { currentProject } = get();
        if (!currentProject) return;
        const speechIdx = currentProject.segments.findIndex(s => s.id === speechSegmentId);
        if (speechIdx === -1) return;
        let sfxStart = speechIdx;
        while (sfxStart > 0 && (currentProject.segments[sfxStart - 1].type || 'speech') === 'sfx') {
          sfxStart--;
        }
        const sfxCount = speechIdx - sfxStart;
        if (sfxCount === 0) return;
        const sfxSegments = currentProject.segments.slice(sfxStart, speechIdx);
        const sfxById = new Map(sfxSegments.map(s => [s.id, s]));
        const reordered = newSfxIdOrder.map(id => sfxById.get(id)).filter(Boolean) as ProjectSegment[];
        if (reordered.length !== sfxCount) return;
        const segments = [...currentProject.segments];
        segments.splice(sfxStart, sfxCount, ...reordered);
        set({
          currentProject: { ...currentProject, segments, updated_at: Date.now() },
        });
      },

      autoAssignVoices: async (userId: string) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: {
            ...currentProject,
            status: 'processing',
          },
        });

        try {
          const result = await api.autoAssignVoices({
            text: currentProject.source_text,
            language: currentProject.language,
            user_id: userId,
          });

          // 转换为ProjectSpeaker和ProjectSegment
          const speakers: ProjectSpeaker[] = result.speakers.map((speaker) => ({
            speaker_id: speaker.speaker_id,
            speaker_name: speaker.speaker_name,
            character_description: speaker.character_description,
            voice_id: speaker.matched_voice?.voice_id || null,
            voice_name: speaker.matched_voice?.display_name,
            segments: speaker.segments.map((seg) => ({
              id: `${speaker.speaker_id}_${seg.start_index}`,
              speaker_id: speaker.speaker_id,
              text: seg.text,
              voice_id: speaker.matched_voice?.voice_id || null,
              start_index: seg.start_index,
              end_index: seg.end_index,
            })),
          }));

          const segments: ProjectSegment[] = speakers.flatMap((speaker) => speaker.segments);

          set({
            currentProject: {
              ...currentProject,
              speakers,
              segments,
              status: 'draft',
              updated_at: Date.now(),
            },
          });
        } catch (error) {
          console.error('Auto-assign failed:', error);
          set({
            currentProject: {
              ...currentProject,
              status: 'failed',
            },
          });
          throw error;
        }
      },

      generateAudio: async () => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: {
            ...currentProject,
            status: 'processing',
            generation_progress: 0,
          },
        });

        try {
          // 使用数组顺序（用户插入顺序），不按 start_index 排序
          // 因为 SFX segment 的 start_index 为 -1
          const orderedSegments = [...currentProject.segments];

          // 检查所有 speech segments 是否都有 voice_id
          const missingVoice = orderedSegments.find(
            (seg) => (seg.type || 'speech') !== 'sfx' && !seg.voice_id
          );
          if (missingVoice) {
            throw new Error('Please assign voices to all speech segments');
          }

          // 为每个segment生成音频
          const audioBlobs: Blob[] = [];
          const { sfxAudioBlobs } = get();

          for (let i = 0; i < orderedSegments.length; i++) {
            const segment = orderedSegments[i];
            const segType = segment.type || 'speech';

            let audioBlob: Blob;

            if (segType === 'sfx') {
              // SFX: 优先使用缓存，否则调用 AudioX 生成
              if (sfxAudioBlobs[segment.id]) {
                audioBlob = sfxAudioBlobs[segment.id];
              } else if (segment.text.trim()) {
                audioBlob = await api.generateSoundEffect({
                  text: segment.text,
                  duration: segment.sfx_duration || 5,
                });
                set({
                  sfxAudioBlobs: { ...get().sfxAudioBlobs, [segment.id]: audioBlob },
                });
              } else {
                // 空描述的 SFX 跳过
                continue;
              }
            } else {
              // Speech: 调用 Noiz TTS API
              audioBlob = await api.textToSpeech({
                text: segment.text,
                voice_id: segment.voice_id!,
                output_format: 'mp3',
              });
            }

            audioBlobs.push(audioBlob);

            // 更新进度
            const progress = ((i + 1) / orderedSegments.length) * 100;
            set({
              currentProject: {
                ...get().currentProject!,
                generation_progress: progress,
              },
            });
          }

          // 保存所有音频blobs到项目中
          const proj = get().currentProject!;
          const historyRecord = {
            id: `gen_${Date.now()}`,
            timestamp: Date.now(),
            status: 'completed' as const,
            segment_count: orderedSegments.length,
            title: proj.title,
          };
          set({
            currentProject: {
              ...proj,
              audio_blobs: audioBlobs,
              status: 'completed',
              generation_progress: 100,
              generation_history: [...(proj.generation_history || []), historyRecord],
            },
          });
        } catch (error) {
          console.error('Audio generation failed:', error);
          set({
            currentProject: {
              ...get().currentProject!,
              status: 'failed',
            },
          });
          throw error;
        }
      },

      checkGenerationProgress: async (genProductId: string) => {
        try {
          const progress = await api.getTTSProgress(genProductId);

          const { currentProject } = get();
          if (!currentProject) return;

          if (progress.status === 'completed') {
            set({
              currentProject: {
                ...currentProject,
                status: 'completed',
                audio_url: progress.file_path,
              },
            });
          } else if (progress.status === 'failed') {
            set({
              currentProject: {
                ...currentProject,
                status: 'failed',
              },
            });
          }
        } catch (error) {
          console.error('Failed to check progress:', error);
        }
      },

      exportAudio: async () => {
        const { currentProject } = get();
        if (!currentProject) {
          return null;
        }

        // 如果有旧的audio_url，直接返回
        if (currentProject.audio_url) {
          return currentProject.audio_url;
        }

        // 如果有audio_blobs，合并并下载
        if (currentProject.audio_blobs && currentProject.audio_blobs.length > 0) {
          const { mergeAudioBlobs, downloadBlob } = await import('@/lib/utils/audio-merge');

          // 合并所有音频
          const mergedBlob = await mergeAudioBlobs(currentProject.audio_blobs);

          // 下载文件
          const filename = `${currentProject.title || 'podcast'}_${Date.now()}.wav`;
          downloadBlob(mergedBlob, filename);

          // 创建临时URL用于预览
          const url = URL.createObjectURL(mergedBlob);
          return url;
        }

        return null;
      },

      resetProject: () => {
        set({ currentProject: null });
      },
    }),
    {
      name: 'podcast-project',
      // sfxAudioBlobs 不持久化（Blob 不可序列化）
      partialize: (state) => ({ currentProject: state.currentProject }),
    }
  )
);
