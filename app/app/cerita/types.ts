export type ReactionType = "peluk" | "semangat" | "aku_juga";
export type StoryComment = { id: string; alias: string; body: string; day: string };
export type Story = {
  id: string; alias: string; body: string; day: string;
  reactions: Record<ReactionType, number>;
  mine: Record<ReactionType, boolean>;
  comments: StoryComment[];
};
export type CrisisHelp = { label: string; url: string; phone: string; emergency: string; source: string };
export const crisisPattern = /bunuh\s+diri|menyakiti\s+diri|mengakhiri\s+hidup|ingin\s+mati/i;
export const moderationPattern = /bunuh\s+diri|menyakiti\s+diri|mengakhiri\s+hidup|ingin\s+mati|bangsat|bajingan/i;
