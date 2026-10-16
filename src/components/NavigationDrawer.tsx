import React, { useState } from 'react';
import {
  Menu,
  X,
  Satellite,
  Gauge,
  ShieldAlert,
  Camera,
  Bot,
  ScrollText,
  Boxes,
  LineChart,
  Settings,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Terminal,
  Download,
  Smartphone,
} from 'lucide-react';
import { useTelemetry, AppScreen } from '../context/TelemetryContext';
import { soundManager } from '../utils/sound';

interface NavigationDrawerProps {
  onOpenSettings: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ onOpenSettings }) => {
  const {
    telemetry,
    activeScreen,
    setActiveScreen,
    anomalies,
  } = useTelemetry();

  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());

  const navItems: { screen: AppScreen; label: string; icon: React.ReactNode; badge?: number }[] = [
    { screen: 'DASHBOARD', label: 'Telemetry Dashboard', icon: <Gauge className="w-4 h-4" /> },
    {
      screen: 'SYSTEM_HEALTH',
      label: 'System Health & Anomalies',
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: anomalies.filter((a) => !a.acknowledged).length,
    },
    { screen: 'CAMERA', label: 'Camera & Observations', icon: <Camera className="w-4 h-4" /> },
    { screen: 'AI_OFFICER', label: 'AI Mission Officer', icon: <Bot className="w-4 h-4" /> },
    { screen: 'LOGS', label: 'Mission Event Log', icon: <ScrollText className="w-4 h-4" /> },
    { screen: 'MODEL_3D', label: '3D Spacecraft Attitude', icon: <Boxes className="w-4 h-4" /> },
    { screen: 'CHARTS', label: 'Telemetry Charts', icon: <LineChart className="w-4 h-4" /> },
    { screen: 'BOOT', label: 'Cinematic Boot Window', icon: <Terminal className="w-4 h-4 text-cyan-400" /> },
    { screen: 'START', label: 'Pre-Flight Launchpad', icon: <Radio className="w-4 h-4 text-sky-400" /> },
  ];

  const handleNavClick = (screen: AppScreen) => {
    soundManager.playBeep(950, 0.05, 'triangle');
    setActiveScreen(screen);
    setIsOpen(false);
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const unackCount = anomalies.filter((a) => !a.acknowledged).length;

  return (
    <>
      {/* Top Application Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-cyan-500/20 px-3 py-2.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand & Menu Toggle */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => setActiveScreen('DASHBOARD')}
              className="flex items-center space-x-2.5 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
                <Satellite className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-heading font-bold text-sm tracking-wide text-white">
                    AURORA-01
                  </span>
                  {telemetry.isDemoMode && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>DEMO</span>
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono text-cyan-400/80 block -mt-0.5 tracking-wider uppercase">
                  MISSION CONTROL
                </span>
              </div>
            </div>
          </div>

          {/* Center Mode & Health indicator on desktop */}
          <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-1.5">
              <span className="text-slate-400">MODE:</span>
              <strong className="text-cyan-300">{telemetry.mode}</strong>
              {telemetry.modePending && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />
              )}
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-1.5">
              <span className="text-slate-400">HEALTH:</span>
              <strong
                className={
                  telemetry.healthScore > 85
                    ? 'text-emerald-400'
                    : telemetry.healthScore > 60
                    ? 'text-amber-400'
                    : 'text-red-400'
                }
              >
                {telemetry.healthScore}%
              </strong>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute telemetry sound' : 'Mute telemetry sound'}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Anomalies Alert Bell */}
            <button
              type="button"
              onClick={() => setActiveScreen('SYSTEM_HEALTH')}
              aria-label="View system anomalies"
              className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              {unackCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-slate-950">
                  {unackCount}
                </span>
              )}
            </button>

            {/* Connection Screen Link */}
            <button
              type="button"
              onClick={() => setActiveScreen('CONNECT')}
              aria-label="Spacecraft connection screen"
              className={`p-2 rounded-xl border transition-colors flex items-center space-x-1 ${
                telemetry.connection === 'CONNECTED'
                  ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  telemetry.connection === 'CONNECTED'
                    ? 'bg-emerald-400'
                    : telemetry.connection === 'CONNECTING'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
            </button>

            {/* Settings Trigger */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Navigation Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-72 max-w-[80vw] bg-slate-950 border-r border-cyan-500/30 flex flex-col h-full p-4 shadow-2xl z-10">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Satellite className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-white">AURORA-01</h3>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">
                    NAVIGATION MENU
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {navItems.map((item) => {
                const isActive = activeScreen === item.screen;
                return (
                  <button
                    key={item.screen}
                    type="button"
                    onClick={() => handleNavClick(item.screen)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono tracking-wide transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-red-500/80 text-white text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Direct APK Download Card */}
            <div className="pt-2">
              <a
                href="/aurora-01.apk"
                download="aurora-01-ground-station.apk"
                onClick={() => {
                  soundManager.playBeep(1200, 0.08, 'triangle');
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-mono text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] group cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">DOWNLOAD APK</span>
                </div>
                <div className="flex items-center space-x-1 text-[10px]">
                  <span className="bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/40">
                    .apk
                  </span>
                  <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                </div>
              </a>
            </div>

            {/* Bottom info */}
            <div className="pt-4 border-t border-slate-900 text-[11px] font-mono text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>TRANSPORT:</span>
                <span className="text-cyan-300">{telemetry.transportType}</span>
              </div>
              <div className="flex justify-between">
                <span>DOWNLINK STATUS:</span>
                <span
                  className={
                    telemetry.connection === 'CONNECTED' ? 'text-emerald-400' : 'text-slate-400'
                  }
                >
                  {telemetry.connection}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
