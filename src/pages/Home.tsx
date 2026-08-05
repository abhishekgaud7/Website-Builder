import { Loader2Icon } from 'lucide-react';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import framer from "../assets/framer.png";
import huawei from "../assets/huawei.png";
import instagram from "../assets/instagram.png";
import microsoft from "../assets/microsoft.png";
import walmart from "../assets/walmart.png";

const Home = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session, user } = useAuth();

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      navigate('/auth/signin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input,
          userId: user.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate website');
      }

      // Redirect to builder page for this new project
      navigate(`/projects/${data.id}`);
    } catch (err: any) {
      console.error('Error generating website:', err);
      alert(err.message || 'An error occurred during generation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex flex-col items-center text-white text-sm justify-center px-4 font-poppins relative">
      <a href="https://prebuiltui.com" className="flex items-center gap-2 border border-slate-700 rounded-full p-1 pr-3 text-sm mt-20">
        <span className="bg-indigo-600 text-xs px-3 py-1 rounded-full">NEW</span>
        <p className="flex items-center gap-2">
          <span>Try 30 days free trial option</span>
          <svg className="mt-px" width="6" height="9" viewBox="0 0 6 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m1 1 4 3.5L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </p>
      </a>

      <h1 className="text-center text-[40px] leading-[48px] md:text-6xl md:leading-[70px] mt-4 font-semibold max-w-3xl">
        Turn thoughts into websites instantly, with AI.
      </h1>

      <p className="text-center text-base max-w-md mt-2">
        Create, customize and publish websites faster than ever with our AI Site Builder
      </p>
      <form onSubmit={onSubmitHandler} className="bg-white/10 max-w-2xl w-full rounded-xl p-4 mt-10 border border-indigo-600/70 focus-within:ring-2 ring-indigo-500 transition-all">
        <textarea onChange={e => setInput(e.target.value)} className="bg-transparent outline-none text-gray-300 resize-none w-full" rows={4} placeholder="Describe the website you want to build in details..." required />
        <button type="submit" disabled={loading} className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-md px-4 py-2 cursor-pointer disabled:opacity-50">
          {loading ? (
            <>
              Creating <Loader2Icon className='animate-spin size-4 text-white' />
            </>
          ) : (
            "Creating with AI"
          )}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-16 md:gap-20 mx-auto mt-16">
        <img src={framer} className="h-8" />
        <img src={huawei} className="h-8" />
        <img src={instagram} className="h-8" />
        <img src={microsoft} className="h-8" />
        <img src={walmart} className="h-8" />
      </div>
    </section>
  )
}

export default Home;
