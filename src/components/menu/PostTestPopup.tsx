"use client";

import { useState, useEffect } from "react";

interface Question {
  id: string;
  body: string;
  options: string[];
  correctOption?: "A" | "B" | "C" | "D";
  submittedAnswer?: "A" | "B" | "C" | "D" | null;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function PostTestPopup({
  period,
  onComplete,
  onClose,
}: {
  period: string;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<{ score: number; total: number } | null>(null);
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/posttest")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load posttest questions.");
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.questions) {
          if (data.submitted) {
            setIsReviewMode(true);
            setQuestions(data.questions); // Keep original sortOrder for review
            setScoreResult({ score: data.score ?? 0, total: data.questions.length });
          } else {
            setIsReviewMode(false);
            setQuestions(shuffleArray(data.questions));
          }
        } else {
          setError("Failed to load posttest questions.");
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Error fetching questions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/posttest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, answers }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to submit post-test.");
      }

      const data = await res.json();
      setScoreResult({ score: data.score, total: data.total });
      setShowCompletion(true);
      onComplete();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setSubmitting(false);
    }
  }

  // Ticker for the score - matches EndScreen ease-out quad
  useEffect(() => {
    if (!scoreResult) return;
    let raf: number;
    const DELAY = 650;
    const DURATION = 1000;
    const start = Date.now();

    const tick = () => {
      const t = Math.min((Date.now() - start) / DURATION, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayScore(Math.round(eased * scoreResult.score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    const timeout = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, DELAY);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [scoreResult]);

  return (
    <div className="end-screen-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="end-screen-panel flex flex-col w-full max-w-4xl max-h-[85vh] bg-[#f0d9a8] rounded-2xl border border-[#c4a870] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="relative flex items-center justify-between px-8 py-5 flex-shrink-0 border-b border-[#c4a870]">
          <div>
            <h1 className="text-2xl font-bold text-[#5c2a0e]">
              {showCompletion 
                ? "Post-test Results" 
                : isReviewMode 
                ? `${period.charAt(0) + period.slice(1).toLowerCase()} Post-test Review`
                : `${period.charAt(0) + period.slice(1).toLowerCase()} Post-test`}
            </h1>
            {isReviewMode && scoreResult && (
              <p className="text-sm font-semibold text-[#5c2a0e] mt-0.5">
                Completed! Your score: <span className="font-mono text-base text-[#3a2010]">{displayScore === null ? "..." : displayScore} / {scoreResult.total}</span>
              </p>
            )}
            {!isReviewMode && !showCompletion && (
              <p className="text-sm text-[#5c2a0e] mt-0.5">
                You must complete this post-test to unlock the play button.
              </p>
            )}
          </div>
          {!showCompletion && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full text-[#5c2a0e] hover:bg-[#c4a870]/40 transition-colors text-lg"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="text-[#5c2a0e] font-semibold text-lg animate-pulse">Loading questions...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 text-red-800 p-4 rounded-xl border border-red-200 text-sm">
              {error}
            </div>
          )}

          {!loading && !showCompletion && questions.length > 0 && (
            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-[#c4a870] bg-[#e8cd94] p-5 space-y-4">
                  <p className="text-[#3a2010] font-semibold text-base">
                    Question {i + 1}: {q.body}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, optIndex) => {
                      const letter = ["A", "B", "C", "D"][optIndex] as "A" | "B" | "C" | "D";
                      
                      let className = "border-[#c4a870] bg-[#f5e6c8]/50 text-[#3a2010] hover:bg-[#f5e6c8]/80 hover:scale-[1.01]";
                      let badge = "";
                      let isSelected = false;

                      if (isReviewMode) {
                        const isSubmitted = q.submittedAnswer === letter;
                        const isCorrect = q.correctOption === letter;

                        if (isSubmitted && isCorrect) {
                          className = "border-green-600 bg-green-600/20 text-green-900 font-semibold";
                          badge = "✓";
                        } else if (isSubmitted && !isCorrect) {
                          className = "border-red-600 bg-red-600/20 text-red-900 font-semibold";
                          badge = "✗";
                        } else if (isCorrect) {
                          className = "border-green-600 bg-[#f5e6c8]/50 text-green-800 border-dashed font-semibold";
                          badge = "✓";
                        } else {
                          className = "border-[#c4a870]/40 bg-[#f5e6c8]/20 text-[#3a2010]/60 opacity-60";
                        }
                      } else {
                        isSelected = answers[q.id] === letter;
                        if (isSelected) {
                          className = "border-[#5c2a0e] bg-[#5c2a0e] text-[#f5e6c8]";
                        }
                      }

                      return (
                        <button
                          key={letter}
                          disabled={isReviewMode}
                          onClick={() => setAnswers({ ...answers, [q.id]: letter })}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-all duration-150 ${className}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                              isSelected 
                                ? "border-[#f5e6c8] bg-[#f5e6c8] text-[#5c2a0e]" 
                                : isReviewMode && q.submittedAnswer === letter
                                ? (q.submittedAnswer === q.correctOption ? "border-green-600 bg-green-600 text-white" : "border-red-600 bg-red-600 text-white")
                                : "border-[#c4a870] bg-[#e8cd94]"
                            }`}>
                              {letter}
                            </span>
                            <span className="text-sm font-medium">{opt}</span>
                          </div>
                          {badge && (
                            <span className={`text-lg font-bold ${badge === "✓" ? "text-green-700" : "text-red-700"}`}>
                              {badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCompletion && scoreResult && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500 text-green-600 text-4xl">
                ✓
              </div>
              <h2 className="text-3xl font-bold text-[#5c2a0e] text-center">Post-test Completed!</h2>
              <div className="text-5xl font-mono text-[#3a2010] font-bold tabular-nums">
                Score: {displayScore === null ? "..." : displayScore} / {scoreResult.total}
              </div>
              <p className="text-[#5c2a0e] text-center max-w-md text-base leading-relaxed">
                Thank you for completing the post-test. Your answers have been saved and you can now proceed to play the game!
              </p>
              <button
                onClick={onClose}
                className="rounded-xl bg-gradient-to-b from-[#4da030] to-[#2f6e18] px-8 py-3.5 font-semibold text-white shadow-lg shadow-green-700/20 transition-all hover:from-[#5cb83a] hover:to-[#357d1c] hover:scale-105 active:scale-95"
              >
                Let's Play!
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!showCompletion && !loading && (
          <div className="flex items-center justify-between px-8 py-4 border-t border-[#c4a870] bg-[#e8cd94]/30">
            {isReviewMode ? (
              <>
                <span className="text-[#5c2a0e] text-sm font-semibold">
                  Reviewing completed assessment
                </span>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-gradient-to-b from-[#5c2a0e] to-[#3d1a0a] px-6 py-2.5 font-semibold text-[#f5e6c8] shadow transition-all hover:from-[#733512] hover:to-[#5c2a0e] hover:scale-105 active:scale-95"
                >
                  Close Review
                </button>
              </>
            ) : (
              <>
                <span className="text-[#5c2a0e] text-sm font-semibold">
                  Answered: {Object.keys(answers).length} / {questions.length}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                  className="rounded-xl bg-gradient-to-b from-[#4da030] to-[#2f6e18] px-6 py-2.5 font-semibold text-white shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:from-[#5cb83a] hover:to-[#357d1c]"
                >
                  {submitting ? "Submitting..." : "Submit Post-test"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
