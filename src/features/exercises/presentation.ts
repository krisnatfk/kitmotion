export type ExerciseVisual = {
  src: string;
  alt: string;
  cue: string;
};

const EXERCISE_VISUALS: Record<string, ExerciseVisual> = {
  squat: {
    src: "/images/exercises/squat-guide.webp",
    alt: "Atlet memperagakan posisi squat yang benar",
    cue: "Tampak samping · pinggul ke belakang",
  },
  "jumping-jack": {
    src: "/images/exercises/jumping-jack-guide.webp",
    alt: "Atlet memperagakan posisi terbuka jumping jack",
    cue: "Tampak depan · tangan dan kaki terbuka",
  },
  "push-up": {
    src: "/images/exercises/push-up-guide.webp",
    alt: "Atlet memperagakan posisi push-up yang benar",
    cue: "Tampak samping · tubuh tetap lurus",
  },
  "sit-up": {
    src: "/images/exercises/sit-up-guide.webp",
    alt: "Atlet memperagakan posisi atas sit-up dengan punggung lurus",
    cue: "Tampak samping · dada mencapai lutut",
  },
  "pull-up": {
    src: "/images/exercises/pull-up-guide.webp",
    alt: "Atlet memperagakan pull-up dengan dagu melewati palang",
    cue: "Tampak depan · dagu di atas palang",
  },
  "chinning-up": {
    src: "/images/exercises/chinning-up-guide.webp",
    alt: "Atlet mempertahankan posisi chinning-up dengan siku ditekuk",
    cue: "Tampak depan · tahan siku tekuk",
  },
};

const FALLBACK_VISUAL: ExerciseVisual = {
  src: "/images/kitmotion-athlete-hero.webp",
  alt: "Atlet memperagakan gerakan latihan",
  cue: "Ikuti contoh gerakan dengan kontrol",
};

export function getExerciseVisual(slug: string): ExerciseVisual {
  return EXERCISE_VISUALS[slug] ?? FALLBACK_VISUAL;
}
