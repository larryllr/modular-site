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
  }
];
