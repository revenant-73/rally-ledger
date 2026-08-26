import { describe, expect, it } from 'vitest';
import {
  getAvailableNextSetNumbers,
  getMatchFormatSettings,
  getSetTarget,
  isMatchCompleteAfterSet,
} from './matchFormat';

describe('matchFormat', () => {
  it('defaults to a best-of-3 match with 25 and 15 point targets', () => {
    const settings = getMatchFormatSettings(null);

    expect(settings).toMatchObject({
      format: 'best-of-3',
      maxSets: 3,
      setsToWin: 2,
      standardSetTarget: 25,
      decidingSetTarget: 15,
    });
  });

  it('reads format and set targets from match metadata', () => {
    const settings = getMatchFormatSettings({
      metadata: {
        matchFormat: 'best-of-5',
        standardSetTarget: 21,
        decidingSetTarget: 11,
      },
    });

    expect(settings.maxSets).toBe(5);
    expect(settings.setsToWin).toBe(3);
    expect(getSetTarget(settings, 4)).toBe(21);
    expect(getSetTarget(settings, 5)).toBe(11);
  });

  it('offers only unplayed sets within the selected format', () => {
    const settings = getMatchFormatSettings({ metadata: { matchFormat: 'fixed-2' } });

    expect(getAvailableNextSetNumbers(settings, [1])).toEqual([2]);
    expect(getAvailableNextSetNumbers(settings, [1, 2])).toEqual([]);
  });

  it('finishes best-of formats when either team reaches the required set wins', () => {
    const settings = getMatchFormatSettings({ metadata: { matchFormat: 'best-of-3' } });

    expect(isMatchCompleteAfterSet(settings, ['Win'])).toBe(false);
    expect(isMatchCompleteAfterSet(settings, ['Win', 'Win'])).toBe(true);
    expect(isMatchCompleteAfterSet(settings, ['Loss', 'Loss'])).toBe(true);
  });

  it('finishes fixed formats only when the max set count has been played', () => {
    const settings = getMatchFormatSettings({ metadata: { matchFormat: 'fixed-2' } });

    expect(isMatchCompleteAfterSet(settings, ['Win'])).toBe(false);
    expect(isMatchCompleteAfterSet(settings, ['Win', 'Loss'])).toBe(true);
  });
});
