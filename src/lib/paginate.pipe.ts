import { Pipe, PipeTransform, inject } from '@angular/core';
import { PaginationInstance } from './pagination-instance';
import { PaginationService } from './pagination.service';
import {
  coerceNonNegativeInteger,
  coerceOptionalBoolean,
  coercePositiveInteger,
  parseNumber,
} from './pagination-utils';

export type Collection<T> = T[] | ReadonlyArray<T>;

export interface PaginatePipeArgs {
  id?: string;
  itemsPerPage?: string | number;
  currentPage?: string | number;
  totalItems?: string | number;
  totalPages?: string | number;
  hasNextPage?: boolean | string;
}

export interface PipeState {
  collection: ArrayLike<unknown>;
  size: number;
  start?: number;
  end?: number;
  slice: ArrayLike<unknown>;
}

const LARGE_NUMBER = Number.MAX_SAFE_INTEGER;

@Pipe({
  name: 'paginate',
  pure: false,
  standalone: true,
})
export class PaginatePipe implements PipeTransform {
  private readonly service = inject(PaginationService);
  private readonly state: Record<string, PipeState> = {};

  transform<T, U extends Collection<T>>(collection: U, args: PaginatePipeArgs): U {
    const id = args.id ?? this.service.defaultId();

    // AsyncPipe emits null/undefined before first value; keep last known slice to avoid flicker.
    if (!Array.isArray(collection)) {
      return (this.state[id]?.slice as U | undefined) ?? collection;
    }

    const instance = this.createInstance(collection, args);
    const paginationId = instance.id ?? this.service.defaultId();
    const serverSideMode = this.isServerSideMode(args, collection.length);
    const emitChange = this.service.register(instance);

    if (!serverSideMode) {
      const itemsPerPage = coercePositiveInteger(instance.itemsPerPage, LARGE_NUMBER);
      const start = (instance.currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;

      if (this.stateIsIdentical(paginationId, collection, start, end)) {
        return this.state[paginationId].slice as U;
      }

      const slice = collection.slice(start, end) as U;
      this.saveState(paginationId, collection, slice, start, end);
      this.service.change.emit(paginationId);
      return slice;
    }

    if (emitChange) {
      this.service.change.emit(paginationId);
    }

    this.saveState(paginationId, collection, collection);
    return collection;
  }

  private createInstance<T>(
    collection: Collection<T>,
    config: PaginatePipeArgs,
  ): PaginationInstance {
    this.checkConfig(config);

    const id = config.id ?? this.service.defaultId();
    const itemsPerPage = coercePositiveInteger(config.itemsPerPage, 1);
    const currentPage = coercePositiveInteger(config.currentPage, 1);
    const hasNextPage = coerceOptionalBoolean(config.hasNextPage) ?? undefined;

    const totalPagesRaw = parseNumber(config.totalPages);
    const totalPages =
      totalPagesRaw === null ? undefined : Math.max(1, Math.floor(totalPagesRaw));

    const totalItemsRaw = parseNumber(config.totalItems);
    const totalItems =
      totalItemsRaw === null
        ? this.resolveTotalItems(
            currentPage,
            itemsPerPage,
            collection.length,
            totalPages,
            hasNextPage,
          )
        : Math.max(0, Math.floor(totalItemsRaw));

    return {
      id,
      itemsPerPage,
      currentPage,
      totalItems,
      totalPages,
      hasNextPage,
    };
  }

  private checkConfig(config: PaginatePipeArgs): void {
    const required: Array<keyof PaginatePipeArgs> = ['itemsPerPage', 'currentPage'];
    const missing = required.filter((prop) => !(prop in config));
    if (missing.length > 0) {
      throw new Error(
        `PaginatePipe: Argument is missing the following required properties: ${missing.join(', ')}`,
      );
    }
  }

  private resolveTotalItems(
    currentPage: number,
    itemsPerPage: number,
    collectionLength: number,
    totalPages: number | undefined,
    hasNextPage: boolean | undefined,
  ): number {
    if (totalPages !== undefined) {
      return Math.max(
        totalPages * itemsPerPage,
        (currentPage - 1) * itemsPerPage + collectionLength,
      );
    }

    if (hasNextPage === true) {
      return currentPage * itemsPerPage + 1;
    }

    if (hasNextPage === false) {
      return coerceNonNegativeInteger(
        (currentPage - 1) * itemsPerPage + collectionLength,
        0,
      );
    }

    return collectionLength;
  }

  private isServerSideMode(args: PaginatePipeArgs, collectionLength: number): boolean {
    const hasNextPage = coerceOptionalBoolean(args.hasNextPage);
    const totalPages = parseNumber(args.totalPages);
    if (hasNextPage !== null || totalPages !== null) {
      return true;
    }

    const totalItems = parseNumber(args.totalItems);
    if (totalItems !== null) {
      return totalItems !== collectionLength;
    }

    return false;
  }

  private saveState(
    id: string,
    collection: ArrayLike<unknown>,
    slice: ArrayLike<unknown>,
    start?: number,
    end?: number,
  ): void {
    this.state[id] = {
      collection,
      size: collection.length,
      slice,
      start,
      end,
    };
  }

  private stateIsIdentical(
    id: string,
    collection: ReadonlyArray<unknown>,
    start: number,
    end: number,
  ): boolean {
    const previous = this.state[id];
    if (!previous) {
      return false;
    }

    if (
      previous.size !== collection.length ||
      previous.start !== start ||
      previous.end !== end
    ) {
      return false;
    }

    if (!Array.isArray(previous.slice)) {
      return false;
    }

    return previous.slice.every(
      (element, index) => element === collection[start + index],
    );
  }
}
