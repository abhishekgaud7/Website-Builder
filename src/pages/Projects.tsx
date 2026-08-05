import { useEffect, useState, useRef } from 'react'
import type { Project, Message } from '../types'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  Loader2Icon, 
  SendIcon, 
  MonitorIcon, 
  TabletIcon, 
  SmartphoneIcon, 
  ArrowLeftIcon, 
  ExternalLinkIcon, 
  CodeIcon, 
  EyeIcon, 
  SparklesIcon 
} from 'lucide-react'
import { useAuth } from '../App'

const Projects = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('desktop')
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch project')
      }
      setProject(data)
    } catch (err) {
      console.error('Error fetching project:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [projectId])

  // Scroll to bottom of chat when conversation updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [project?.conversation, isGenerating])

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !project || !user) return

    const promptText = chatInput
    setChatInput('')
    setIsGenerating(true)

    // Append user message locally for instant UI update
    const userMsg: Message = {
      id: 'temp-user-msg',
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString()
    }
    setProject(prev => prev ? { ...prev, conversation: [...prev.conversation, userMsg] } : null)

    try {
      const response = await fetch(`/api/projects/${projectId}/revision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: promptText,
          userId: user.id
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Revision failed')
      }

      // Reload project details to show updated code, history, and version
      await fetchProject()
    } catch (err: any) {
      console.error('Revision error:', err)
      alert(err.message || 'Could not update website')
      // Remove temp message if failed
      fetchProject()
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className='flex flex-col gap-4 items-center justify-center h-screen bg-gray-950 text-white'>
        <Loader2Icon className='size-8 animate-spin text-indigo-500'/>
        <p className='text-sm text-gray-400'>Loading your builder workspace...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className='flex flex-col gap-4 items-center justify-center h-screen bg-gray-950 text-white'>
        <p className='text-2xl font-medium text-gray-400'>Unable to load project!</p>
        <button onClick={() => navigate('/projects')} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm cursor-pointer hover:bg-indigo-700">
          Go to Dashboard
        </button>
      </div>
    )
  }

  // Set width constraints for device previews
  const getDeviceWidthClass = () => {
    if (device === 'phone') return 'w-[375px] h-[667px]';
    if (device === 'tablet') return 'w-[768px] h-[1024px]';
    return 'w-full h-full';
  }

  return (
    <div className='flex flex-col h-screen w-full bg-gray-950 text-white overflow-hidden font-poppins'>
      {/* Header bar */}
      <header className='flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800 z-10'>
        {/* Left: Back & Project Info */}
        <div className='flex items-center gap-3 w-1/3'>
          <button onClick={() => navigate('/projects')} className="p-1.5 hover:bg-white/10 rounded-md transition cursor-pointer">
            <ArrowLeftIcon size={18} />
          </button>
          <div className="truncate">
            <h1 className='text-sm font-semibold capitalize truncate'>{project.name}</h1>
            <p className='text-xs text-gray-400 -mt-0.5'>Last saved: {new Date(project.updatedAt).toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Middle: Responsive view toggles */}
        <div className='flex items-center justify-center bg-black/40 p-1 rounded-lg border border-slate-800/80 gap-1'>
          <button 
            onClick={() => setDevice('desktop')} 
            className={`p-1.5 rounded-md transition cursor-pointer ${device === 'desktop' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Desktop View"
          >
            <MonitorIcon size={16} />
          </button>
          <button 
            onClick={() => setDevice('tablet')} 
            className={`p-1.5 rounded-md transition cursor-pointer ${device === 'tablet' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Tablet View"
          >
            <TabletIcon size={16} />
          </button>
          <button 
            onClick={() => setDevice('phone')} 
            className={`p-1.5 rounded-md transition cursor-pointer ${device === 'phone' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Mobile View"
          >
            <SmartphoneIcon size={16} />
          </button>
        </div>

        {/* Right: Tab selectors & Action buttons */}
        <div className='flex items-center justify-end gap-3 w-1/3'>
          {/* Tab selector */}
          <div className="flex bg-black/40 border border-slate-800 p-0.5 rounded-lg text-xs font-medium mr-2">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${activeTab === 'preview' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <EyeIcon size={13} />
              Preview
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${activeTab === 'code' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <CodeIcon size={13} />
              Code
            </button>
          </div>

          <a 
            href={`/view/${project.id}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-1.5 text-xs bg-indigo-600/90 hover:bg-indigo-600 text-white px-3.5 py-2 rounded-lg font-medium transition cursor-pointer"
          >
            Launch <ExternalLinkIcon size={13} />
          </a>
        </div>
      </header>

      {/* Main split-screen panel */}
      <div className='flex flex-1 w-full overflow-hidden'>
        {/* Left pane: Revision Chat Panel */}
        <aside className='w-[360px] bg-gray-900 border-r border-gray-800 flex flex-col h-full z-10'>
          {/* Header */}
          <div className="p-4 border-b border-gray-800/80 bg-black/10 flex items-center gap-2">
            <SparklesIcon size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold">AI Assistant Co-Pilot</h2>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {project.conversation.map((msg, index) => (
              <div 
                key={msg.id || index} 
                className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[10px] text-gray-500 mb-1 px-1">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <div 
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-gray-800 text-gray-200 border border-slate-700/50 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex flex-col items-start mr-auto max-w-[85%]">
                <span className="text-[10px] text-gray-500 mb-1 px-1">Assistant</span>
                <div className="p-3 bg-gray-800 border border-slate-700/50 rounded-2xl rounded-tl-none text-xs text-gray-400 flex items-center gap-2.5">
                  Rebuilding website structure...
                  <Loader2Icon className="animate-spin size-3.5 text-indigo-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input box */}
          <form onSubmit={handleRevisionSubmit} className="p-4 border-t border-gray-800/80 bg-black/10">
            <div className="relative">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask AI to make revisions (e.g. 'add a pricing page', 'change colors to emerald gradient')"
                rows={2}
                disabled={isGenerating}
                required
                className="w-full bg-white/5 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
              />
              <button 
                type="submit" 
                disabled={isGenerating || !chatInput.trim()}
                className="absolute right-2.5 bottom-3.5 p-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-30 disabled:scale-100 transition cursor-pointer"
              >
                <SendIcon size={12} />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-500 mt-2">
              💡 Each revision request consumes <span className="text-gray-300">5 credits</span>.
            </p>
          </form>
        </aside>

        {/* Right pane: Viewport Workspace */}
        <main className='flex-1 bg-black flex flex-col items-center justify-center p-6 overflow-hidden relative'>
          
          {/* Glimmering Rebuilding Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4 transition-all duration-300">
              <div className="relative flex items-center justify-center">
                <div className="absolute rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 animate-spin"></div>
                <SparklesIcon size={24} className="text-purple-400 animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-md font-semibold text-white">Generating revision changes...</h3>
                <p className="text-xs text-gray-500 max-w-xs mt-1">Our AI copilot is updating the CSS classes and structural JS components of your site.</p>
              </div>
            </div>
          )}

          {activeTab === 'preview' ? (
            /* Responsive Canvas Wrapper */
            <div className={`transition-all duration-500 shadow-2xl rounded-xl border border-slate-800/80 bg-gray-900 overflow-hidden flex flex-col ${getDeviceWidthClass()}`}>
              {/* Mock browser address bar */}
              <div className="bg-gray-900 border-b border-gray-800/60 py-2 px-4 flex items-center gap-2 text-xs text-gray-500 selection:bg-transparent">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <div className="bg-black/30 border border-slate-800/50 rounded-md px-3 py-0.5 text-center flex-1 max-w-sm mx-auto truncate text-[10px] text-gray-400">
                  https://website-builder.vercel.app/preview/{project.id}
                </div>
              </div>

              {/* Preview frame */}
              <div className="flex-1 w-full h-full bg-white relative">
                {project.current_code ? (
                  <iframe
                    srcDoc={project.current_code}
                    title="Website Preview"
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-900 text-gray-500 text-xs">
                    No preview code compiled. Try a revision.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Code View Panel */
            <div className="w-full h-full max-w-5xl bg-gray-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-gray-900 border-b border-gray-800 py-2.5 px-4 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">index.html</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(project.current_code || '')
                    alert('Code copied to clipboard!')
                  }}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white px-3 py-1 rounded transition cursor-pointer"
                >
                  Copy Code
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-300 bg-black/60 select-text leading-relaxed">
                <code>{project.current_code}</code>
              </pre>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Projects;