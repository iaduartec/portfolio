import type { SeriesMarker, Time, UTCTimestamp } from "lightweight-charts";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUtcInput = (value: string): string => (DATE_ONLY_PATTERN.test(value) ? `${value}T00:00:00Z` : value);

export const toChartTime = (value: string): Time => {
  const parsed = Date.parse(toUtcInput(value));
  if (Number.isFinite(parsed)) {
    return Math.floor(parsed / 1000) as UTCTimestamp;
  }

  return DATE_ONLY_PATTERN.test(value) ? value : value.slice(0, 10);
};

const toSortableTimestamp = (value: string): number => {
  const parsed = Date.parse(toUtcInput(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const mapChartSeriesData = <T extends { time: string }>(
  items: T[]
): Array<Omit<T, "time"> & { time: Time }> => {
  const mapped = items
    .map((item) => ({
      item: { ...item, time: toChartTime(item.time) },
      sortKey: toSortableTimestamp(item.time),
    }))
    .sort((left, right) => left.sortKey - right.sortKey);

  const deduped: Array<(typeof mapped)[number]["item"]> = [];
  const seenKeys = new Map<string, number>();

  mapped.forEach(({ item }) => {
    const dedupeKey = String(item.time);
    const previousIndex = seenKeys.get(dedupeKey);
    if (previousIndex === undefined) {
      seenKeys.set(dedupeKey, deduped.length);
      deduped.push(item);
      return;
    }

    deduped[previousIndex] = item;
  });

  return deduped;
};

export const mapChartMarkers = (markers: SeriesMarker<Time>[]): SeriesMarker<Time>[] =>
  markers.map((marker) => ({
    ...marker,
    time: typeof marker.time === "string" ? toChartTime(marker.time) : marker.time,
  }));

export const isIntradayTimeframe = (timeframe: string): boolean => timeframe.endsWith("m") || timeframe.endsWith("h");
