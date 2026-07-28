export type ExerciseVisual = {
  src: string;
  alt: string;
  cue: string;
};

const EXERCISE_VISUALS: Record<string, ExerciseVisual> = {
  squat: {
    src: "/images/exercises/squat-guide.png",
    alt: "Atlet memperagakan posisi squat yang benar",
    cue: "Tampak samping · pinggul ke belakang",
  },
  "jumping-jack": {
    src: "/images/exercises/jumping-jack-guide.png",
    alt: "Atlet memperagakan posisi terbuka jumping jack",
    cue: "Tampak depan · tangan dan kaki terbuka",
  },
  "push-up": {
    src: "/images/exercises/push-up-guide.png",
    alt: "Atlet memperagakan posisi push-up yang benar",
    cue: "Tampak samping · tubuh tetap lurus",
  },
};

const FALLBACK_VISUAL: ExerciseVisual = {
  src: "/images/kitmotion-athlete-hero.png",
  alt: "Atlet memperagakan gerakan latihan",
  cue: "Ikuti contoh gerakan dengan kontrol",
};

export function getExerciseVisual(slug: string): ExerciseVisual {
  return EXERCISE_VISUALS[slug] ?? FALLBACK_VISUAL;
}
