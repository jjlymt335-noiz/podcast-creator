import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from './DocumentUpload';
import { ProjectSelector } from './ProjectSelector';
import { AutoAssignToggle } from './AutoAssignToggle';
import { VoiceSelector } from './VoiceSelector';
import { useProjectStore, useUIStore } from '@/store';
import { Loader2, Mic2, ArrowRight } from 'lucide-react';
import type { DocumentParseResult } from '@/types/project';

export function EntryPage() {
  const [activeTab, setActiveTab] = useState('upload');
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<DocumentParseResult | null>(null);
  const [podcastName, setPodcastName] = useState('');
  const [hostVoice, setHostVoice] = useState<{ voiceId: string; voiceName: string } | null>(null);
  const [guestVoice, setGuestVoice] = useState<{ voiceId: string; voiceName: string } | null>(null);

  const currentProject = useProjectStore((state) => state.currentProject);
  const createProject = useProjectStore((state) => state.createProject);
  const autoAssignVoices = useProjectStore((state) => state.autoAssignVoices);
  const setCurrentPage = useUIStore((state) => state.setCurrentPage);
  const setAutoAssigning = useUIStore((state) => state.setAutoAssigning);
  const showToast = useUIStore((state) => state.showToast);

  // Auto-generate podcast name from document
  const handleUploadComplete = (doc: DocumentParseResult) => {
    setUploadedDoc(doc);
    if (!podcastName) {
      // Use document title, or extract from first meaningful line
      const autoTitle = doc.title
        || doc.text.split('\n').find(line => line.trim().length > 2)?.trim().slice(0, 60)
        || '';
      if (autoTitle) {
        setPodcastName(autoTitle);
      }
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    console.log('\n' + '='.repeat(80));
    console.log('🎬 GENERATE BUTTON CLICKED');
    console.log('='.repeat(80));

    try {
      // 第1步：确保有项目
      console.log('📋 Current project state:', {
        exists: !!currentProject,
        id: currentProject?.id,
        title: currentProject?.title,
        textLength: currentProject?.source_text?.length || 0,
      });

      if (!currentProject) {
        console.log('⚠️ No current project found, creating one...');
        createProject({
          text: '',
          language: 'en',
          format: 'txt',
          title: podcastName || 'Untitled Podcast',
        });
      } else if (podcastName && currentProject.title !== podcastName) {
        // Update title if user entered a custom name
        useProjectStore.getState().updateProjectTitle(podcastName);
      }

      // 获取最新的项目状态
      const project = useProjectStore.getState().currentProject;

      if (!project) {
        throw new Error('Failed to get or create project');
      }

      console.log('✅ Project ready:', {
        id: project.id,
        title: project.title,
        textLength: project.source_text.length,
        language: project.language,
        hasText: !!project.source_text,
      });

      // 第2步：处理voice分配
      if (autoAssignEnabled && project.source_text) {
        // 方式A：Auto-assign（AI自动识别和匹配）
        console.log('\n🚀🚀🚀 AUTO-ASSIGN ENABLED AND STARTING 🚀🚀🚀');
        console.log('📝 Text length:', project.source_text.length);
        console.log('📝 Text preview (first 300 chars):');
        console.log(project.source_text.slice(0, 300));
        console.log('📝 Language:', project.language);

        setAutoAssigning(true);

        try {
          console.log('🔄 Calling autoAssignVoices...');
          await autoAssignVoices('default_user');

          // 检查结果
          const updatedProject = useProjectStore.getState().currentProject;
          console.log('✅ Auto-assign completed!');
          console.log('📊 Results:', {
            speakersCount: updatedProject?.speakers.length || 0,
            segmentsCount: updatedProject?.segments.length || 0,
            speakers: updatedProject?.speakers.map(s => ({
              id: s.speaker_id,
              name: s.speaker_name,
              voiceId: s.voice_id,
              segmentsCount: s.segments.length,
            })),
          });

          showToast('Voices auto-assigned successfully!', 'success');
        } catch (assignError) {
          console.error('❌❌❌ AUTO-ASSIGN FAILED ❌❌❌');
          console.error('Error:', assignError);
          console.error('Error message:', assignError instanceof Error ? assignError.message : String(assignError));
          console.error('Error stack:', assignError instanceof Error ? assignError.stack : 'N/A');
          showToast('Auto-assign failed. Please assign voices manually.', 'error');
        } finally {
          setAutoAssigning(false);
        }
      } else if (!autoAssignEnabled && (hostVoice || guestVoice)) {
        // 方式B：手动选择（用户预先选择了Host/Guest音色）
        console.log('\n👤 MANUAL VOICE SELECTION');
        console.log('Host voice:', hostVoice);
        console.log('Guest voice:', guestVoice);

        // 先调用auto-assign识别speakers（不分配voice）
        if (project.source_text) {
          try {
            console.log('🔄 Calling autoAssignVoices to identify speakers...');
            await autoAssignVoices('default_user');

            // 然后手动分配用户选择的voice
            const updatedProject = useProjectStore.getState().currentProject;
            const assignVoiceToSpeaker = useProjectStore.getState().assignVoiceToSpeaker;

            if (updatedProject && updatedProject.speakers.length >= 1 && hostVoice) {
              // 第一个speaker使用Host voice
              assignVoiceToSpeaker(updatedProject.speakers[0].speaker_id, hostVoice.voiceId, hostVoice.voiceName);
              console.log(`✅ Assigned Host voice to ${updatedProject.speakers[0].speaker_name}`);
            }

            if (updatedProject && updatedProject.speakers.length >= 2 && guestVoice) {
              // 第二个speaker使用Guest voice
              assignVoiceToSpeaker(updatedProject.speakers[1].speaker_id, guestVoice.voiceId, guestVoice.voiceName);
              console.log(`✅ Assigned Guest voice to ${updatedProject.speakers[1].speaker_name}`);
            }

            showToast('Voices assigned successfully!', 'success');
          } catch (error) {
            console.error('❌ Failed to assign voices:', error);
            showToast('Failed to assign voices', 'error');
          }
        }
      } else {
        if (!autoAssignEnabled) {
          console.log('⚠️ Auto-assign NOT enabled, and no manual voices selected');
        } else if (!project.source_text) {
          console.log('⚠️ No source text, skipping voice assignment');
        }
      }

      // 第3步：跳转到编辑器页面
      console.log('\n🎯 Navigating to editor page...');
      console.log('='.repeat(80) + '\n');
      setCurrentPage('editor');
    } catch (error) {
      console.error('\n❌❌❌ GENERATION FAILED ❌❌❌');
      console.error('Error:', error);
      showToast('Failed to generate podcast. Please try again.', 'error');
      setAutoAssigning(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // When auto-assign is off and user has a document/project, both host and guest voices are required
  const needsVoice = !autoAssignEnabled && (uploadedDoc || currentProject);
  const canGenerate = needsVoice ? (!!hostVoice && !!guestVoice) : true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50/60">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-200 mb-5">
            <Mic2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Podcast Creator</h1>
          <p className="text-lg text-gray-500 max-w-lg mx-auto">
            Transform documents into engaging podcasts with AI-powered voices
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm h-12">
              <TabsTrigger value="upload" className="flex-1 text-base data-[state=active]:text-orange-600">
                Upload Document
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex-1 text-base data-[state=active]:text-orange-600">
                Existing Project
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <DocumentUpload onUploadComplete={handleUploadComplete} />
            </TabsContent>

            <TabsContent value="existing">
              <ProjectSelector />
            </TabsContent>
          </Tabs>

          {/* Document Info */}
          {uploadedDoc && (
            <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {uploadedDoc.title || 'Untitled Document'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {uploadedDoc.format.toUpperCase()} • {uploadedDoc.language.toUpperCase()} •{' '}
                    {uploadedDoc.text.length.toLocaleString()} characters
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Podcast Name (optional) */}
          {(uploadedDoc || currentProject) && (
            <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
              <label className="block text-base font-medium text-gray-700 mb-2">
                Podcast Name
                <span className="text-gray-400 font-normal ml-1.5 text-sm">(optional)</span>
              </label>
              <input
                value={podcastName}
                onChange={(e) => setPodcastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400 bg-gray-50/50"
                placeholder="Enter a name or leave blank to auto-generate..."
              />
            </div>
          )}

          {/* Auto-assign Toggle OR Manual Voice Selection */}
          <AutoAssignToggle enabled={autoAssignEnabled} onToggle={setAutoAssignEnabled} />

          {/* Manual Voice Selection */}
          {!autoAssignEnabled && (uploadedDoc || currentProject) && (
            <VoiceSelector
              hostVoice={hostVoice}
              guestVoice={guestVoice}
              onHostVoiceChange={(voiceId, voiceName) => setHostVoice({ voiceId, voiceName })}
              onGuestVoiceChange={(voiceId, voiceName) => setGuestVoice({ voiceId, voiceName })}
              language={uploadedDoc?.language || currentProject?.language || 'zh'}
            />
          )}

          {/* Generate Button */}
          <div className="flex flex-col items-center gap-3 pt-6">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerate}
              className="px-12 h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-200 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : uploadedDoc || currentProject ? (
                <>
                  Generate Podcast
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  Start Writing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {needsVoice && (!hostVoice || !guestVoice) && (
              <p className="text-center text-base text-orange-600">
                Please select both Host and Guest voices to continue
              </p>
            )}

            {!uploadedDoc && !currentProject && (
              <p className="text-center text-base text-gray-400">
                No document? Click above to start writing from scratch
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
