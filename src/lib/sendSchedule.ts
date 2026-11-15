/** RUM send runs fire every 2 minutes. Returns the first 2-minute mark at least `minDelayMin` after `submittedAt`. */
export function scheduledSendTime(submittedAt: Date | string, minDelayMin = 1): Date {
  const RUN = 2 * 60 * 1000;
  const earliest = new Date(submittedAt).getTime() + minDelayMin * 60 * 1000;
  return new Date(Math.ceil(earliest / RUN) * RUN);
}
