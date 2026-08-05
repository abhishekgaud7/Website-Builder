import { createContext, useContext, useEffect, useState } from 'react'
import { Route, Routes, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home.tsx'
import Pricing from './pages/Pricing'
import Projects from './pages/Projects'
import MyProjects from './pages/MyProjects'
import Preview from './pages/Preview'
import Community from './pages/Community'
import View from './pages/View'
import SignIn from './pages/SignIn'
import Navbar from './components/Navbar.tsx'
import { supabase } from './utils/supabaseClient'
import type { Session } from '@supabase/supabase-js'

// Create Auth Context
interface AuthContextProps {
  session: Session | null;
  user: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hideNavbar = location.pathname.startsWith('/auth');

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen bg-black'>
        <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500'></div>
      </div>
    );
  }

  // Route guarding helper
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!session) {
      return <Navigate to="/auth/signin" replace />;
    }
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      <div>
        {!hideNavbar && <Navbar />}
        <Routes>
          <Route path='/' element={<Home />} /> 
          <Route path='/auth/signin' element={<SignIn />} />
          <Route path='/pricing' element={<Pricing />} /> 
          <Route path='/community' element={<Community />} />
          <Route path='/view/:projectId' element={<View />} />

          {/* Protected Routes */}
          <Route path='/projects/:projectId' element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          } />
          <Route path='/projects' element={
            <ProtectedRoute>
              <MyProjects />
            </ProtectedRoute>
          } />
          <Route path='/preview/:projectId' element={
            <ProtectedRoute>
              <Preview />
            </ProtectedRoute>
          } />
          <Route path='/preview/:projectId/:versionId' element={
            <ProtectedRoute>
              <Preview />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </AuthContext.Provider>
  )
}

export default App;
