import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import type { Project } from '../types';

const Preview = () => {
  const { projectId, versionId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch project');
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col gap-3 items-center justify-center bg-gray-950 text-white">
        <Loader2Icon className="animate-spin size-8 text-indigo-500" />
        <p className="text-xs text-gray-500">Loading version preview...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-gray-950 text-white">
        <h1 className="text-xl font-semibold">Project Not Found</h1>
        <button 
          onClick={() => navigate('/projects')} 
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Find specific version code if versionId is provided
  let previewCode = project.current_code;
  if (versionId && project.versions) {
    const specificVersion = project.versions.find((v) => v.id === versionId);
    if (specificVersion) {
      previewCode = specificVersion.code;
    }
  }

  if (!previewCode) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-gray-950 text-white">
        <h1 className="text-xl font-semibold">Version Not Found</h1>
        <button 
          onClick={() => navigate(`/projects/${project.id}`)} 
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg cursor-pointer"
        >
          Back to Builder
        </button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-white">
      <iframe
        srcDoc={previewCode}
        title={`${project.name} - Version Preview`}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default Preview;
