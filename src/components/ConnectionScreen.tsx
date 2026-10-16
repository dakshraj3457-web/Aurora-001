import React, { useState, useEffect } from 'react';
import {
  Radio,
  Bluetooth,
  Wifi,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Info,
  Plug,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { TransportType } from '../types/telemetry';
import { soundManager } from '../utils/sound';

export const ConnectionScreen: React.FC = () => {
  const {
    telemetry,
    activeTransportType,
    setActiveTransportType,
    connectTransport,
    disconnectTransport,
    enterDemoMode,
    setActiveScreen,
    esp32Url,
    setEsp32Url,
    deviceName,
    setDeviceName,
  } = useTelemetry();

  const [selectedMethod, setSelectedMethod] = useState<TransportType>(activeTransportType);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasWebBluetooth, setHasWebBluetooth] = useState(false);
  const [hasWebSerial, setHasWebSerial] = useState(false);

  useEffect(() => {
    setHasWebBluetooth(typeof navigator !== 'undefined' && Boolean((navigator as any).bluetooth));
    setHasWebSerial(typeof navigator !== 'undefined' && Boolean((navigator as any).serial));
  }, []);

  const handleConnect = async () => {
    setErrorMessage(null);
    setIsScanning(true);
    soundManager.playBeep(1000, 0.08, 'sine');

    try {
      const ok = await connectTransport(selectedMethod);
      if (ok) {
        soundManager.playBeep(1200, 0.1, 'triangle');
        setActiveScreen('DASHBOARD');
      } else {
        setErrorMessage(
          selectedMethod === 'BLE'
            ? 'BLE pairing was cancelled or no compatible device responded.'
            : selectedMethod === 'WIFI'
            ? `Could not reach ESP32-S3 server at ${esp32Url}.`
            : selectedMethod === 'BLUETOOTH_SERIAL'
            ? 'Web Serial port was not granted or serial link failed.'
            : 'Failed to initiate transport.'
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDisconnect = async () => {
    soundManager.playBeep(450, 0.1, 'sawtooth');
    await disconnectTransport();
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col p-4 sm:p-6 bg-space-grid">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveScreen('START')}
          className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>START SCREEN</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400">STATUS:</span>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
              telemetry.connection === 'CONNECTED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : telemetry.connection === 'CONNECTING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {telemetry.connection}
          </span>
        </div>
      </div>

      {/* Main Connection Container */}
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase mb-2">
            <Radio className="w-3.5 h-3.5" />
            <span>COMMUNICATION DOWNLINK</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            CONNECT TO SPACECRAFT
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            Select physical telemetry transport or run simulated Demo Mode to inspect subsystems.
          </p>
        </div>

        {/* Spacecraft Connection Illustration */}
        <div className="relative w-full h-24 mb-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/20 flex items-center justify-between px-8 sm:px-16 overflow-hidden">
          {/* Earth / Ground Station Icon */}
          <div className="flex flex-col items-center z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">MISSION BASE</span>
          </div>

          {/* Linking Carrier Wave Animation */}
          <div className="flex-1 mx-4 relative flex items-center justify-center">
            <div
              className={`w-full h-0.5 ${
                telemetry.connection === 'CONNECTED'
                  ? 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 shadow-[0_0_8px_rgba(0,240,255,0.8)]'
                  : 'bg-slate-800'
              }`}
            />
            {telemetry.connection === 'CONNECTING' && (
              <div className="absolute w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            )}
            <span className="absolute -top-3 text-[9px] font-mono text-cyan-400/80 uppercase">
              {telemetry.connection === 'CONNECTED'
                ? 'CARRIER FREQ: 437.450 MHz'
                : 'RF CARRIER SEARCH'}
            </span>
          </div>

          {/* AURORA-01 Spacecraft Icon */}
          <div className="flex flex-col items-center z-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-lg">
              <Radio className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">AURORA-01</span>
          </div>
        </div>

        {/* Transport Methods Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {/* 1. Bluetooth Low Energy (BLE) */}
          <div
            onClick={() => setSelectedMethod('BLE')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedMethod === 'BLE'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Bluetooth className="w-4 h-4 text-cyan-400" />
                <h4 className="font-heading font-bold text-sm text-white">BLE (UART)</h4>
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                  hasWebBluetooth
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {hasWebBluetooth ? 'BROWSER SUPPORTED' : 'UNAVAILABLE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Connect to HM-10, AT-09, or ESP32-S3 BLE wireless UART modules directly from Android Chrome.
            </p>
          </div>

          {/* 2. Bluetooth Classic (HC-05) */}
          <div
            onClick={() => setSelectedMethod('BLUETOOTH_SERIAL')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedMethod === 'BLUETOOTH_SERIAL'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Plug className="w-4 h-4 text-cyan-400" />
                <h4 className="font-heading font-bold text-sm text-white">HC-05 CLASSIC / USB</h4>
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                  hasWebSerial ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {hasWebSerial ? 'WEB SERIAL' : 'DESKTOP / BRIDGE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Standard Web Bluetooth cannot access raw HC-05 RFCOMM SPP. Connect via Web Serial USB or an Android Bluetooth Serial Bridge app.
            </p>
          </div>

          {/* 3. Wi-Fi ESP32-S3 Server */}
          <div
            onClick={() => setSelectedMethod('WIFI')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedMethod === 'WIFI'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4 text-cyan-400" />
                <h4 className="font-heading font-bold text-sm text-white">ESP32-S3 WI-FI</h4>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                LAN / AP
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Connect to the ESP32-S3 camera & telemetry access point or local ground network endpoint.
            </p>
          </div>

          {/* 4. Demo Mode */}
          <div
            onClick={() => setSelectedMethod('DEMO')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedMethod === 'DEMO'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="font-heading font-bold text-sm text-white">DEMO MODE</h4>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                SIMULATED DATA
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Live deterministic orbital physics simulator for demonstrating all dashboards, MPU6050 tilt, INA219 power, and mode commands without hardware.
            </p>
          </div>
        </div>

        {/* Configuration for selected method */}
        {selectedMethod === 'WIFI' && (
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 mb-6 space-y-2">
            <label className="text-xs font-mono text-slate-300 block">
              ESP32-S3 ENDPOINT URL:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={esp32Url}
                onChange={(e) => setEsp32Url(e.target.value)}
                placeholder="http://192.168.4.1"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <span className="text-[11px] text-slate-400 block">
              Default ESP32-S3 SoftAP IP address is usually http://192.168.4.1
            </span>
          </div>
        )}

        {/* Error notification if connection failed */}
        {errorMessage && (
          <div className="p-3 mb-6 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Connection Advisory</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Device Information summary */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs font-mono mb-6 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-slate-400 block text-[10px]">SELECTED TRANSPORT</span>
            <span className="text-white font-bold">{selectedMethod}</span>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-slate-400 block text-[10px]">LAST COMMUNICATED</span>
            <span className="text-cyan-300">
              {telemetry.lastHeard ? new Date(telemetry.lastHeard).toLocaleTimeString() : 'NEVER'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5">
          {telemetry.connection === 'CONNECTED' ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveScreen('DASHBOARD')}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-500/20"
              >
                <span>OPEN DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-red-500/40 text-red-400 font-heading text-xs font-bold uppercase tracking-wider transition-all"
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleConnect}
                disabled={isScanning}
                className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 active:scale-98 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>CONNECTING...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>CONNECT / SCAN</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playModeChange();
                  enterDemoMode();
                }}
                className="py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 font-heading text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>CONTINUE IN DEMO MODE</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
