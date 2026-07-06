"use client";

import { useState, useEffect } from "react";

interface Question {
  id: string;
  body: string;
  options: string[];
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
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D" | "E">>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          setQuestions(shuffleArray(data.questions));
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

      setShowCompletion(true);
      onComplete();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="end-screen-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="end-screen-panel flex flex-col w-full max-w-4xl max-h-[85vh] bg-[#f0d9a8] rounded-2xl border border-[#c4a870] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="relative flex items-center justify-between px-8 py-5 flex-shrink-0 border-b border-[#c4a870]">
          <div>
            <h1 className="text-2xl font-bold text-[#5c2a0e]">
              {showCompletion 
                ? "Post-test Completed" 
                : `${period.charAt(0) + period.slice(1).toLowerCase()} Post-test`}
            </h1>
            {!showCompletion && (
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
                      const letter = ["A", "B", "C", "D", "E"][optIndex] as "A" | "B" | "C" | "D" | "E";
                      const isSelected = answers[q.id] === letter;
                      
                      return (
                        <button
                          key={letter}
                          onClick={() => setAnswers({ ...answers, [q.id]: letter })}
                          className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all duration-150 ${
                            isSelected
                              ? "border-[#5c2a0e] bg-[#5c2a0e] text-[#f5e6c8]"
                              : "border-[#c4a870] bg-[#f5e6c8]/50 text-[#3a2010] hover:bg-[#f5e6c8]/80 hover:scale-[1.01]"
                          }`}
                        >
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                            isSelected ? "border-[#f5e6c8] bg-[#f5e6c8] text-[#5c2a0e]" : "border-[#c4a870] bg-[#e8cd94]"
                          }`}>
                            {letter}
                          </span>
                          <span className="text-sm font-medium">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCompletion && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500 text-green-600 text-4xl">
                ✓
              </div>
              <h2 className="text-3xl font-bold text-[#5c2a0e] text-center">Post-test Submitted!</h2>
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
          </div>
        )}
      </div>
    </div>
  );
}
