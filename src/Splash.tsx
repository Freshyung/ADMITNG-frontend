import { useEffect, useState } from 'react';

interface SplashProps {
  onEnter: () => void;
}

export default function Splash({ onEnter }: SplashProps) {
  const [timeLeft, setTimeLeft] = useState(4);

  useEffect(() => {
    if (timeLeft <= 0) {
      onEnter();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onEnter]);

  return (
    <div className="fixed inset-0 z-[99999] bg-[#03060d] text-[#e8f0fe] flex flex-col items-center justify-center px-6 overflow-hidden select-none">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse,rgba(0,229,255,0.08)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="relative z-10 text-center flex flex-col items-center max-w-xl animate-[fadeUp_0.5s_ease_both]">
        {/* Brought To You By Tagline */}
        <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-[#506080] mb-4 flex items-center gap-3">
          <span className="w-8 h-px bg-[#1e2d4a]"></span>
          BROUGHT TO YOU BY
          <span className="w-8 h-px bg-[#1e2d4a]"></span>
        </div>

        {/* Stylized EMPEROR Branding */}
        <h1 className="font-['Bebas_Neue'] text-7xl md:text-9xl tracking-wider uppercase text-[#00e5ff] drop-shadow-[0_0_45px_rgba(0,229,255,0.5)] mb-2">
          EMPEROR
        </h1>

        <p className="font-mono text-[12px] tracking-widest text-[#a8b8d8] uppercase mb-12">
          Powering AdmitNG FUTA Engine
        </p>

        {/* Manual Enter Button */}
        <button 
          onClick={onEnter}
          className="group relative bg-[#00e5ff] hover:bg-white active:scale-95 text-black font-extrabold text-[13px] tracking-[2px] uppercase py-4 px-10 rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(0,229,255,0.25)] flex items-center gap-3 cursor-pointer"
        >
          ENTER CALCULATOR
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>

        {/* Countdown Indicator */}
        <div className="font-mono text-[10px] text-[#506080] mt-6 tracking-widest uppercase">
          Auto-entering in <span className="text-[#00e5ff] font-bold">{timeLeft}s</span>
        </div>
      </div>
    </div>
  );
}