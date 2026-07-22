import { startPublicApp } from "../public/app.js";

let publicMotion = null;
const publicMotionReady = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ? Promise.resolve(null)
  : import("./public-motion.js")
      .then(({ createPublicMotion }) => {
        publicMotion = createPublicMotion(document.querySelector("#app"));
        return publicMotion;
      })
      .catch(() => null);

void startPublicApp({
  beforeReveal: async () => (await publicMotionReady)?.prepare()
}).then(async () => (await publicMotionReady)?.play());

window.addEventListener("pagehide", () => publicMotion?.destroy(), { once: true });
