import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import type { Project } from '../types';

const View = () => {
  const { projectId } = useParams();
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
        <p className="text-xs text-gray-500">Launching your website preview...</p>
      </div>
    );
  }

  if (!project || !project.current_code) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-gray-950 text-white">
        <h1 className="text-xl font-semibold">Website Not Found</h1>
        <p className="text-xs text-gray-500">The website you are trying to view does not exist or has no generated code.</p>
        <button 
          onClick={() => navigate('/')} 
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-white">
      <iframe
        srcDoc={project.current_code}
        title={project.name}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default View;
