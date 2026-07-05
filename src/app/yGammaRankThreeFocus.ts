import type { YGammaRankThreeFocus } from "./yGammaScene";
import type { YGammaCellAtlas, YGammaCellRecord } from "./yGammaAtlas";
import { pairKey } from "./localView";

export interface YGammaRankThreeFocusPair {
  key: string;
  label: string;
  m: number;
  polygonLabel: string;
  buttonLabel: string;
}

/**
 * Finds a finite rank-three Y_Gamma cell containing the requested rank-two
 * relation. The returned focus keeps that relation first in `pairKeys`, so the
 * renderer and UI treat the user's chosen polygon family as the anchor.
 */
export function findRankThreeFocusContainingPair(
  atlas: YGammaCellAtlas,
  activePairKey?: string,
): YGammaRankThreeFocus | undefined {
  const rankTwoById = new Map(
    atlas.rankTwoCells.map((cell) => [cell.id, cell]),
  );
  const activeRankTwo = activePairKey
    ? atlas.rankTwoCells.find(
        (cell) => relationCellPairKey(cell) === activePairKey,
      )
    : undefined;

  if (activePairKey && !activeRankTwo) {
    return undefined;
  }

  const rankThreeCells = atlas.higherCells
    .filter((cell) => cell.rank === 3)
    .sort(compareYGammaCells);
  const chosen = activeRankTwo
    ? rankThreeCells.find((cell) =>
        cell.rankTwoFaceIds.includes(activeRankTwo.id),
      )
    : rankThreeCells.find((cell) => cell.rankTwoFaceIds.length > 0);

  if (!chosen) {
    return undefined;
  }

  const pairs = chosen.rankTwoFaceIds
    .map((faceId) => rankTwoById.get(faceId))
    .filter((cell): cell is YGammaCellRecord => Boolean(cell));
  const orderedPairs = activeRankTwo
    ? [
        activeRankTwo,
        ...pairs
          .filter((cell) => cell.id !== activeRankTwo.id)
          .sort(compareYGammaCells),
      ]
    : [...pairs].sort(compareYGammaCells);

  if (orderedPairs.length === 0) {
    return undefined;
  }

  return {
    cellId: chosen.id,
    generatorSet: [...chosen.generators].sort((left, right) => left - right),
    pairKeys: orderedPairs.map(relationCellPairKey),
    mode: "full-cell",
    exposeConstructionVertices: true,
    showOnlyFundamentalFaces: false,
    restrictGeneratorSpine: false,
  };
}

export function rankThreeFocusPairOptions(
  atlas: YGammaCellAtlas,
  focus: YGammaRankThreeFocus | undefined,
): YGammaRankThreeFocusPair[] {
  if (!focus) {
    return [];
  }
  const rankTwoByKey = new Map(
    atlas.rankTwoCells.map((cell) => [relationCellPairKey(cell), cell]),
  );

  return focus.pairKeys
    .map((key) => {
      const cell = rankTwoByKey.get(key);
      if (!cell || typeof cell.m !== "number" || !cell.polygonLabel) {
        return undefined;
      }
      return {
        key,
        label: cell.label,
        m: cell.m,
        polygonLabel: cell.polygonLabel,
        buttonLabel: `Look at m=${cell.m} ${cell.polygonLabel}`,
      };
    })
    .filter((entry): entry is YGammaRankThreeFocusPair => Boolean(entry));
}

function relationCellPairKey(cell: YGammaCellRecord): string {
  return pairKey([cell.generators[0] ?? 0, cell.generators[1] ?? 0]);
}

function compareYGammaCells(left: YGammaCellRecord, right: YGammaCellRecord) {
  return left.id.localeCompare(right.id);
}
