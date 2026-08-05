import type { CompareResponse } from "@/types/dashboard";
import { formatNumber } from "@/lib/utils";
import type { RankingDiff } from "./ranking-diff";

/**
 * The one-line read of the comparison, assembled from the deltas we actually have.
 *
 * Deliberately conservative: it only claims what the payload supports. "Discovered N new
 * artists" is not one of those claims — `unique_artists` counts distinct artists inside a
 * window, so a rise means a wider spread, not first-ever discoveries, and the sentence says
 * so. Small movements are reported as "about the same" instead of being dressed up.
 */

/** Below this, a change is noise rather than news. */
const FLAT_PCT = 2;
const FLAT_POINTS = 0.5;

function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) return "";
  if (clauses.length === 1) return `${clauses[0]}.`;
  const last = clauses[clauses.length - 1];
  return `${clauses.slice(0, -1).join(", ")}, and ${last}.`;
}

function round(value: number): string {
  return formatNumber(Math.round(Math.abs(value)));
}

export function buildCompareSummary(
  data: CompareResponse,
  labelA: string,
  labelB: string,
  artistDiff: RankingDiff,
): string {
  const clauses: string[] = [];
  const hours = data.deltas.total_hours;
  const artists = data.deltas.unique_artists;
  const skip = data.deltas.skip_pct;

  if (hours) {
    if (hours.pct === null) {
      clauses.push(
        hours.b > 0
          ? `You logged ${round(hours.b)} hours in ${labelB} against nothing at all in ${labelA}`
          : `You logged no listening in either ${labelA} or ${labelB}`,
      );
    } else if (Math.abs(hours.pct) < FLAT_PCT) {
      clauses.push(`You listened about as much in ${labelB} as in ${labelA}`);
    } else {
      const direction = hours.pct > 0 ? "more" : "less";
      clauses.push(
        `You listened ${Math.abs(hours.pct).toFixed(0)}% ${direction} in ${labelB} than in ${labelA}`,
      );
    }
  }

  if (artists && Math.abs(artists.abs) >= 1) {
    clauses.push(
      artists.abs > 0
        ? `spread it across ${round(artists.abs)} more artists`
        : `narrowed it to ${round(artists.abs)} fewer artists`,
    );
  }

  if (artistDiff.entered > 0) {
    clauses.push(
      `saw ${artistDiff.entered} new ${artistDiff.entered === 1 ? "name" : "names"} enter your top ${artistDiff.topSize}`,
    );
  }

  if (skip && Math.abs(skip.abs) >= FLAT_POINTS) {
    clauses.push(skip.abs < 0 ? "and skipped less" : "and skipped more");
  }

  // The skip clause already carries its own "and"; everything else gets the joiner.
  const trailingAnd = clauses.length > 1 && clauses[clauses.length - 1].startsWith("and ");
  if (trailingAnd) {
    const last = clauses.pop() as string;
    return `${clauses.join(", ")}, ${last}.`;
  }

  return joinClauses(clauses);
}
