"use client";

import { SUMMARY_DOWNLOAD_LINKS, SUMMARY_DOWNLOAD_LINKS_2 } from "@/lib/download-links";

function DownloadCard({
  title,
  description,
  links,
  period,
}: {
  title: string;
  description: string;
  links: Record<string, string>;
  period: string;
}) {
  return (
    <div className="w-full max-w-md rounded-xl border-2 border-[#c4a870] bg-[#e8cd94]/50 p-6 flex flex-col items-center text-center space-y-4 shadow-md">
      <span className="text-3xl">📄</span>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-[#5c2a0e]">{title}</h3>
        <p className="text-sm text-[#5c2a0e]/80 max-w-sm leading-relaxed">
          {description}
        </p>
      </div>
      <a
        href={links[period.toUpperCase()] ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#2a6fb8] to-[#1a4d80] px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-[#3580cc] hover:to-[#1f5a94] hover:scale-105 active:scale-95 text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
        </svg>
        Download Summary
      </a>
    </div>
  );
}

export function DownloadSummaryPopup({
  period,
  onClose,
}: {
  period: string;
  onClose: () => void;
}) {
  return (
    <div className="end-screen-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="end-screen-panel flex flex-col w-full max-w-4xl max-h-[85vh] bg-[#f0d9a8] rounded-2xl border border-[#c4a870] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative flex items-center justify-between px-8 py-5 flex-shrink-0 border-b border-[#c4a870]">
          <h1 className="text-2xl font-bold text-[#5c2a0e]">
            Download Summaries
          </h1>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full text-[#5c2a0e] hover:bg-[#c4a870]/40 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex flex-col items-center space-y-6">
            <p className="text-[#5c2a0e] text-center max-w-md text-base leading-relaxed">
              Here are your content summaries to help you review for your exams.
            </p>

            <DownloadCard
              title="Bacteria Content Summary"
              description="Here's a summary of the bacteria content to help you review for your exams. Download it now!"
              links={SUMMARY_DOWNLOAD_LINKS}
              period={period}
            />

            <DownloadCard
              title="Fungi Content Summary"
              description="Here's a summary of the fungi content to help you review for your exams. Download it now!"
              links={SUMMARY_DOWNLOAD_LINKS_2}
              period={period}
            />

            <button
              onClick={onClose}
              className="rounded-xl bg-gradient-to-b from-[#4da030] to-[#2f6e18] px-8 py-3.5 font-semibold text-white shadow-lg shadow-green-700/20 transition-all hover:from-[#5cb83a] hover:to-[#357d1c] hover:scale-105 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
