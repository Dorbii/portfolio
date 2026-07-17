export type ProjectMedia = {
  title: string;
  videoSrc: string;
  posterSrc: string;
};

export const projectMediaById: Readonly<
  Partial<Record<string, ProjectMedia>>
> = {
  "engineering-metrics-pipeline": {
    title: "Kaizen Metrics",
    videoSrc: "/projects/kaizen-metrics/transition.mp4",
    posterSrc: "/projects/kaizen-metrics/poster.png",
  },
};
