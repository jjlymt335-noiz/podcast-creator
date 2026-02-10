import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store';

interface SavedProject {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export function ProjectSelector() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const loadProject = useProjectStore((state) => state.loadProject);

  useEffect(() => {
    // 从localStorage加载所有项目
    const loadProjects = () => {
      const projectKeys = Object.keys(localStorage).filter((key) => key.startsWith('project_'));
      const loadedProjects = projectKeys
        .map((key) => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '');
            return {
              id: data.id,
              title: data.title,
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as SavedProject[];

      // 按更新时间倒序排列
      loadedProjects.sort((a, b) => b.updated_at - a.updated_at);
      setProjects(loadedProjects);
    };

    loadProjects();
  }, []);

  const handleLoadProject = async (projectId: string) => {
    try {
      await loadProject(projectId);
      // 跳转到编辑器页面（由父组件处理）
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (confirm('Are you sure you want to delete this project?')) {
      localStorage.removeItem(`project_${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">No saved projects yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Upload a document to create your first podcast project
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="cursor-pointer transition-all hover:shadow-md hover:border-orange-300"
          onClick={() => handleLoadProject(project.id)}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle className="text-lg">{project.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatDate(project.updated_at)}
                </span>
              </CardDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleDeleteProject(project.id, e)}
              className="text-gray-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
