export default function AggregateScoreCard({ result }: { result: any }) {
  if (!result) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-3xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl p-8 shadow-2xl shadow-cyan-500/10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-cyan-400 uppercase tracking-[0.3em] text-xs">
            Admission Report
          </p>
          <h2 className="text-slate-300 text-lg mt-2">
            Aggregate Score Analysis
          </h2>
        </div>

        {/* Score */}
        <div className="mb-10">
          <h1 className="text-8xl font-black bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
            {result.aggregateScore ? `${Number(result.aggregateScore).toFixed(2)}%` : '0.00%'}
          </h1>
          <p className="text-slate-400 mt-3">
            Calculated Aggregate Score
          </p>
        </div>

        {/* Institution */}   
        <div className="mb-8 rounded-2xl bg-slate-900/60 border border-white/5 p-5">
          <p className="text-slate-500 text-xs uppercase tracking-widest">
            Target Institution
          </p>
          <h3 className="text-2xl font-bold text-white mt-2">
            Federal University of Technology Akure
          </h3>
        </div>

        {/* Breakdown */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-5">
            <p className="text-slate-400 text-sm">UTME Contribution</p>
            <h4 className="text-3xl font-bold text-cyan-400 mt-2">
              50.63 pts
            </h4>
          </div>

          <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-5">
            <p className="text-slate-400 text-sm">O'Level Contribution</p>
            <h4 className="text-3xl font-bold text-blue-400 mt-2">
              20.00 pts
            </h4>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-slate-500 text-sm">Calculate your chances at</p>
          <p className="text-cyan-400 font-semibold mt-1">
            futaaggregate.netlify.app
          </p>
        </div>
      </div>
    </div>
  );
}