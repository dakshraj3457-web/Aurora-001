import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Cpu,
  User,
  Zap,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { AiChatMessage, MissionMode } from '../types/telemetry';
import { soundManager } from '../utils/sound';

export const AiMissionOfficer: React.FC = () => {
  const { telemetry, anomalies, sendCommand } = useTelemetry();

  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Greetings, Operator. I am the AURORA-01 AI Mission Officer. I analyze live telemetry from your Arduino UNO and sensors (INA219, MPU6050, HC-SR04, LDR, OV7670) to detect anomalies, explain flight rules, and recommend telemetry-grounded troubleshooting. How may I assist your mission?`,
      timestamp: Date.now(),
      isSimulatedTelemetry: telemetry.isDemoMode,
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Quick prompt buttons
  const quickPrompts = [
    'Summarize current spacecraft health',
    'Explain any active anomalies',
    'Check INA219 power and bus voltage',
    'Troubleshoot hardware sensor wiring',
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isThinking) return;

    const userMsg: AiChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now(),
      isSimulatedTelemetry: telemetry.isDemoMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);
    soundManager.playBeep(920, 0.05, 'triangle');

    // Build context with truthful telemetry
    const contextTelemetry = {
      isDemoMode: telemetry.isDemoMode,
      connection: telemetry.connection,
      mode: telemetry.mode,
      voltage: telemetry.voltage.value,
      current: telemetry.current.value,
      power: telemetry.power.value,
      light: telemetry.light.value,
      distance: telemetry.distance.value,
      tilt: telemetry.tilt.value,
      anomalies: anomalies.map((a) => `${a.severity}: ${a.title} (${a.readingValue})`),
    };

    try {
      // First attempt backend /api/ai-officer
      const resp = await fetch('/api/ai-officer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg.content,
          telemetry: contextTelemetry,
        }),
      }).catch(() => null);

      if (resp && resp.ok) {
        const data = await resp.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: data.reply,
            timestamp: Date.now(),
            suggestedCommand: data.suggestedCommand,
            isSimulatedTelemetry: telemetry.isDemoMode,
          },
        ]);
      } else {
        // High-intelligence onboard rule synthesizer fallback
        await new Promise((r) => setTimeout(r, 800));
        const reply = generateOnboardAiResponse(userMsg.content, telemetry, anomalies);
        setMessages((prev) => [...prev, reply]);
      }
    } catch {
      const fallback = generateOnboardAiResponse(userMsg.content, telemetry, anomalies);
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsThinking(false);
      soundManager.playBeep(1150, 0.08, 'sine');
    }
  };

  // Rule-based flight officer logic when server API is offline
  const generateOnboardAiResponse = (
    query: string,
    state: typeof telemetry,
    anoms: typeof anomalies
  ): AiChatMessage => {
    const q = query.toLowerCase();
    const modeTag = state.isDemoMode ? '[DEMO TELEMETRY]' : '[REAL HARDWARE TELEMETRY]';

    if (q.includes('summarize') || q.includes('health') || q.includes('status')) {
      const v = state.voltage.value !== null ? `${state.voltage.value.toFixed(2)} V` : '--';
      const i = state.current.value !== null ? `${Math.round(state.current.value)} mA` : '--';
      const p = state.power.value !== null ? `${state.power.value.toFixed(2)} W` : '--';
      const d = state.distance.value !== null ? `${state.distance.value.toFixed(1)} cm` : '--';
      const l = state.light.value !== null ? `${Math.round(state.light.value)} Lux` : '--';
      const anomCount = anoms.length;

      return {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: `${modeTag} AURORA-01 Mission Status Summary:\n• Flight Mode: ${state.mode}\n• System Health: ${state.healthScore}%\n• Bus Voltage: ${v} | Current: ${i} | Power: ${p}\n• Ambient Light: ${l}\n• Proximity (HC-SR04): ${d}\n• Active Anomalies: ${anomCount === 0 ? 'None (Nominal)' : `${anomCount} active issue(s)`}\n\nTelemetry status: ${state.connection}.`,
        timestamp: Date.now(),
        isSimulatedTelemetry: state.isDemoMode,
      };
    }

    if (q.includes('anomal') || q.includes('alert') || q.includes('warning')) {
      if (anoms.length === 0) {
        return {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: `${modeTag} No unresolved anomalies detected. The rule-based monitor reports all sensor metrics (INA219, MPU6050, HC-SR04, LDR) are within safe boundaries.`,
          timestamp: Date.now(),
          isSimulatedTelemetry: state.isDemoMode,
        };
      }

      const top = anoms[0];
      return {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: `${modeTag} Active Anomaly Assessment:\n• Detected Event: ${top.title}\n• Severity: ${top.severity}\n• Subsystem: ${top.sensor} reporting ${top.readingValue}\n• Technical Explanation: The reading crossed threshold (${top.threshold}).\n• Flight Recommendation: ${top.suggestedAction}`,
        timestamp: Date.now(),
        isSimulatedTelemetry: state.isDemoMode,
        suggestedCommand:
          top.severity === 'CRITICAL'
            ? {
                command: 'SAFE_MODE',
                label: 'Engage SAFE_MODE',
                rationale: 'Protect 2S bus and stabilize attitude.',
              }
            : undefined,
      };
    }

    if (q.includes('wire') || q.includes('wiring') || q.includes('hardware') || q.includes('troubleshoot')) {
      return {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: `AURORA-01 Spacecraft Hardware Wiring Guide:\n• USB OTG Link: Connect Android Phone OTG adapter -> USB-A to USB-B cable -> Arduino UNO USB port.\n• Arduino UNO I2C Bus: INA219 (0x40) and MPU6050 (0x68) to SDA (Pin A4) and SCL (Pin A5).\n• HC-SR04 Ultrasonic: VCC -> 5V, GND -> GND, Trig -> Digital Pin 9, Echo -> Digital Pin 10.\n• LDR Light Sensors: A0 (Left), A1 (Center), A2 (Right) with 10kΩ pulldown resistors.\n• SG90 Servo: Digital Pin 3 (PWM). Power servo from external 5V rail, not phone USB port.`,
        timestamp: Date.now(),
        isSimulatedTelemetry: state.isDemoMode,
      };
    }

    const vStr = state.voltage.value !== null ? `${state.voltage.value.toFixed(2)}V` : '--';
    const iStr = state.current.value !== null ? `${Math.round(state.current.value)}mA` : '--';

    return {
      id: `ai_${Date.now()}`,
      role: 'assistant',
      content: `${modeTag} Telemetry status for ${state.deviceName}: Bus voltage is ${vStr} with ${iStr} draw. Connection state: ${state.connection}. Link health: ${state.healthScore}%.`,
      timestamp: Date.now(),
      isSimulatedTelemetry: state.isDemoMode,
    };
  };

  const handleAuthorizeCommand = async (cmd: MissionMode) => {
    soundManager.playModeChange();
    await sendCommand(cmd);
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] space-y-3">
      {/* Header */}
      <div className="bg-slate-950/70 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-md shadow-2xl flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-heading font-bold text-base text-white">AI MISSION OFFICER</h2>
              {telemetry.isDemoMode ? (
                <span className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  DEMO GROUNDING
                </span>
              ) : (
                <span className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  HARDWARE GROUNDED
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Flight Director & Subsystem Diagnostic Copilot
            </p>
          </div>
        </div>

        <div className="text-right text-xs font-mono text-slate-400 hidden sm:block">
          <span>MODEL: GEMINI 3.8 FLASH / ONBOARD HYBRID</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 backdrop-blur-md">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role !== 'user' && (
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm font-sans leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs'
              }`}
            >
              <div className="whitespace-pre-line">{msg.content}</div>

              {/* Suggested Spacecraft Command (Requires Explicit Operator Authorization) */}
              {msg.suggestedCommand && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 font-mono text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 text-cyan-300 font-bold">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>SUGGESTED SPACECRAFT COMMAND</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    {msg.suggestedCommand.rationale}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAuthorizeCommand(msg.suggestedCommand!.command)}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-500/20 active:scale-98"
                  >
                    <span>AUTHORIZE & TRANSMIT {msg.suggestedCommand.command}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="text-[10px] font-mono text-slate-500 mt-1.5 flex justify-end">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-blue-900 border border-blue-500/40 flex items-center justify-center text-white shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 p-2 bg-slate-900/60 rounded-xl border border-slate-800 w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>AI Mission Officer analyzing telemetry downlink...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-mono shrink-0">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(qp)}
            className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 whitespace-nowrap transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="flex items-center space-x-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask AI Mission Officer about telemetry, anomalies, or Arduino wiring..."
          className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isThinking}
          aria-label="Send message to AI Mission Officer"
          className="py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
