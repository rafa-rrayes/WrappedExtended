import type { EntitySort, EntityType } from "@/types/dashboard";
import { ENTITY_META } from "./entity-meta";

/**
 * The library table's column model.
 *
 * Shared by the desktop table header (clickable sort buttons), the mobile card list and
 * the mobile sort dropdown, so the three can never drift apart on what is sortable.
 */
export interface EntityColumn {
  key: "rank" | "name" | "artist" | "hours" | "plays" | "first" | "last";
  label: string;
  /** The `sort` value this column maps to; absent when the API cannot sort by it. */
  sort?: EntitySort;
  align: "left" | "right";
  /** Width/visibility classes applied to both `<th>` and `<td>`. */
  className?: string;
}

const ALL_COLUMNS: EntityColumn[] = [
  { key: "rank", label: "#", align: "right", className: "w-14 tabular-nums" },
  { key: "name", label: "Name", sort: "name", align: "left" },
  { key: "artist", label: "Artist", align: "left", className: "w-[26%]" },
  { key: "hours", label: "Hours", sort: "hours", align: "right", className: "w-24 tabular-nums" },
  { key: "plays", label: "Plays", sort: "plays", align: "right", className: "w-24 tabular-nums" },
  { key: "first", label: "First listen", sort: "first", align: "right", className: "w-32" },
  { key: "last", label: "Last listen", sort: "last", align: "right", className: "w-32" },
];

export function columnsFor(type: EntityType): EntityColumn[] {
  const meta = ENTITY_META[type];
  return ALL_COLUMNS.filter((column) => column.key !== "artist" || meta.hasArtistColumn).map(
    (column) => (column.key === "name" ? { ...column, label: meta.nameLabel } : column),
  );
}

/** Just the sortable columns, in table order — drives the mobile sort dropdown. */
export function sortOptionsFor(type: EntityType): { value: EntitySort; label: string }[] {
  return columnsFor(type)
    .filter((column): column is EntityColumn & { sort: EntitySort } => Boolean(column.sort))
    .map((column) => ({ value: column.sort, label: column.label }));
}
