import { notFound } from "next/navigation";

export default function PathogenBookPage() {
  notFound();
}


// "use client";
//
// import { useState, useEffect } from "react";
// import Link from "next/link";
//
// type GramType = "POSITIVE" | "NEGATIVE" | "ACID_FAST" | "NONE";
// type GameMode = "BACTERIA" | "PARASITE" | "FUNGI" | "VIRUS";
//
// interface Microbe {
//   id: string;
//   name: string;
//   shortName: string;
//   answerImageUrl: string | null;
//   gameMode: GameMode;
//   gramType: GramType;
//   tags: string[];
//   // populated by /api/pathogen-book once auth is wired; defaults to false
//   unlocked?: boolean;
// }
//
// const GRAM_BADGE: Record<GramType, { label: string; cls: string }> = {
//   POSITIVE: { label: "G+", cls: "bg-purple-900/70 text-purple-200" },
//   NEGATIVE: { label: "G−", cls: "bg-rose-900/70 text-rose-200" },
//   ACID_FAST: { label: "AF", cls: "bg-amber-900/70 text-amber-200" },
//   NONE:      { label: "—",  cls: "bg-zinc-800/60 text-zinc-400"  },
// };
//
// type ModeConfig = { mode: GameMode; label: string; locked: boolean };
//
// const MODES: ModeConfig[] = [
//   { mode: "BACTERIA", label: "Bacteria", locked: false },
//   { mode: "PARASITE", label: "Parasite", locked: false },
//   { mode: "FUNGI",    label: "Fungi",    locked: true  },
//   { mode: "VIRUS",    label: "Virus",    locked: true  },
// ];
//
// const MODE_ICON: Record<GameMode, string> = {
//   BACTERIA: "🦠",
//   PARASITE: "🪱",
//   FUNGI:    "🍄",
//   VIRUS:    "🧬",
// };
//
// // ─── Microbe card (grid item) ─────────────────────────────────────────────────
//
// function MicrobeCard({
//   microbe,
//   selected,
//   onClick,
// }: {
//   microbe: Microbe;
//   selected: boolean;
//   onClick: () => void;
// }) {
//   const isLocked = !microbe.unlocked;
//
//   return (
//     <button
//       onClick={onClick}
//       className="group relative flex flex-col overflow-hidden transition-all duration-200 hover:scale-[1.04]"
//       style={{
//         borderRadius: "8px",
//         border: selected
//           ? "2px solid #8B4513"
//           : "1.5px solid rgba(100,50,10,0.25)",
//         boxShadow: selected
//           ? "0 0 14px rgba(139,69,19,0.55)"
//           : "0 1px 4px rgba(0,0,0,0.1)",
//         background: isLocked ? "#18100a" : "#fdf6e3",
//       }}
//     >
//       {/* Image area */}
//       <div
//         className="relative w-full flex items-center justify-center"
//         style={{ aspectRatio: "3/4", background: isLocked ? "#18100a" : "#f0e0c0" }}
//       >
//         {isLocked ? (
//           <span className="text-2xl opacity-35" aria-hidden>🔒</span>
//         ) : microbe.answerImageUrl ? (
//           // eslint-disable-next-line @next/next/no-img-element
//           <img
//             src={microbe.answerImageUrl}
//             alt={microbe.shortName}
//             className="h-full w-full object-cover"
//           />
//         ) : (
//           <span className="px-1 text-center text-[0.5rem] italic text-[#9a7850]">
//             {microbe.shortName}
//           </span>
//         )}
//         {!isLocked && (
//           <span
//             className={`absolute top-1 right-1 rounded px-1 py-0.5 text-[0.48rem] font-bold leading-none ${GRAM_BADGE[microbe.gramType].cls}`}
//           >
//             {GRAM_BADGE[microbe.gramType].label}
//           </span>
//         )}
//       </div>
//
//       {/* Name label */}
//       <div className="px-1 py-1 text-center" style={{ minHeight: "26px" }}>
//         {isLocked ? (
//           <span className="text-[0.55rem] text-[#5a3520]">???</span>
//         ) : (
//           <p className="text-[0.52rem] italic leading-tight text-[#3d1a0a] line-clamp-2">
//             {microbe.name}
//           </p>
//         )}
//       </div>
//     </button>
//   );
// }
//
// // ─── Right-page detail view ───────────────────────────────────────────────────
//
// function DetailView({ microbe }: { microbe: Microbe }) {
//   const isLocked = !microbe.unlocked;
//
//   if (isLocked) {
//     return (
//       <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
//         <div
//           className="flex h-36 w-28 items-center justify-center rounded-xl text-5xl"
//           style={{ background: "#1a0e06", border: "2px solid rgba(100,50,10,0.35)" }}
//         >
//           <span aria-hidden>🔒</span>
//         </div>
//         <div className="text-center">
//           <p className="text-base font-bold text-[#6b3410]">???</p>
//           <p className="mt-2 text-[0.65rem] italic text-[#9a7850]">
//             Answer this pathogen correctly in a game
//             <br />
//             to unlock its entry in the Pathogen Book.
//           </p>
//         </div>
//       </div>
//     );
//   }
//
//   return (
//     <div className="flex h-full flex-col overflow-y-auto p-5 gap-4">
//       {/* Card + name header */}
//       <div className="flex gap-4 items-start">
//         <div
//           className="relative shrink-0 overflow-hidden rounded-xl shadow-lg"
//           style={{ width: "96px", border: "3px solid #8B4513" }}
//         >
//           {microbe.answerImageUrl ? (
//             // eslint-disable-next-line @next/next/no-img-element
//             <img src={microbe.answerImageUrl} alt={microbe.name} className="w-full object-cover" />
//           ) : (
//             <div
//               className="flex items-center justify-center"
//               style={{ aspectRatio: "3/4", background: "#e8d4b0" }}
//             >
//               <span className="px-2 text-center text-[0.55rem] italic text-[#6b3410]">
//                 {microbe.shortName}
//               </span>
//             </div>
//           )}
//           <span
//             className={`absolute top-1.5 right-1.5 rounded px-1.5 py-0.5 text-[0.5rem] font-bold leading-none ${GRAM_BADGE[microbe.gramType].cls}`}
//           >
//             {GRAM_BADGE[microbe.gramType].label}
//           </span>
//         </div>
//
//         <div className="flex-1 pt-1">
//           <p className="text-sm italic font-semibold leading-snug text-[#2d1206]">
//             {microbe.name}
//           </p>
//           <p className="mt-1 text-[0.6rem] font-medium tracking-wide uppercase text-[#9a7850]">
//             {microbe.gameMode}
//           </p>
//           <p className="mt-0.5 text-[0.6rem] text-[#9a7850]">
//             Gram: {GRAM_BADGE[microbe.gramType].label}
//           </p>
//         </div>
//       </div>
//
//       <div style={{ height: "1px", background: "rgba(139,69,19,0.2)" }} />
//
//       {/* Tags */}
//       {microbe.tags.length > 0 && (
//         <div>
//           <p className="mb-1.5 text-[0.58rem] font-bold uppercase tracking-wider text-[#9a7850]">
//             Properties
//           </p>
//           <div className="flex flex-wrap gap-1.5">
//             {microbe.tags.map((tag) => (
//               <span
//                 key={tag}
//                 className="rounded-full px-2.5 py-0.5 text-[0.58rem] font-medium"
//                 style={{ background: "rgba(139,69,19,0.12)", color: "#5a2d0c" }}
//               >
//                 {tag.replace(/_/g, " ")}
//               </span>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
//
// // ─── Right-page placeholder (nothing selected) ────────────────────────────────
//
// function RightPagePlaceholder({
//   total,
//   unlocked,
// }: {
//   total: number;
//   unlocked: number;
// }) {
//   const pct = total > 0 ? (unlocked / total) * 100 : 0;
//
//   return (
//     <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
//       <div className="text-center">
//         <p
//           className="text-4xl font-bold"
//           style={{ fontFamily: "'Impact','Arial Black',sans-serif", color: "#8B4513" }}
//         >
//           {unlocked}
//           <span className="text-xl text-[#c8a46a]"> / {total}</span>
//         </p>
//         <p className="mt-1 text-[0.65rem] italic text-[#9a7850]">pathogens discovered</p>
//       </div>
//
//       <div
//         className="w-36 overflow-hidden rounded-full"
//         style={{ height: "6px", background: "rgba(139,69,19,0.2)" }}
//       >
//         <div
//           className="h-full rounded-full transition-all duration-700"
//           style={{
//             width: `${pct}%`,
//             background: "linear-gradient(90deg, #8B4513, #d4a96a)",
//           }}
//         />
//       </div>
//
//       <p className="mt-6 text-center text-[0.62rem] italic leading-relaxed text-[#c8a46a]">
//         Select a pathogen on the left
//         <br />
//         to view its entry.
//       </p>
//     </div>
//   );
// }
//
// // ─── Page ─────────────────────────────────────────────────────────────────────
//
// export default function PathogenBookPage() {
//   const [microbes, setMicrobes] = useState<Microbe[]>([]);
//   const [activeMode, setActiveMode] = useState<GameMode>("BACTERIA");
//   const [loading, setLoading] = useState(true);
//   const [selected, setSelected] = useState<Microbe | null>(null);
//
//   useEffect(() => {
//     setLoading(true);
//     setSelected(null);
//     fetch(`/api/pathogen-book?gameMode=${activeMode}`)
//       .then((r) => r.json())
//       .then((data: unknown) => {
//         const list = Array.isArray(data) ? (data as Microbe[]) : [];
//         // unlocked defaults to false until auth returns it per-player
//         setMicrobes(list.map((m) => ({ ...m, unlocked: m.unlocked ?? false })));
//       })
//       .catch(() => setMicrobes([]))
//       .finally(() => setLoading(false));
//   }, [activeMode]);
//
//   const unlockedCount = microbes.filter((m) => m.unlocked).length;
//
//   return (
//     <div
//       className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-cover bg-center"
//       style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
//     >
//       {/* Back button */}
//       <Link
//         href="/"
//         className="absolute left-4 top-4 z-30 flex h-9 items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
//       >
//         ← Back
//       </Link>
//
//       {/* ── Book + tabs group ── */}
//       <div
//         className="relative flex items-stretch"
//         style={{ width: "90vw", maxWidth: "1180px", height: "80vh" }}
//       >
//         {/* ── Mode tabs (left bookmark strip) ── */}
//         <div
//           className="relative z-20 flex flex-col justify-center gap-2"
//           style={{ width: "62px" }}
//         >
//           {MODES.map(({ mode, label, locked }) => {
//             const isActive = activeMode === mode;
//             return (
//               <button
//                 key={mode}
//                 disabled={locked}
//                 onClick={() => !locked && setActiveMode(mode)}
//                 title={locked ? `${label} — Locked` : label}
//                 className="relative flex flex-col items-center justify-center transition-all duration-200"
//                 style={{
//                   width: "54px",
//                   height: "68px",
//                   borderRadius: "10px 0 0 10px",
//                   border: "2px solid",
//                   borderRight: "none",
//                   borderColor: locked ? "#2a1208" : isActive ? "#7a3a10" : "#4a2008",
//                   background: locked
//                     ? "#1e0c05"
//                     : isActive
//                     ? "#f5e6c8"
//                     : "#b07840",
//                   boxShadow: isActive ? "-6px 2px 22px rgba(0,0,0,0.55)" : "none",
//                   transform: isActive ? "translateX(7px)" : "translateX(0)",
//                   cursor: locked ? "not-allowed" : "pointer",
//                   opacity: locked ? 0.55 : 1,
//                   zIndex: isActive ? 25 : 10,
//                 }}
//               >
//                 <span className="text-xl leading-none" aria-hidden>
//                   {locked ? "🔒" : MODE_ICON[mode]}
//                 </span>
//                 <span
//                   className="mt-1 text-[0.48rem] font-bold uppercase tracking-wide leading-none"
//                   style={{
//                     color: isActive ? "#6b3410" : locked ? "#4a2a14" : "#1e0c05",
//                   }}
//                 >
//                   {label}
//                 </span>
//               </button>
//             );
//           })}
//         </div>
//
//         {/* ── The Book ── */}
//         <div
//           className="flex flex-1 flex-col overflow-hidden"
//           style={{
//             background: "linear-gradient(165deg, #4d1a06 0%, #6e2e10 50%, #4d1a06 100%)",
//             border: "5px solid #1e0a01",
//             borderLeft: "none",
//             borderRadius: "0 16px 16px 0",
//             boxShadow:
//               "6px 8px 50px rgba(0,0,0,0.65), inset 0 1px 4px rgba(255,200,100,0.05)",
//           }}
//         >
//           {/* Book header bar */}
//           <div
//             className="flex shrink-0 items-center gap-3 px-5 py-2"
//             style={{ borderBottom: "3px solid #1e0a01" }}
//           >
//             <h1
//               className="text-sm font-bold uppercase tracking-[0.18em]"
//               style={{
//                 color: "#d4a96a",
//                 fontFamily: "'Impact','Arial Black',sans-serif",
//               }}
//             >
//               Pathogen Book
//             </h1>
//             <span className="text-[0.68rem] text-[#9a7850]">
//               {MODES.find((m) => m.mode === activeMode)?.label}
//             </span>
//             <span className="ml-auto font-mono text-[0.68rem] text-[#9a7850]">
//               {unlockedCount}/{microbes.length} discovered
//             </span>
//           </div>
//
//           {/* ── Pages ── */}
//           <div className="flex flex-1 overflow-hidden gap-0 p-2">
//             {/* Left page — scrollable microbe grid */}
//             <div
//               className="flex flex-1 flex-col overflow-hidden rounded-l-md"
//               style={{
//                 background:
//                   "linear-gradient(110deg, #fdf8ee 0%, #f5e8cc 70%, #f8f2e0 100%)",
//                 boxShadow: "inset -4px 0 14px rgba(0,0,0,0.13)",
//               }}
//             >
//               {loading ? (
//                 <div className="flex h-full items-center justify-center">
//                   <p className="animate-pulse text-sm italic text-[#9a7850]">
//                     Loading entries…
//                   </p>
//                 </div>
//               ) : microbes.length === 0 ? (
//                 <div className="flex h-full items-center justify-center">
//                   <p className="text-sm italic text-[#9a7850]">No pathogens found.</p>
//                 </div>
//               ) : (
//                 <div className="overflow-y-auto p-3">
//                   <div
//                     className="grid gap-2"
//                     style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
//                   >
//                     {microbes.map((m) => (
//                       <MicrobeCard
//                         key={m.id}
//                         microbe={m}
//                         selected={selected?.id === m.id}
//                         onClick={() =>
//                           setSelected(selected?.id === m.id ? null : m)
//                         }
//                       />
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//
//             {/* Spine */}
//             <div
//               className="relative flex shrink-0 flex-col items-center justify-evenly"
//               style={{
//                 width: "16px",
//                 background:
//                   "linear-gradient(90deg, #120601 0%, #3d1505 35%, #200a02 50%, #3d1505 65%, #120601 100%)",
//               }}
//             >
//               {[0, 1, 2, 3, 4].map((i) => (
//                 <div
//                   key={i}
//                   style={{
//                     width: "6px",
//                     height: "3px",
//                     borderRadius: "2px",
//                     background: "#5a2d10",
//                     opacity: 0.75,
//                   }}
//                 />
//               ))}
//             </div>
//
//             {/* Right page — detail or placeholder */}
//             <div
//               className="flex flex-1 flex-col overflow-hidden rounded-r-md"
//               style={{
//                 background:
//                   "linear-gradient(70deg, #f8f2e0 0%, #f5e8cc 30%, #fdf8ee 100%)",
//                 boxShadow: "inset 4px 0 14px rgba(0,0,0,0.07)",
//               }}
//             >
//               {loading ? (
//                 <div className="flex h-full items-center justify-center">
//                   <p className="animate-pulse text-sm italic text-[#9a7850]">
//                     Loading…
//                   </p>
//                 </div>
//               ) : selected ? (
//                 <DetailView microbe={selected} />
//               ) : (
//                 <RightPagePlaceholder
//                   total={microbes.length}
//                   unlocked={unlockedCount}
//                 />
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
