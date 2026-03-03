import { EventEmitter, Injectable } from '@angular/core';
import { PaginationInstance } from './pagination-instance';
import {
  coerceNonNegativeInteger,
  coerceOptionalBoolean,
  coercePositiveInteger,
  parseNumber,
} from './pagination-utils';

type RegisteredInstance = Required<
  Pick<PaginationInstance, 'id' | 'itemsPerPage' | 'currentPage' | 'totalItems'>
> &
  Pick<PaginationInstance, 'totalPages' | 'hasNextPage'>;

@Injectable({
  providedIn: 'root',
})
export class PaginationService {
  readonly change = new EventEmitter<string>();
  private readonly instances: Record<string, RegisteredInstance> = {};
  private readonly DEFAULT_ID = 'DEFAULT_PAGINATION_ID';

  defaultId(): string {
    return this.DEFAULT_ID;
  }

  /**
   * Register or update a pagination instance.
   * Returns true when the instance is new or changed.
   */
  register(instance: PaginationInstance): boolean {
    const normalized = this.normalizeInstance(instance);
    const current = this.instances[normalized.id];

    if (!current) {
      this.instances[normalized.id] = normalized;
      return true;
    }

    return this.updateInstance(current, normalized);
  }

  /**
   * Current page for an id. Defaults to page 1.
   */
  getCurrentPage(id: string): number {
    const instance = this.instances[id];
    return instance ? instance.currentPage : 1;
  }

  /**
   * Update current page when it is in bounds.
   */
  setCurrentPage(id: string, page: number): void {
    const instance = this.instances[id];
    if (!instance) {
      return;
    }

    const normalizedPage = coercePositiveInteger(page, instance.currentPage);
    const maxPage = this.getLastPageFromInstance(instance);
    if (normalizedPage < 1 || normalizedPage > maxPage) {
      return;
    }

    if (instance.currentPage !== normalizedPage) {
      instance.currentPage = normalizedPage;
      this.change.emit(id);
    }
  }

  setTotalItems(id: string, totalItems: number): void {
    const instance = this.instances[id];
    if (!instance) {
      return;
    }

    const normalizedTotalItems = coerceNonNegativeInteger(
      totalItems,
      instance.totalItems,
    );
    if (normalizedTotalItems !== instance.totalItems) {
      instance.totalItems = normalizedTotalItems;
      this.change.emit(id);
    }
  }

  setItemsPerPage(id: string, itemsPerPage: number): void {
    const instance = this.instances[id];
    if (!instance) {
      return;
    }

    const normalizedItemsPerPage = coercePositiveInteger(
      itemsPerPage,
      instance.itemsPerPage,
    );
    if (normalizedItemsPerPage !== instance.itemsPerPage) {
      instance.itemsPerPage = normalizedItemsPerPage;
      this.change.emit(id);
    }
  }

  /**
   * Returns a shallow clone of an instance.
   */
  getInstance(id = this.DEFAULT_ID): PaginationInstance {
    const instance = this.instances[id];
    if (!instance) {
      return {} as PaginationInstance;
    }

    return this.clone(instance);
  }

  private updateInstance(
    current: RegisteredInstance,
    next: RegisteredInstance,
  ): boolean {
    let changed = false;
    changed = this.assignIfChanged(current, next, 'id') || changed;
    changed = this.assignIfChanged(current, next, 'itemsPerPage') || changed;
    changed = this.assignIfChanged(current, next, 'currentPage') || changed;
    changed = this.assignIfChanged(current, next, 'totalItems') || changed;
    changed = this.assignIfChanged(current, next, 'totalPages') || changed;
    changed = this.assignIfChanged(current, next, 'hasNextPage') || changed;

    return changed;
  }

  private assignIfChanged<K extends keyof RegisteredInstance>(
    current: RegisteredInstance,
    next: RegisteredInstance,
    key: K,
  ): boolean {
    if (current[key] === next[key]) {
      return false;
    }

    current[key] = next[key];
    return true;
  }

  private normalizeInstance(instance: PaginationInstance): RegisteredInstance {
    const id = instance.id ?? this.DEFAULT_ID;
    const itemsPerPage = coercePositiveInteger(instance.itemsPerPage, 1);
    const currentPage = coercePositiveInteger(instance.currentPage, 1);
    const hasNextPage = coerceOptionalBoolean(instance.hasNextPage) ?? undefined;

    const totalPagesRaw = parseNumber(instance.totalPages);
    const totalPages =
      totalPagesRaw === null ? undefined : Math.max(1, Math.floor(totalPagesRaw));

    let totalItemsFallback = Math.max((currentPage - 1) * itemsPerPage, 0);
    if (hasNextPage === true) {
      totalItemsFallback = currentPage * itemsPerPage + 1;
    }
    if (totalPages !== undefined) {
      totalItemsFallback = Math.max(
        totalItemsFallback,
        totalPages * itemsPerPage,
      );
    }

    const totalItems = coerceNonNegativeInteger(
      instance.totalItems,
      totalItemsFallback,
    );

    return {
      id,
      itemsPerPage,
      currentPage,
      totalItems,
      totalPages,
      hasNextPage,
    };
  }

  private getLastPageFromInstance(instance: RegisteredInstance): number {
    if (instance.totalPages !== undefined) {
      return Math.max(1, instance.totalPages);
    }

    const itemsPerPage = Math.max(1, instance.itemsPerPage);
    const pagesFromTotalItems =
      instance.totalItems > 0
        ? Math.max(1, Math.ceil(instance.totalItems / itemsPerPage))
        : 1;

    if (instance.hasNextPage === true) {
      return Math.max(pagesFromTotalItems, instance.currentPage + 1);
    }

    return pagesFromTotalItems;
  }

  private clone<T extends object>(obj: T): T {
    return { ...obj };
  }
}
