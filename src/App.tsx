import { useState, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import AggregateScoreCard from './AggregateScoreCard';

interface Course {
  id: string;
  name: string;
  school: string;
  min_jamb: number;
  range_low: number;
  range_high: number;
  is_estimated: boolean;
  is_health: boolean;
  jamb_subjects: string;
  olevel_subjects: string;
}

const GRADE_POINTS: Record<string, number> = { A1: 80, B2: 72, B3: 67, C4: 62, C5: 57, C6: 52 };
const SUBJECTS = [
  "English Language", "Mathematics", "Physics", "Chemistry", "Biology", 
  "Further Mathematics", "Agricultural Science", "Economics", "Geography", 
  "Government", "Literature in English", "Technical Drawing", "Computer Studies", 
  "Food & Nutrition", "Civic Education", "Commerce", "Accounting", "French", 
  "Yoruba", "Igbo", "Hausa", "Visual Arts", "Music", "Physical Education", 
  "Health Science", "Basic Electronics", "Metal Work", "Wood Work", 
  "Building Construction", "Auto Mechanics"
];

  const FAQS = [
  { 
    q: "How is the FUTA aggregate exactly calculated?", 
    a: "FUTA uses a 75:25 ratio. Your UTME (JAMB) score accounts for 75%. We divide your JAMB score by 400 and multiply by 75. Your O'Level grades account for the remaining 25%. We sum your top 5 grades (A1=80, B2=72, etc.), divide by 400, and multiply by 25." 
  },
  { 
    q: "Does FUTA accept two sittings for O'Level?", 
    a: "Yes, FUTA accepts a maximum of two sittings for most departments. However, highly competitive medical courses like Medicine and Surgery (MBBS) strictly require all 5 O'Level credits to be achieved in a single sitting." 
  },
  { 
    q: "Are these cut-off marks officially fixed?", 
    a: "The ranges provided are highly accurate estimations based on the 2026/2027 admission cycle patterns. FUTA's exact cut-offs fluctuate slightly every year based on the overall performance of the applicants, but these ranges represent the historical safe zones." 
  },
  { 
    q: "What if my aggregate is below my course's cut-off?", 
    a: "If you fall below the competitive range, FUTA sometimes offers a 'Change of Course' form later in the admission process, allowing you to switch to a less competitive department within the same faculty." 
  }
];

// Custom Hook for Local Storage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

// Native Animated Counter Component
const AnimatedScore = ({ score }: { score: number }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000; // 2 seconds

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Smooth deceleration (easeOutQuart)
      const easeProgress = 1 - Math.pow(1 - progress, 4); 
      setDisplayScore(score * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  return <>{displayScore.toFixed(2)}</>;
};

export default function App() {
const [courses, setCourses] = useState<Course[]>([]);

{Array.isArray(courses) ? courses.map(course => (
  <option key={course.id} value={course.id}>{course.name}</option>
)) : <option>Loading courses...</option>}
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
// Calculator State
  const [utmeScore, setUtmeScore] = useLocalStorage<string>('futa_utme', '');
  const [hasSecondSitting, setHasSecondSitting] = useLocalStorage<boolean>('futa_has2nd', false);
  const [activeTab, setActiveTab] = useState<1 | 2>(1); // Active tab doesn't need saving
  
  // Sitting 1 State
  const [subjects1, setSubjects1] = useLocalStorage<string[]>('futa_sub1', Array(5).fill(''));
  const [grades1, setGrades1] = useLocalStorage<string[]>('futa_grd1', Array(5).fill(''));
  
  // Sitting 2 State
  const [subjects2, setSubjects2] = useLocalStorage<string[]>('futa_sub2', Array(5).fill(''));
  const [grades2, setGrades2] = useLocalStorage<string[]>('futa_grd2', Array(5).fill(''));

  // Results State
  const [result, setResult] = useState<{ agg: number, utmePts: number, olevelPts: number } | null>(null);
  const [filter, setFilter] = useState<'all' | 'safe' | 'comp' | 'risky' | 'health'>('all');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

useEffect(() => {
  // Use the Netlify environment variable in production, fallback to local for development
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  fetch(`${apiUrl}/api/courses`)
    .then(res => res.json())
    .then(data => setCourses(data))
    .catch(err => console.error("API Error:", err));
}, []);

  const getBestGrades = () => {
    const bestMap: Record<string, number> = {};
    
    // Process first sitting
    for (let i = 0; i < 5; i++) {
      const sub = subjects1[i];
      const grd = grades1[i];
      if (sub && grd) {
        const pts = GRADE_POINTS[grd];
        if (!bestMap[sub] || pts > bestMap[sub]) bestMap[sub] = pts;
      }
    }

    // Process second sitting if enabled
    if (hasSecondSitting) {
      for (let i = 0; i < 5; i++) {
        const sub = subjects2[i];
        const grd = grades2[i];
        if (sub && grd) {
          const pts = GRADE_POINTS[grd];
          if (!bestMap[sub] || pts > bestMap[sub]) bestMap[sub] = pts;
        }
      }
    }
    return bestMap;
  };

  const calculateAggregate = () => {
    const utme = parseFloat(utmeScore);
    if (isNaN(utme) || utme < 0 || utme > 400) return alert("Enter a valid UTME score (0-400)");
    
    const bestGradesMap = getBestGrades();
    const gradeValues = Object.values(bestGradesMap).sort((a, b) => b - a);
    
    if (gradeValues.length < 5) return alert("Please provide grades for at least 5 distinct subjects.");

    const top5 = gradeValues.slice(0, 5);
    const utmePoints = (utme / 400) * 75;
    const olevelTotal = top5.reduce((sum, val) => sum + val, 0);
    const olevelPoints = (olevelTotal / 500) * 25; 

    setResult({
      agg: Number((utmePoints + olevelPoints).toFixed(2)),
      utmePts: Number(utmePoints.toFixed(2)),
      olevelPts: Number(olevelPoints.toFixed(2))
    });
  };

const downloadScorecard = async () => {
    const node = document.getElementById('scorecard-to-export');
    
    if (!node) {
      alert("Error: Scorecard component not found!");
      return;
    }

    // 1. Force a tiny wait to ensure React has rendered the component
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const dataUrl = await htmlToImage.toPng(node, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#03060d',
        cacheBust: true, // Forces re-render
      });
      
      const link = document.createElement("a");
      link.download = `AdmitNG_Scorecard.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Screenshot error:", err);
    }
  };
    
  const shareResult = async () => {
    const scoreText = result ? `I just calculated my FUTA aggregate: *${result.agg.toFixed(2)}%*! 🎯\n\n` : '';
    const shareData = {
      title: 'AdmitNG FUTA Calculator',
      text: `${scoreText}Check your admission chances for any FUTA department before screening. Free & accurate.\n\n`,
      url: 'https://futaaggregate.netlify.app'
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled or failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert("Score and link copied to clipboard! 📋");
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const filteredSearch = courses.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.school.toLowerCase().includes(search.toLowerCase())
  );

  // Determine tiers for results
  const processedCourses = courses.map(c => {
    let cls: 'safe' | 'comp' | 'risky' = 'risky';
    if (result && result.agg >= c.range_low) cls = 'safe';
    else if (result && result.agg >= c.range_low - 5) cls = 'comp';
    return { ...c, cls };
  }).sort((a, b) => {
    const ord = { safe: 0, comp: 1, risky: 2 };
    return ord[a.cls] - ord[b.cls] || (b.range_low - a.range_low);
  });

  const displayedCourses = processedCourses.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'health') return c.is_health;
    return c.cls === filter;
  });

  return (
    <div className="min-h-screen bg-[#03060d] text-[#e8f0fe] font-sans pb-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,229,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none z-0"></div>
      <div className="fixed -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse,rgba(0,229,255,0.05)_0%,transparent_70%)] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 lg:px-10 pt-8">
        
        {/* Navbar */}
        <nav className="flex justify-between items-center border-b border-[#16213a] pb-6 mb-16">
          <div className="text-3xl font-black text-[#00e5ff] tracking-widest uppercase drop-shadow-[0_0_24px_rgba(0,229,255,0.35)] font-['Bebas_Neue']">
            AdmitNG
            <span className="block text-[#a8b8d8] text-[10px] font-mono tracking-widest mt-[-2px]">For FUTA Aspirants</span>
          </div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#506080] border border-[#1e2d4a] px-3 py-1.5 rounded">2026 / 2027 Session</div>
        </nav>

        {/* Hero */}
        <div className="text-center mb-16 flex flex-col items-center">
          <div className="font-mono text-[10px] tracking-widest uppercase text-[#00e5ff] mb-5 flex items-center gap-3 before:content-[''] before:w-7 before:h-px before:bg-[#00e5ff] after:content-[''] after:w-7 after:h-px after:bg-[#00e5ff]">
            Federal University of Technology, Akure
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-[90px] font-black leading-[0.92] tracking-wide mb-6 uppercase font-['Bebas_Neue']">
            <span className="text-[#506080]">KNOW YOUR</span><br/>
            <span className="text-[#00e5ff] drop-shadow-[0_0_40px_rgba(0,229,255,0.45)]">CHANCES</span><br/>
            <span className="text-[#506080]">BEFORE YOU</span><br/>
            <span className="text-[#00e5ff] drop-shadow-[0_0_40px_rgba(0,229,255,0.45)]">APPLY</span>
          </h1>
          <p className="text-[15px] text-[#a8b8d8] max-w-[580px] leading-relaxed font-medium">
            Calculate your FUTA aggregate score, predict your department chances, and check JAMB subject combinations — all in one place. Free. No download.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 gap-7 items-start">
          
          {/* Card 1: Course Search */}
          <div className="bg-[#0c1220] border border-[#16213a] rounded-2xl p-9 relative z-20 animate-[fadeUp_0.4s_ease_both]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff66] to-transparent"></div>
            
            <div className="font-mono text-[9px] tracking-widest uppercase text-[#506080] mb-6 flex items-center gap-2">
              <span className="text-[#00e5ff] border border-[#00e5ff40] w-[22px] h-[22px] rounded-[3px] flex items-center justify-center text-[10px] shrink-0">01</span> 
              JAMB Subject Checker
            </div>
            <p className="text-[13px] text-[#a8b8d8] mb-5 leading-relaxed">Select a course to instantly see its required JAMB subjects, O'Level requirements, minimum score, and estimated aggregate range.</p>
            
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Type a course name e.g. Computer Science..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#080d18] border border-[#1e2d4a] rounded-lg text-[#e8f0fe] text-[13px] font-semibold py-3 pl-10 pr-4 outline-none focus:border-[#00e5ff] focus:shadow-[0_0_0_3px_rgba(0,229,255,0.07)] transition-all placeholder:text-[#506080]"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#506080]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              
              {search && !selectedCourse && (
                <div className="absolute top-[calc(100%+6px)] inset-x-0 bg-[#0f1628] border border-[#1e2d4a] rounded-lg max-h-[280px] overflow-y-auto z-[9999] shadow-2xl">
                  {filteredSearch.length === 0 ? (
                    <div className="p-5 text-center font-mono text-[11px] text-[#506080]">No courses found for "{search}"</div>
                  ) : (
                    filteredSearch.map(c => (
                      <div key={c.id} onClick={() => { setSelectedCourse(c); setSearch(''); }} className="p-3 border-b border-[#16213a] last:border-0 hover:bg-[#00e5ff14] cursor-pointer transition-colors">
                        <div className="text-[13px] font-bold text-[#e8f0fe]">{c.name}</div>
                        <div className="font-mono text-[9px] tracking-wider text-[#506080] mt-0.5 uppercase">{c.school}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Course Highlight */}
            {selectedCourse && (
              <div className="mt-5 animate-[fadeUp_0.25s_ease_both]">
                <div className="bg-gradient-to-br from-[#00e5ff1a] to-[#00e5ff0a] border border-[#00e5ff4d] rounded-xl p-5 mb-1 relative">
                  <button onClick={() => setSelectedCourse(null)} className="absolute top-4 right-4 text-[10px] uppercase font-mono text-[#506080] hover:text-[#00e5ff]">✕ Clear</button>
                  <div className="font-['Bebas_Neue'] text-[26px] tracking-wide text-[#00e5ff] mb-1">{selectedCourse.name}</div>
                  <div className="font-mono text-[9px] tracking-widest text-[#506080] uppercase">{selectedCourse.school}</div>
                </div>
                <div className="h-px bg-[#16213a] my-4"></div>
                <div className="space-y-3">
                  <div className="flex gap-3.5 border-b border-[#16213a] pb-2.5">
                    <div className="font-mono text-[9px] tracking-widest text-[#506080] uppercase min-w-[80px] pt-0.5 shrink-0">JAMB Subjects</div>
                    <div className="text-[13px] font-semibold leading-relaxed">{selectedCourse.jamb_subjects}</div>
                  </div>
                  <div className="flex gap-3.5 border-b border-[#16213a] pb-2.5">
                    <div className="font-mono text-[9px] tracking-widest text-[#506080] uppercase min-w-[80px] pt-0.5 shrink-0">O'Level Must-Haves</div>
                    <div className="text-[13px] font-semibold leading-relaxed">{selectedCourse.olevel_subjects}</div>
                  </div>
                  <div className="flex gap-3.5 border-b border-[#16213a] pb-2.5">
                    <div className="font-mono text-[9px] tracking-widest text-[#506080] uppercase min-w-[80px] pt-0.5 shrink-0">Min JAMB</div>
                    <div className="text-[13px] font-bold text-[#00e5ff]">{selectedCourse.min_jamb}+</div>
                  </div>
                  <div className="flex gap-3.5 pb-1">
                    <div className="font-mono text-[9px] tracking-widest text-[#506080] uppercase min-w-[80px] pt-0.5 shrink-0">Aggr. Range</div>
                    <div className="text-[13px] font-bold text-[#00e5ff]">{selectedCourse.range_low} – {selectedCourse.range_high}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Calculator */}
          <div className="bg-[#0c1220] border border-[#16213a] rounded-2xl p-9 relative z-10 animate-[fadeUp_0.4s_ease_both] delay-75">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff66] to-transparent"></div>
            
            <div className="font-mono text-[9px] tracking-widest uppercase text-[#506080] mb-6 flex items-center gap-2">
              <span className="text-[#00e5ff] border border-[#00e5ff40] w-[22px] h-[22px] rounded-[3px] flex items-center justify-center text-[10px] shrink-0">02</span> 
              Aggregate Calculator
            </div>

            <div className="font-mono text-[9px] tracking-widest uppercase text-[#506080] mb-2.5">JAMB / UTME Score</div>
            <input 
              type="number" 
              placeholder="000" 
              value={utmeScore}
              onChange={(e) => setUtmeScore(e.target.value)}
              className="w-full bg-[#080d18] border border-[#1e2d4a] rounded-lg text-[#00e5ff] font-mono text-[38px] font-medium p-[18px] outline-none focus:border-[#00e5ff] focus:shadow-[0_0_0_3px_rgba(0,229,255,0.07)] text-center tracking-[5px] transition-all"
            />
            <div className="font-mono text-[10px] text-[#506080] text-center mt-2">out of 400</div>

            {/* Two Sitting Toggle */}
            <label className="flex items-center gap-3 cursor-pointer py-4 border-t border-[#16213a] mt-[22px]" onClick={() => {
              setHasSecondSitting(!hasSecondSitting);
              if (hasSecondSitting) setActiveTab(1); // Reset to tab 1 if turning off
            }}>
              <div className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${hasSecondSitting ? 'bg-[#00e5ff]' : 'bg-[#1e2d4a]'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform ${hasSecondSitting ? 'translate-x-5' : ''}`}></div>
              </div>
              <span className="text-[13px] font-semibold text-[#a8b8d8]">I have a Second Sitting</span>
            </label>

            {hasSecondSitting && (
              <div className="flex gap-2 my-3">
                <button className={`flex-1 p-2.5 rounded-md border text-[12px] font-bold transition-all ${activeTab === 1 ? 'bg-[#00e5ff14] border-[#00e5ff4d] text-[#00e5ff]' : 'bg-transparent border-[#1e2d4a] text-[#506080]'}`} onClick={() => setActiveTab(1)}>First Sitting</button>
                <button className={`flex-1 p-2.5 rounded-md border text-[12px] font-bold transition-all ${activeTab === 2 ? 'bg-[#00e5ff14] border-[#00e5ff4d] text-[#00e5ff]' : 'bg-transparent border-[#1e2d4a] text-[#506080]'}`} onClick={() => setActiveTab(2)}>Second Sitting</button>
              </div>
            )}

            {/* O'Level Inputs mapping function */}
            {(activeTab === 1 ? [subjects1, setSubjects1, grades1, setGrades1] : [subjects2, setSubjects2, grades2, setGrades2]).map((_, __, arr) => {
              const [subs, setSubs, grds, setGrds] = arr as [string[], any, string[], any];
              return (
                <div key={activeTab} className="mt-4 animate-[fadeUp_0.2s_ease_both]">
                  <div className="font-mono text-[9px] tracking-widest uppercase text-[#506080] mb-3">O'Level Grades — {activeTab === 1 ? 'First' : 'Second'} Sitting</div>
                  <div className="flex flex-col gap-2.5">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="grid grid-cols-[1fr_84px] gap-2">
                        <select 
                          value={subs[i]} 
                          onChange={(e) => { const newS = [...subs]; newS[i] = e.target.value; setSubs(newS); }}
                          className="w-full bg-[#080d18] border border-[#1e2d4a] rounded-md text-[13px] font-medium text-[#e8f0fe] py-2.5 pl-3 outline-none focus:border-[#00e5ff]"
                        >
                          <option value="">Subject {i+1}</option>
                          {SUBJECTS.map(s => {
                            const isAlreadySelected = subs.includes(s) && subs[i] !== s;
                            return (
                              <option 
                                key={s} 
                                value={s} 
                                disabled={isAlreadySelected}
                                className={isAlreadySelected ? "text-[#506080] bg-[#080d18]" : "text-[#e8f0fe]"}
                              >
                                {s} {isAlreadySelected ? '(Selected)' : ''}
                              </option>
                             );
                            })}
                          </select>
                        <select 
                          value={grds[i]} 
                          onChange={(e) => { const newG = [...grds]; newG[i] = e.target.value; setGrds(newG); }}
                          className="w-full bg-[#080d18] border border-[#1e2d4a] rounded-md font-mono text-[13px] text-[#00e5ff] text-center outline-none focus:border-[#00e5ff]"
                        >
                          <option value="">—</option>
                          {Object.keys(GRADE_POINTS).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })[0]}

            <button 
              onClick={calculateAggregate}
              className="w-full mt-6 bg-[#00e5ff] hover:opacity-90 active:scale-[0.98] text-black text-[13px] font-extrabold tracking-[1.5px] uppercase py-[17px] rounded-lg transition-all shadow-[0_0_24px_rgba(0,229,255,0.18)]"
            >
              Analyze My Chances →
            </button>
          </div>

          {/* Results Full Width */}
          {result && (
            <div className="col-span-1 md:col-span-2 animate-[fadeUp_0.35s_ease_both] mt-2 pb-4">

              {/* Score Banner */}
              <div className="bg-[#0c1220] border border-[#16213a] rounded-2xl p-7 md:p-11 mb-6 grid md:grid-cols-[1fr_auto] items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
                <div>
                  <div className="font-mono text-[9px] tracking-widest uppercase text-[#506080] mb-2.5">FUTA Aggregate Score</div>
                  <div className="font-['Bebas_Neue'] text-6xl md:text-[100px] leading-[0.88] text-[#00e5ff] drop-shadow-[0_0_40px_rgba(0,229,255,0.35)]">
                    <AnimatedScore score={result.agg} />
                  </div>
                  <div className="flex gap-10 mt-5">
                    <div>
                      <div className="font-mono text-[19px] font-medium">{result.utmePts}</div>
                      <div className="font-mono text-[9px] tracking-widest uppercase text-[#506080] mt-1">UTME · 75%</div>
                    </div>
                    <div>
                      <div className="font-mono text-[19px] font-medium">{result.olevelPts}</div>
                      <div className="font-mono text-[9px] tracking-widest uppercase text-[#506080] mt-1">O'Level · 25%</div>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block font-['Bebas_Neue'] text-[88px] text-white/5 leading-none select-none">FUTA</div>
              </div>

              {/* Department Section */}
              <div className="bg-[#0c1220] border border-[#16213a] rounded-2xl p-6 md:p-9">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="font-['Bebas_Neue'] text-[26px] tracking-wide">Department Predictions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'safe', label: 'Safe ✅' },
                      { id: 'comp', label: 'Competitive ⚠' },
                      { id: 'risky', label: 'Risky ❌' },
                      { id: 'health', label: '🏥 Health' }
                    ].map(f => (
                      <button 
                        key={f.id} 
                        onClick={() => setFilter(f.id as any)}
                        className={`px-3.5 py-1.5 rounded-[4px] border font-mono text-[9px] tracking-widest uppercase transition-all ${filter === f.id ? 'bg-[#00e5ff14] border-[#00e5ff4d] text-[#00e5ff]' : 'bg-transparent border-[#1e2d4a] text-[#506080]'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 p-3.5 bg-[#080d18] border border-[#16213a] rounded-lg mb-4">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#a8b8d8]"><div className="w-2 h-2 rounded-full bg-[#00e676] shrink-0"></div>Safe — above cut-off floor</div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#a8b8d8]"><div className="w-2 h-2 rounded-full bg-[#ffab00] shrink-0"></div>Competitive — within 5 pts</div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#a8b8d8]"><div className="w-2 h-2 rounded-full bg-[#ff1744] shrink-0"></div>Risky — &gt;5 pts below</div>
                </div>

                {/* Pinned Selected Course */}
                {selectedCourse && (
                  <div className="bg-[linear-gradient(135deg,rgba(0,229,255,0.12),rgba(0,229,255,0.05))] border border-[#00e5ff59] rounded-lg p-4 mb-4 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-2 left-4 font-mono text-[8px] tracking-widest text-[#00e5ff] opacity-70">SELECTED COURSE</div>
                    <div>
                      <div className="text-[14px] font-extrabold text-[#00e5ff] mt-3">{selectedCourse.name}</div>
                      <div className="font-mono text-[9px] text-[#506080] mt-1">Range: {selectedCourse.range_low} – {selectedCourse.range_high}</div>
                    </div>
                    {(() => {
                       const cData = processedCourses.find(c => c.id === selectedCourse.id);
                       if (!cData) return null;
                       const badgeStyles = {
                         safe: "bg-[#00e67626] text-[#00e676]",
                         comp: "bg-[#ffab0026] text-[#ffab00]",
                         risky: "bg-[#ff174426] text-[#ff1744]"
                       };
                       const badgeLabels = { safe: "Safe ✅", comp: "Competitive ⚠", risky: "Risky ❌" };
                       return (
                         <div className={`font-mono text-[10px] font-medium px-2.5 py-1 rounded-[4px] whitespace-nowrap ml-2.5 shrink-0 ${badgeStyles[cData.cls]}`}>
                           {badgeLabels[cData.cls]}
                         </div>
                       );
                    })()}
                  </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {displayedCourses.length === 0 ? (
                    <div className="col-span-full py-8 text-center font-mono text-[12px] text-[#506080]">No departments in this category.</div>
                  ) : (
                    displayedCourses.map(d => {
                      const styles = {
                        safe: "bg-[#00e67614] border-[#00e6761a]",
                        comp: "bg-[#ffab0014] border-[#ffab001a]",
                        risky: "bg-[#ff174414] border-[#ff17441a]"
                      };
                      const badgeStyles = {
                        safe: "bg-[#00e6761f] text-[#00e676]",
                        comp: "bg-[#ffab001f] text-[#ffab00]",
                        risky: "bg-[#ff17441f] text-[#ff1744]"
                      };
                      const labels = { safe: "Safe ✅", comp: "Competitive ⚠", risky: "Risky ❌" };
                      return (
                        <div key={d.id} className={`p-3.5 rounded-lg border flex items-center justify-between hover:-translate-y-[1px] transition-transform ${styles[d.cls]}`}>
                          <div>
                            <div className="text-[12px] font-bold text-[#e8f0fe] leading-snug flex items-center gap-1.5">
                              {d.name} {d.is_estimated ? <span className="font-mono text-[8px] tracking-wider text-[#ffab00] bg-[#ffab0014] px-1 py-0.5 rounded-[3px] border border-[#ffab0033] shrink-0">est.</span> : null}
                            </div>
                            <div className="font-mono text-[9px] text-[#506080] mt-1">Range: {d.range_low} – {d.range_high}</div>
                          </div>
                          <div className={`font-mono text-[9px] font-medium px-2 py-1 rounded-[4px] whitespace-nowrap ml-2.5 shrink-0 ${badgeStyles[d.cls]}`}>
                            {labels[d.cls]}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="font-mono text-[10px] text-[#506080] mt-5 leading-relaxed p-4 bg-[#080d18] rounded-lg border-l-2 border-[#00e5ff]">
                  ✅ Most cut-off ranges sourced from confirmed FUTA 2024/2025 departmental data.<br/>
                  ⚠ Medicine & Surgery (MBBS) and Nursing Sciences cut-offs are estimated. Always verify at futa.edu.ng.
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                 <button onClick={downloadScorecard} className="w-full flex items-center justify-center gap-2 bg-[#0c1220] hover:bg-[#0f1628] border border-[#1e2d4a] active:scale-[0.98] text-[#a8b8d8] text-[13px] font-bold py-[15px] rounded-lg transition-all">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Save Scorecard
                </button>
  
                <button onClick={shareResult} className="w-full flex items-center justify-center gap-2 bg-[#00e5ff] hover:opacity-90 active:scale-[0.98] text-[#03060d] text-[13px] font-extrabold py-[15px] rounded-lg transition-all border-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share Result
                </button>
              </div>
              </div>
            </div>
          )}
        </div>

        {/* --- ABOUT & FAQ SECTIONS --- */}
        <div className="grid md:grid-cols-2 gap-12 border-t border-[#16213a] pt-16 mb-20 relative z-20">
          <div>
            <h2 className="font-['Bebas_Neue'] text-4xl tracking-wide text-[#00e5ff] mb-4">About The Calculator</h2>
            <p className="text-[14px] text-[#a8b8d8] leading-relaxed mb-4">
              AdmitNG is an independent, data-driven tool designed to help FUTA aspirants predict their admission chances with mathematical precision before the official screening begins.
            </p>
            <p className="text-[14px] text-[#a8b8d8] leading-relaxed">
              We utilize the official 75:25 scoring ratio (UTME:O'Level) and map your resulting aggregate against the highly verified historical cut-off marks across all 60 academic departments at the Federal University of Technology, Akure.
            </p>
          </div>

          <div>
            <h2 className="font-['Bebas_Neue'] text-4xl tracking-wide text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {FAQS.map((faq, index) => (
                <div key={index} className="bg-[#0c1220] border border-[#1e2d4a] rounded-lg overflow-hidden transition-all">
                  <button 
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full text-left p-4 flex justify-between items-center text-[14px] font-bold text-[#e8f0fe] hover:bg-[#0f1628]"
                  >
                    {faq.q}
                    <span className={`text-[#00e5ff] text-xl transition-transform ${openFaq === index ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  {openFaq === index && (
                    <div className="p-4 pt-0 text-[13px] text-[#a8b8d8] leading-relaxed border-t border-[#1e2d4a] bg-[#080d18]">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* --- FOOTER --- */}
      <footer className="relative z-20 border-t border-[#16213a] bg-[#080d18] py-8 mt-auto w-full">
        <div className="max-w-6xl mx-auto px-5 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <div className="text-xl font-black text-[#00e5ff] tracking-widest uppercase font-['Bebas_Neue'] mb-1">AdmitNG</div>
            <div className="font-mono text-[10px] text-[#506080] uppercase tracking-widest">Empowering FUTA Aspirants</div>
          </div>
          <div className="text-[11px] text-[#506080]">
            <span className="block mb-1">Disclaimer: This tool is strictly for educational and estimation purposes.</span>
            <span>We are not officially affiliated with the Federal University of Technology, Akure (FUTA).</span>
            
            <div className="mt-2">
              <button onClick={() => setShowPrivacy(true)} className="text-[10px] text-[#00e5ff] hover:text-white transition-colors underline underline-offset-2">
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* --- PRIVACY MODAL --- */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-[#03060d]/90 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-[fadeIn_0.2s_ease_both]">
          <div className="bg-[#0c1220] border border-[#1e2d4a] rounded-2xl max-w-lg w-full p-8 relative">
            <button onClick={() => setShowPrivacy(false)} className="absolute top-5 right-5 text-[#506080] hover:text-[#00e5ff] font-mono text-[10px] uppercase tracking-widest">✕ Close</button>
            <h3 className="font-['Bebas_Neue'] text-3xl text-[#00e5ff] mb-4">Privacy Policy</h3>
            <div className="text-[13px] text-[#a8b8d8] space-y-3 leading-relaxed text-left">
              <p><strong>1. Data Collection:</strong> AdmitNG is a stateless client-side application. We do not collect, store, or transmit your JAMB scores, O'Level grades, or personal search history to any external servers.</p>
              <p><strong>2. Calculations:</strong> All aggregate calculations are performed locally right inside your own web browser.</p>
              <p><strong>3. Third-Party Tools:</strong> We do not use tracking cookies or invasive third-party analytics.</p>
            </div>
          </div>
          </div>
      )}

    <div className="fixed top-0 left-[-9999px] z-[-1] opacity-0">
  <div id="scorecard-to-export">
    <AggregateScoreCard result={result} />
  </div>
</div>
    
    </div>
  );
}