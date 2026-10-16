import React, { useState } from 'react';
import {
  Camera,
  Download,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { CameraCapture } from '../types/telemetry';
import { soundManager } from '../utils/sound';

export const CameraObservations: React.FC = () => {
  const { telemetry, captures, addCapture, esp32Url } = useTelemetry();
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // High-fidelity demo orbital observation images for Demo Mode
  const demoImages = [
    {
      label: 'Earth Horizon Limb Scan',
      event: 'Nominal Orbital Dawn (LDR > 1200 Lux)',
      resolution: '640x480 VGA',
      svg: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
          <rect width="640" height="480" fill="#020617"/>
          <circle cx="320" cy="850" r="550" fill="#0284c7" opacity="0.95"/>
          <path d="M -50 340 Q 320 290 690 340" stroke="#38bdf8" stroke-width="8" fill="none" opacity="0.85"/>
          <circle cx="120" cy="120" r="2" fill="#ffffff"/>
          <circle cx="480" cy="80" r="2.5" fill="#ffffff"/>
          <circle cx="560" cy="200" r="1.5" fill="#ffffff"/>
          <circle cx="240" cy="90" r="1.5" fill="#ffffff"/>
          <rect x="0" y="440" width="640" height="40" fill="#050811" opacity="0.8"/>
          <text x="20" y="465" fill="#00f0ff" font-family="monospace" font-size="14" font-weight="bold">AURORA-01 // OV7670 CAM // FRAME #0128</text>
        </svg>
      `)}`,
    },
    {
      label: 'Solar Array Wing Deployment Verification',
      event: 'Actuator Telemetry Confirmation (Servo 90°)',
      resolution: '320x240 QQVGA',
      svg: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
          <rect width="640" height="480" fill="#050811"/>
          <polygon points="60,120 280,150 280,330 60,360" fill="#0f172a" stroke="#00f0ff" stroke-width="3"/>
          <line x1="130" y1="130" x2="130" y2="350" stroke="#38bdf8" stroke-width="2"/>
          <line x1="200" y1="140" x2="200" y2="340" stroke="#38bdf8" stroke-width="2"/>
          <polygon points="280,210 400,200 400,270 280,280" fill="#d97706" stroke="#f59e0b" stroke-width="2"/>
          <rect x="0" y="440" width="640" height="40" fill="#050811" opacity="0.8"/>
          <text x="20" y="465" fill="#10b981" font-family="monospace" font-size="14" font-weight="bold">SOLAR ARRAY DEPLOYED: VERIFIED NOMINAL</text>
        </svg>
      `)}`,
    },
  ];

  const handleCapture = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    soundManager.playBeep(1100, 0.08, 'sine');

    try {
      if (telemetry.isDemoMode) {
        // Simulated capture latency
        await new Promise((r) => setTimeout(r, 1200));

        const sample = demoImages[captures.length % demoImages.length];
        const newCap: CameraCapture = {
          id: `cap_${Date.now()}`,
          timestamp: Date.now(),
          dataUrl: sample.svg,
          label: sample.label,
          eventAssociated: sample.event,
          resolution: sample.resolution,
          source: 'DEMO_CACHE',
          fileSizeBytes: 34820,
        };
        addCapture(newCap);
        soundManager.playBeep(1400, 0.1, 'triangle');
      } else {
        // Attempt real capture from configured ESP32-S3 camera endpoint
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const resp = await fetch(`${esp32Url}/capture`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(`ESP32-S3 camera responded with status ${resp.status}`);
        }

        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          addCapture({
            id: `cap_${Date.now()}`,
            timestamp: Date.now(),
            dataUrl: base64,
            label: 'ESP32-S3 Live Observation Capture',
            eventAssociated: 'Operator Manual Command',
            resolution: 'VGA 640x480',
            source: 'ESP32_S3',
            fileSizeBytes: blob.size,
          });
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      setCaptureError(
        err instanceof Error
          ? err.message
          : `Failed to capture from ESP32-S3 camera at ${esp32Url}.`
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = (capture: CameraCapture) => {
    const a = document.createElement('a');
    a.href = capture.dataUrl;
    a.download = `AURORA01_${capture.id}_${capture.label.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-4">
      {/* Header Panel */}
      <div className="bg-slate-950/70 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-wide">
              CAMERA & OBSERVATIONS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            OV7670 Optical Subsystem interfaced via secondary ESP32-S3 microcontroller.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={isCapturing}
            onClick={handleCapture}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg shadow-cyan-500/20 active:scale-98 disabled:opacity-50"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>EXPOSING OV7670...</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>CAPTURE OBSERVATION</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subsystem Connection Status Alert */}
      {!telemetry.isDemoMode && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-300">ESP32-S3 CAMERA ENDPOINT:</span>
            <strong className="text-cyan-300">{esp32Url}</strong>
          </div>
          <span className="text-slate-500">SEPARATE SUBSYSTEM FROM HC-05 ARDUINO</span>
        </div>
      )}

      {captureError && (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Camera Subsystem Offline</strong>
            <span>{captureError}</span>
          </div>
        </div>
      )}

      {/* Main Preview & Event Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Most Recent Capture Preview (Left/Top) */}
        <div className="lg:col-span-7 bg-slate-950/70 border border-cyan-500/20 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs font-mono">
            <span className="text-slate-400 uppercase tracking-wider">PRIMARY SIGHTLINE</span>
            <span className="text-cyan-300">
              {captures.length > 0 ? captures[0].resolution : 'STANDBY'}
            </span>
          </div>

          <div className="relative w-full aspect-video rounded-xl bg-black/80 border border-slate-800 flex items-center justify-center overflow-hidden">
            {captures.length > 0 ? (
              <img
                src={captures[0].dataUrl}
                alt={captures[0].label}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-6 text-slate-500 font-mono text-xs space-y-2">
                <Camera className="w-8 h-8 mx-auto text-slate-600" />
                <p>NO FRAMES IN DOWNLINK BUFFER</p>
                <p className="text-[10px] text-slate-600">
                  Click 'CAPTURE OBSERVATION' to trigger the OV7670 camera shutter.
                </p>
              </div>
            )}

            {captures.length > 0 && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono bg-slate-950/80 backdrop-blur-sm px-2.5 py-1.5 rounded border border-slate-800 text-slate-300">
                <span>{captures[0].label}</span>
                <button
                  type="button"
                  onClick={() => handleDownload(captures[0])}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>SAVE</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gallery / History (Right/Bottom) */}
        <div className="lg:col-span-5 bg-slate-950/70 border border-cyan-500/20 rounded-2xl p-4 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs font-mono">
            <span className="text-slate-400 uppercase tracking-wider">EVENT OBSERVATIONS</span>
            <span className="text-slate-400">{captures.length} STORED</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[360px]">
            {captures.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">
                Observation log empty.
              </div>
            ) : (
              captures.map((cap) => (
                <div
                  key={cap.id}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-colors flex items-center space-x-3"
                >
                  <div className="w-16 h-12 rounded-lg bg-black border border-slate-800 overflow-hidden shrink-0">
                    <img src={cap.dataUrl} alt={cap.label} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0 text-xs font-mono">
                    <h5 className="font-bold text-slate-200 truncate">{cap.label}</h5>
                    <div className="text-[10px] text-slate-400 truncate">{cap.eventAssociated}</div>
                    <div className="flex items-center space-x-2 text-[9px] text-slate-500 mt-0.5">
                      <span>{new Date(cap.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>{cap.resolution}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload(cap)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300"
                    title="Download capture"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
