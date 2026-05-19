export const moduleLoaders = [
  {
    id: "overview",
    load: () => import("./overview.js")
  },
  {
    id: "notes",
    load: () => import("./notes.js")
  },
  {
    id: "api-status",
    load: () => import("./api-status.js")
  },
  {
    id: "checklist",
    load: () => import("./checklist.js")
  },
  {
    id: "calculator",
    load: () => import("./calculator.js")
  },
  {
    id: "unit-converter",
    load: () => import("./unit-converter.js")
  },
  {
    id: "timer",
    load: () => import("./timer.js")
  },
  {
    id: "randomizer",
    load: () => import("./randomizer.js")
  },
  {
    id: "text-tools",
    load: () => import("./text-tools.js")
  }
];
