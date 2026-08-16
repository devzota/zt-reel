import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './components/Overview'
import FacebookPages from './pages/FacebookPages'
import FacebookPageSettings from './pages/FacebookPageSettings'
import WordPressSites from './pages/WordPressSites'
import ReelFactory from './pages/ReelFactory'
import ImageFactory from './pages/ImageFactory'
import StatisticsPage from './pages/StatisticsPage'
import SystemSettingsPage from './pages/SystemSettingsPage'
import Login from './pages/Login'
import FanpageReport from './pages/FanpageReport'
import UserManagement from './pages/UserManagement'
import YoutubeTest from './pages/YoutubeTest'
import YoutubeSources from './pages/YoutubeSources'
import TiktokClone from './pages/TiktokClone'
import { useZTTeamAuthStore } from './stores/authStore'
import './index.css'

function ZTTeamProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useZTTeamAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ZTTeamProtectedRoute>
              <Layout />
            </ZTTeamProtectedRoute>
          } 
        >
          <Route index element={<Overview />} />
          <Route path="facebook" element={<FacebookPages />} />
          <Route path="facebook/pages/:id/settings" element={<FacebookPageSettings />} />
          <Route path="facebook/pages/:id/report" element={<FanpageReport />} />
          <Route path="wordpress" element={<WordPressSites />} />
          <Route path="youtube" element={<YoutubeSources />} />
          <Route path="tiktok-clone" element={<TiktokClone />} />
          <Route path="reel-factory" element={<ReelFactory />} />
          <Route path="image-factory" element={<ImageFactory />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="youtube-test" element={<YoutubeTest />} />
          <Route path="settings" element={<SystemSettingsPage />} />
          <Route path="users" element={<UserManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
