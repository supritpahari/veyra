import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VeyraProvider } from './context/VeyraContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Landing } from './components/vh-landing';
import { AuthPage } from './components/AuthPage';
import { DashboardLayout } from './components/DashboardLayout';
import { Analyzer, DataQuality } from './components/vh-analyzer';
import { PatternExplorer } from './components/vh-patterns';
import { Evaluation } from './components/vh-lab';
import { TweaksPanel } from './components/TweaksPanel';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VeyraProvider>
          <div className="vh-app-container">
            <Navbar />
            <main className="vh-main">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<AuthPage initialMode="login" />} />
                <Route path="/register" element={<AuthPage initialMode="register" />} />
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="/dashboard/analyzer" replace />} />
                  <Route path="analyzer" element={<Analyzer />} />
                  <Route path="analyzerso" element={<Navigate to="/dashboard/analyzer" replace />} />
                  <Route path="patterns" element={<PatternExplorer />} />
                  <Route path="quality" element={<DataQuality />} />
                  <Route path="evaluation" element={<Evaluation />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <TweaksPanel />
          </div>
        </VeyraProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
