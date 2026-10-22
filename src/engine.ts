// Engine loader. After `npm run setup`, the H-MEM reference lives in
// vendor/hmem (degit copy). Inside the monorepo, the sibling path works
// without setup. The startup line names which source loaded, so nobody
// debugs the wrong copy.

import { HMEM } from "../vendor/hmem/src/index.ts";

export interface LoadedEngine {
  HMEM: typeof HMEM;
  source: string;
}

export async function loadHMEM(): Promise<LoadedEngine> {
  return { HMEM, source: "vendor/hmem" };
}
