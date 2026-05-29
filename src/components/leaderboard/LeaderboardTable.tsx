export type LeaderboardPlayer = {
  username: string;
  totalScore: number;
  gamesPlayed: number;
};

type RankedPlayer = LeaderboardPlayer & { rank: number };

// Standard competition ranking: equal scores share a rank, next rank skips
// e.g. [1000, 1000, 900] → ranks [1, 1, 3]
function assignRanks(players: LeaderboardPlayer[]): RankedPlayer[] {
  return players.map((player) => ({
    ...player,
    rank: players.filter((p) => p.totalScore > player.totalScore).length + 1,
  }));
}

type RowVariant = "gold" | "silver" | "bronze" | "green";

const VARIANT_STYLES: Record<
  RowVariant,
  { bg: string; border: string; textColor: string; gloss: string }
> = {
  gold: {
    bg: "linear-gradient(180deg, #ffe97a 0%, #e4b90e 50%, #c08a08 100%)",
    border: "#9a7008",
    textColor: "#3a2000",
    gloss: "rgba(255,255,200,0.55)",
  },
  silver: {
    bg: "linear-gradient(180deg, #e0f0fa 0%, #a8cce0 50%, #6890b0 100%)",
    border: "#507898",
    textColor: "#0e2840",
    gloss: "rgba(255,255,255,0.5)",
  },
  bronze: {
    bg: "linear-gradient(180deg, #d8a090 0%, #b05848 50%, #883838 100%)",
    border: "#682828",
    textColor: "#fff0ec",
    gloss: "rgba(255,200,180,0.4)",
  },
  green: {
    bg: "linear-gradient(180deg, #b0f070 0%, #58c028 50%, #389810 100%)",
    border: "#287810",
    textColor: "#062206",
    gloss: "rgba(255,255,255,0.42)",
  },
};

function variantForRank(rank: number): RowVariant {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "green";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TrophyIcon() {
  return (
    <svg
      width="18"
      height="20"
      viewBox="0 0 64 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="inline-block mr-1 align-middle"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
    >
      <path
        d="M14 6h36v22c0 11-8 19-18 20C21 47 14 39 14 28V6z"
        fill="url(#t-body)"
        stroke="#9a6a00"
        strokeWidth="1.5"
      />
      <path d="M14 10 C4 10 4 26 14 26" fill="none" stroke="#d4a010" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 10 C60 10 60 26 50 26" fill="none" stroke="#d4a010" strokeWidth="4" strokeLinecap="round" />
      <rect x="28" y="47" width="8" height="12" fill="#c08020" />
      <rect x="20" y="59" width="24" height="7" rx="3" fill="#c08020" stroke="#7a4a00" strokeWidth="1" />
      <ellipse cx="24" cy="14" rx="4" ry="7" fill="rgba(255,255,220,0.35)" transform="rotate(-15 24 14)" />
      <defs>
        <linearGradient id="t-body" x1="32" y1="6" x2="32" y2="47" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="55%" stopColor="#e8a800" />
          <stop offset="100%" stopColor="#b87000" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

const CELL_BASE: React.CSSProperties = {
  padding: "10px 14px",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
};

function TableRow({ player }: { player: RankedPlayer }) {
  const variant = variantForRank(player.rank);
  const s = VARIANT_STYLES[variant];

  const cellStyle: React.CSSProperties = {
    ...CELL_BASE,
    background: s.bg,
    color: s.textColor,
    borderTop: `2px solid ${s.border}`,
    borderBottom: `2px solid ${s.border}`,
    boxShadow: `inset 0 1px 0 ${s.gloss}`,
    fontFamily: "'Impact','Arial Black',sans-serif",
  };

  return (
    <tr>
      {/* Rank — left-rounded */}
      <td
        style={{
          ...cellStyle,
          borderLeft: `2px solid ${s.border}`,
          borderRadius: "999px 0 0 999px",
          width: "52px",
          textAlign: "center",
          fontSize: "15px",
          fontWeight: "bold",
        }}
      >
        {player.rank === 1 && <TrophyIcon />}
        {player.rank}
      </td>

      {/* Username */}
      <td
        style={{
          ...cellStyle,
          maxWidth: "0",          // forces truncation in table cell
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: "14px",
        }}
      >
        {player.username}
      </td>

      {/* Total Score */}
      <td
        style={{
          ...cellStyle,
          width: "80px",
          textAlign: "right",
          fontSize: "14px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {player.totalScore.toLocaleString()}
      </td>

      {/* Games Completed — right-rounded */}
      <td
        style={{
          ...cellStyle,
          borderRight: `2px solid ${s.border}`,
          borderRadius: "0 999px 999px 0",
          width: "56px",
          textAlign: "center",
          fontSize: "14px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {player.gamesPlayed}
      </td>
    </tr>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function LeaderboardTable({ players }: { players: LeaderboardPlayer[] }) {
  if (players.length === 0) {
    return (
      <p
        className="text-center py-10 font-semibold"
        style={{ color: "#9a7850", fontFamily: "'Impact','Arial Black',sans-serif" }}
      >
        No scores yet — be the first to play!
      </p>
    );
  }

  const ranked = assignRanks(players);

  return (
    <table
      className="w-full"
      style={{ borderCollapse: "separate", borderSpacing: "0 8px" }}
      aria-label="Leaderboard"
    >
      <thead>
        <tr>
          {(["Rank", "Player", "Score", "Completed"] as const).map((h) => (
            <th
              key={h}
              className="pb-1 text-xs font-semibold tracking-wider uppercase text-center"
              style={{ color: "#7a4e1a", fontFamily: "'Impact','Arial Black',sans-serif" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ranked.map((player) => (
          <TableRow key={`${player.username}-${player.rank}`} player={player} />
        ))}
      </tbody>
    </table>
  );
}
