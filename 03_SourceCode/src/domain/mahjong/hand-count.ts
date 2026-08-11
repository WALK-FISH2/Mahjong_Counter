import type { HandSnapshot } from './hand';
import type { Meld } from './meld';

export type HandCount = Readonly<{
  structuralTileCount: number;
  physicalTileCount: number;
}>;

function getMeldPhysicalTileCount(meld: Meld): number {
  return meld.type === 'kong' ? 4 : 3;
}

/**
 * Counts the current snapshot only. Rule-specific ready/target counts are applied
 * later from HandModelDefinition and are deliberately not hard-coded here.
 */
export function countHandStructure(hand: HandSnapshot): HandCount {
  const winningTileCount = hand.winningTile === null ? 0 : 1;
  const structuralTileCount = hand.concealed.length + winningTileCount + hand.melds.length * 3;
  const physicalTileCount =
    hand.concealed.length +
    winningTileCount +
    hand.flowers.length +
    hand.melds.reduce((total, meld) => total + getMeldPhysicalTileCount(meld), 0);

  return Object.freeze({ structuralTileCount, physicalTileCount });
}
