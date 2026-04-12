import { CheckCircle2, XCircle, Mail, ArrowRight, Heart } from 'lucide-react';

const InvitationThankYou = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const status = searchParams.get('status');
  
  const isAccepted = status === 'accepted';

  return (
    <div className="min-h-screen bg-[#04070D] text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-amber-500/30">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse duration-700" />
      </div>

      <div className="w-full max-w-xl text-center relative z-10 space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="flex justify-center mb-8">
          {isAccepted ? (
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="text-emerald-500" size={48} />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-slate-800/50 flex items-center justify-center border border-white/10 shadow-2xl">
              <XCircle className="text-slate-500" size={48} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            {isAccepted ? 'Thank You!' : 'Response Received'}
          </h1>
          <p className="text-lg text-slate-400 font-medium">
            {isAccepted 
              ? "We're absolutely thrilled to have you join us. Your expertise will be a cornerstone of the summit."
              : "Thank you for letting us know. We respect your decision and hope to collaborate in the future."}
          </p>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl space-y-6">
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500">What Happens Next?</div>
            <p className="text-sm leading-relaxed text-slate-300">
              {isAccepted 
                ? "Our coordinating team will reach out shortly with logistics, travel arrangements, and session details. Keep an eye on your inbox!"
                : "Your response has been securely logged. No further action is required from your side."}
            </p>
          </div>

          {isAccepted && (
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                <Mail size={14} className="text-amber-500" />
                Contact us anytime at coordination@conferencehub.ai
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-6 pt-12">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <Heart size={14} className="text-rose-500/60" />
            Powered by Conference Hub AI
          </div>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all duration-300"
          >
            Visit Website
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationThankYou;
