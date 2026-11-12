import { prisma } from "./db.js";

// Setting polls + schedule, kept free of Next.js imports so plain Node (tests,
// scripts) can use them too.
export async function getSetting() {
  return prisma.systemSetting.findUnique({ where: { id: 1 } });
}

export function votingOpen(setting) {
  const now = new Date();
  return Boolean(
    setting?.isVotingOpen &&
      (!setting.startTime || setting.startTime <= now) &&
      (!setting.endTime || setting.endTime >= now)
  );
}
