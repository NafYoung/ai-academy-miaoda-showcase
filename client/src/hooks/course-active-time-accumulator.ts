export class CourseActiveTimeAccumulator {
  private accumulatedMs = 0;
  private activeStartedAt: number | null = null;

  get active(): boolean {
    return this.activeStartedAt !== null;
  }

  start(now: number): void {
    if (this.activeStartedAt === null) this.activeStartedAt = now;
  }

  pause(now: number): void {
    if (this.activeStartedAt === null) return;
    this.accumulatedMs += Math.max(0, now - this.activeStartedAt);
    this.activeStartedAt = null;
  }

  value(now: number): number {
    const openSegmentMs =
      this.activeStartedAt === null
        ? 0
        : Math.max(0, now - this.activeStartedAt);
    return Math.max(0, Math.round(this.accumulatedMs + openSegmentMs));
  }

  reset(): void {
    this.accumulatedMs = 0;
    this.activeStartedAt = null;
  }
}
