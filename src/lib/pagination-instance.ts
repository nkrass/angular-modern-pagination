export interface PaginationInstance {
  /**
   * Optional instance id for pages that need multiple independent paginations.
   */
  id?: string;
  /**
   * Number of items per page.
   */
  itemsPerPage: number;
  /**
   * Current page (1-based).
   */
  currentPage: number;
  /**
   * Total items count when known.
   */
  totalItems?: number;
  /**
   * Total pages count when known.
   */
  totalPages?: number;
  /**
   * Fallback server-side hint when totals are not known.
   */
  hasNextPage?: boolean;
}
