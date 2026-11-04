import type { Photo as PhotoData } from "@/app/(site)/content";
import { frame, fullScreen, Photo } from "./blocks";
import { cn } from "@/lib/utils";

/**
 * Kerala told in single words: each chapter is a full-screen photograph with
 * its word across the middle. A chapter holds still for a moment, then the
 * next one pushes it up and away (CSS sticky, so it reads the same without
 * script). With motion, the photo settles and the word assembles letter by
 * letter as each chapter arrives (motion.tsx, chapterScenes).
 */
export function WhyChapters({ chapters }: { chapters: { word: string; text: string; photo: PhotoData; veil?: number }[] }) {
  return (
    <div>
      {chapters.map((c) => (
        <article key={c.word} data-chapter className="h-[160svh] bg-night text-night-ink">
          <div className="sticky top-0 isolate flex h-svh flex-col justify-end overflow-hidden">
            <div data-chapter-photo className="absolute inset-0 -z-10">
              <Photo photo={c.photo} sizes={fullScreen(c.photo)} still className="h-full w-full" />
            </div>
            {/* Pale photographs get a deeper veil so the word keeps its contrast. */}
            <div className="absolute inset-0 -z-10 bg-night" style={{ opacity: c.veil ?? 0.3 }} aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[linear-gradient(transparent,rgb(8_12_14/0.6))]" aria-hidden="true" />
            <h3 data-chapter-word className="site-display absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[clamp(4.25rem,15vw,17rem)]">{c.word}</h3>
            <p data-chapter-text className={cn(frame, "box-content max-w-[36rem] pb-12 leading-relaxed sm:pb-16")}>{c.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
