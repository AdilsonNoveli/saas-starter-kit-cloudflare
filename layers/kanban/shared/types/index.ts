// Shapes shared between this layer's tRPC router and its Vue components.
// Plain interfaces rather than `$inferSelect` off the Drizzle tables: these
// are also imported by client-side code, which must not pull the server
// schema (and with it postgres-js) into the browser bundle.

export interface KanbanCardItem {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
}

export interface KanbanColumnItem {
  id: string;
  boardId: string;
  name: string;
  position: number;
  cards: KanbanCardItem[];
}

export interface KanbanBoardItem {
  id: string;
  teamId: string;
  name: string;
}

export interface KanbanBoardDetail extends KanbanBoardItem {
  columns: KanbanColumnItem[];
}
