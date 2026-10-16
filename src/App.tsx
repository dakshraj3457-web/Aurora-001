import React, { useState } from 'react';
import { TelemetryProvider, useTelemetry, AppScreen } from './context/TelemetryContext';
import { BootWindow } from './components/BootWindow';
import { StartScreen } from './components/StartScreen';
import { ConnectionScreen } from './components/ConnectionScreen';
import { NavigationDrawer } from './components/NavigationDrawer';
import { MainDashboard } from './components/MainDashboard';
import { SystemHealth } from './components/SystemHealth';
import { CameraObservations } from './components/CameraObservations';
import { AiMissionOfficer } from './components/AiMissionOfficer';
import { MissionLog } from './components/MissionLog';
import { Spacecraft3DView } from './components/Spacecraft3DView';
import { TelemetryCharts } from './components/TelemetryCharts';
import { SettingsModal } from './components/SettingsModal';

function AppContent() {
  const { activeScreen } = useTelemetry();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dedicated Boot, Launch & Pairing screens take full viewport
  if (activeScreen === 'BOOT') {
    return <BootWindow />;
  }

  if (activeScreen === 'START') {
    return <StartScreen />;
  }

  if (activeScreen === 'CONNECT') {
    return <ConnectionScreen />;
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col bg-space-grid relative selection:bg-cyan-500 selection:text-black">
      {/* Spacecraft Top Header & Mobile Navigation Drawer */}
      <NavigationDrawer onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Mission Display Viewport */}
      <main className="flex-1 p-3 sm:p-6 flex flex-col">
        {activeScreen === 'DASHBOARD' && <MainDashboard />}
        {activeScreen === 'SYSTEM_HEALTH' && <SystemHealth />}
        {activeScreen === 'CAMERA' && <CameraObservations />}
        {activeScreen === 'AI_OFFICER' && <AiMissionOfficer />}
        {activeScreen === 'LOGS' && <MissionLog />}
        {activeScreen === 'MODEL_3D' && <Spacecraft3DView />}
        {activeScreen === 'CHARTS' && <TelemetryCharts />}
      </main>

      {/* Persistent Mission Status Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 px-4 py-2 text-[11px] font-mono text-slate-500 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-cyan-400 font-semibold">AURORA-01 FLIGHT OPERATIONS</span>
            <span className="text-slate-700">|</span>
            <span>UHF CARRIER 437.450 MHz</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>ARDUINO UNO + ESP32-S3 SUBSYSTEMS</span>
            <span className="text-slate-700">|</span>
            <span>AURORA OS v2.4.0</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <TelemetryProvider>
      <AppContent />
    </TelemetryProvider>
  );
}
