export type PublicReview = { id: string; name: string; rating: number; title: string; body: string; helpful: number; voted: boolean; day: string };
export type OwnReview = { id: string; rating: number; title: string; body: string; status: string; note: string | null };
