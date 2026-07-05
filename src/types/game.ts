export type CardCategory =
  | "GRAM_STAIN"
  | "VIRULENCE_FACTOR"
  | "LAB_CHARACTERISTIC"
  | "SPECIAL_TRAIT"
  | "CLINICAL_MANIFESTATION";

export type GramType = "POSITIVE" | "NEGATIVE" |"ACID_FAST" | "NONE" | "PROTOZOA" | "PLATYHEMINTH" | "NEMATODE";

export type MicrobeTag =
  | "ANAEROBE"
  | "AEROBE"
  | "FACULTATIVE_ANAEROBE"
  | "SPORE_FORMER"
  | "ENCAPSULATED"
  | "INTRACELLULAR";

export interface ClueCard {
  category: CardCategory;
  label: string;
  imageUrl: string;
}

export interface CardSlotState {
  index: number;
  revealed: boolean;
  card: ClueCard | null;
}

export interface Microbe {
  id: string;
  name: string;
  shortName: string;
  answerImageUrl: string;
  gramType: GramType;
  tags: MicrobeTag[];
}

export interface SessionState {
  id: string;
  heartsLeft: number;
  currentRound: number;
  totalScore: number;
  completed: boolean;
  gameMode: string;
  slots: CardSlotState[];
}

export interface RevealResponse {
  card: ClueCard;
  session: { cardsOpened: number; heartsLeft: number };
}

export interface AnswerResponse {
  correct: boolean;
  correctMicrobe: {
    id: string;
    name: string;
    shortName: string;
    imageUrl: string;
  };
  roundScore: number;
  session: {
    heartsLeft: number;
    totalScore: number;
    completed: boolean;
    currentRound: number;
    currentMicrobeInRound: number;
  };
}

export interface RoundResult {
  roundNumber: number;
  correct: boolean;
  roundScore: number;
  correctMicrobe: AnswerResponse["correctMicrobe"];
  openedSlots: CardSlotState[];
}
