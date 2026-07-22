import { gsap } from "gsap";

const contentItemSelector = [
  ":scope > .home-entry-grid > .entry-card",
  ":scope > .page-module-grid > .module-card",
  ":scope > .blog-page-articles .blog-list-item",
  ":scope > .blog-page-layout > *",
  ":scope > .blog-article-layout > *"
].join(", ");

export function createPublicMotion(root) {
  const media = gsap.matchMedia();
  let timeline = null;
  let prepared = false;
  let playRequested = false;
  let hasPlayed = false;

  function prepare() {
    if (prepared || !root || root.classList.contains("single-module-page")) {
      return;
    }

    const sidebar = root.querySelector(":scope > .public-sidebar");
    const workspace = root.querySelector(":scope > .workspace");
    if (!workspace) {
      return;
    }

    prepared = true;
    media.add(
      {
        desktop: "(min-width: 861px)",
        compact: "(max-width: 860px)",
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      (context) => {
        const { desktop, reduceMotion } = context.conditions;
        const navItems = sidebar ? [...sidebar.querySelectorAll(":scope .module-nav > a")] : [];
        const header = workspace.querySelector(
          ":scope > .workspace-header, :scope > .blog-page-intro, :scope > .blog-article-hero"
        );
        const announcement = workspace.querySelector(":scope > .home-announcement");
        const metrics = [...workspace.querySelectorAll(":scope > .status-strip > div")];
        const contentItems = [...workspace.querySelectorAll(contentItemSelector)].slice(0, 24);
        const viewControl = workspace.querySelector(":scope > .floating-view-control");
        const animatedTargets = [sidebar, ...navItems, header, announcement, ...metrics, ...contentItems, viewControl]
          .filter(Boolean);

        if (reduceMotion || hasPlayed || animatedTargets.length === 0) {
          hasPlayed ||= reduceMotion;
          return;
        }

        gsap.set(animatedTargets, { willChange: "transform,opacity" });
        timeline = gsap.timeline({
          paused: true,
          defaults: { duration: 0.46, ease: "power2.out" },
          onComplete: () => {
            gsap.set(animatedTargets, {
              clearProps: "transform,opacity,visibility,willChange"
            });
          }
        });

        if (sidebar) {
          timeline.fromTo(
            sidebar,
            { autoAlpha: 0, x: desktop ? -16 : 0, y: desktop ? 0 : -8 },
            { autoAlpha: 1, x: 0, y: 0, duration: desktop ? 0.5 : 0.34 },
            0
          );
        }

        if (navItems.length > 0) {
          timeline.fromTo(
            navItems,
            { autoAlpha: 0, x: desktop ? -9 : 0, y: desktop ? 0 : -4 },
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              duration: desktop ? 0.34 : 0.24,
              stagger: desktop ? 0.025 : 0.015
            },
            0.08
          );
        }

        if (header) {
          timeline.fromTo(
            header,
            { autoAlpha: 0, y: desktop ? 18 : 10, scale: desktop ? 0.992 : 1 },
            { autoAlpha: 1, y: 0, scale: 1, duration: desktop ? 0.58 : 0.4 },
            0.08
          );
        }

        if (announcement) {
          timeline.fromTo(
            announcement,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.36 },
            0.16
          );
        }

        if (metrics.length > 0) {
          timeline.fromTo(
            metrics,
            { autoAlpha: 0, y: desktop ? 14 : 8 },
            {
              autoAlpha: 1,
              y: 0,
              duration: desktop ? 0.42 : 0.3,
              stagger: desktop ? 0.045 : 0.025
            },
            0.18
          );
        }

        if (contentItems.length > 0) {
          timeline.fromTo(
            contentItems,
            { autoAlpha: 0, y: desktop ? 18 : 10, scale: desktop ? 0.992 : 1 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: desktop ? 0.48 : 0.34,
              stagger: desktop ? 0.05 : 0.028
            },
            0.24
          );
        }

        if (viewControl) {
          timeline.fromTo(
            viewControl,
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 0.3 },
            0.34
          );
        }

        if (playRequested) {
          hasPlayed = true;
          timeline.play(0);
        }

        return () => {
          timeline?.kill();
          timeline = null;
        };
      },
      root
    );
  }

  function play() {
    playRequested = true;
    if (!timeline || hasPlayed) {
      return;
    }

    hasPlayed = true;
    timeline.play(0);
  }

  function destroy() {
    timeline?.kill();
    timeline = null;
    media.revert();
  }

  return { prepare, play, destroy };
}
