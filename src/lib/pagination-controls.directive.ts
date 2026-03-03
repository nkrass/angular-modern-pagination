import {
  ChangeDetectorRef,
  Directive,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  inject,
  numberAttribute,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginationInstance } from './pagination-instance';
import { PaginationService } from './pagination.service';
import { coercePositiveInteger } from './pagination-utils';

export interface Page {
  label: string | number;
  value: number;
}

interface ResolvedPaginationInstance {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages?: number;
}

@Directive({
  selector: 'pagination-template,[pagination-template]',
  exportAs: 'paginationApi',
  standalone: true,
})
export class PaginationControlsDirective implements OnInit, OnChanges {
  private readonly service = inject(PaginationService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Input() id?: string;
  @Input({ transform: numberAttribute }) maxSize = 7;

  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly pageBoundsCorrection = new EventEmitter<number>();

  private readonly pagesState = signal<Page[]>([]);

  get pages(): Page[] {
    return this.pagesState();
  }

  constructor() {
    this.service.change
      .pipe(takeUntilDestroyed())
      .subscribe((changedId) => {
        if (this.resolveId() !== changedId) {
          return;
        }

        this.updatePageLinks();
        this.changeDetectorRef.markForCheck();
      });
  }

  ngOnInit(): void {
    if (this.id === undefined) {
      this.id = this.service.defaultId();
    }
    this.updatePageLinks();
  }

  ngOnChanges(): void {
    this.updatePageLinks();
  }

  previous(): void {
    this.checkValidId();
    this.setCurrent(this.getCurrent() - 1);
  }

  next(): void {
    this.checkValidId();
    this.setCurrent(this.getCurrent() + 1);
  }

  isFirstPage(): boolean {
    return this.getCurrent() === 1;
  }

  isLastPage(): boolean {
    return this.getCurrent() >= this.getLastPage();
  }

  setCurrent(page: number): void {
    this.pageChange.emit(page);
  }

  getCurrent(): number {
    return this.service.getCurrentPage(this.resolveId());
  }

  getLastPage(): number {
    const instance = this.resolveInstance(this.service.getInstance(this.resolveId()));
    const pagesFromItems = Math.max(
      Math.ceil(instance.totalItems / instance.itemsPerPage),
      1,
    );

    if (instance.totalPages !== undefined) {
      return Math.max(instance.totalPages, pagesFromItems);
    }

    return pagesFromItems;
  }

  getTotalItems(): number {
    const instance = this.resolveInstance(this.service.getInstance(this.resolveId()));
    return instance.totalItems;
  }

  private resolveId(): string {
    return this.id ?? this.service.defaultId();
  }

  private checkValidId(): void {
    const instance = this.service.getInstance(this.resolveId());
    if (instance.id == null) {
      console.warn(
        `PaginationControlsDirective: the specified id "${this.resolveId()}" does not match any registered PaginationInstance`,
      );
    }
  }

  private updatePageLinks(): void {
    const instance = this.resolveInstance(this.service.getInstance(this.resolveId()));
    const correctedCurrentPage = this.outOfBoundCorrection(instance);

    if (correctedCurrentPage !== instance.currentPage) {
      setTimeout(() => {
        this.pageBoundsCorrection.emit(correctedCurrentPage);
      });
    }

    this.pagesState.set(
      this.createPageArray(
        correctedCurrentPage,
        instance.itemsPerPage,
        instance.totalItems,
        this.maxSize,
        instance.totalPages,
      ),
    );
  }

  private resolveInstance(raw: PaginationInstance): ResolvedPaginationInstance {
    const currentPage = coercePositiveInteger(raw.currentPage, 1);
    const itemsPerPage = coercePositiveInteger(raw.itemsPerPage, 1);
    const totalPages =
      raw.totalPages === undefined
        ? undefined
        : coercePositiveInteger(raw.totalPages, 1);

    let totalItems = raw.totalItems;
    if (totalItems === undefined) {
      if (totalPages !== undefined) {
        totalItems = totalPages * itemsPerPage;
      } else if (raw.hasNextPage === true) {
        totalItems = currentPage * itemsPerPage + 1;
      } else {
        totalItems = Math.max((currentPage - 1) * itemsPerPage, 0);
      }
    }

    return {
      currentPage,
      itemsPerPage,
      totalItems: Math.max(0, Math.floor(totalItems)),
      totalPages,
    };
  }

  private outOfBoundCorrection(instance: ResolvedPaginationInstance): number {
    const totalPages = this.resolveTotalPages(instance);

    if (totalPages < instance.currentPage && totalPages > 0) {
      return totalPages;
    }

    if (instance.currentPage < 1) {
      return 1;
    }

    return instance.currentPage;
  }

  private createPageArray(
    currentPage: number,
    itemsPerPage: number,
    totalItems: number,
    maxSize: number,
    totalPagesOverride?: number,
  ): Page[] {
    const paginationRange = coercePositiveInteger(maxSize, 7);
    const totalPages = totalPagesOverride
      ? Math.max(1, Math.floor(totalPagesOverride))
      : Math.max(Math.ceil(totalItems / itemsPerPage), 1);

    const pages: Page[] = [];
    const halfWay = Math.ceil(paginationRange / 2);
    const isStart = currentPage <= halfWay;
    const isEnd = totalPages - halfWay < currentPage;
    const isMiddle = !isStart && !isEnd;
    const ellipsesNeeded = paginationRange < totalPages;

    for (let i = 1; i <= totalPages && i <= paginationRange; i += 1) {
      const pageNumber = this.calculatePageNumber(
        i,
        currentPage,
        paginationRange,
        totalPages,
      );

      const openingEllipsesNeeded = i === 2 && (isMiddle || isEnd);
      const closingEllipsesNeeded =
        i === paginationRange - 1 && (isMiddle || isStart);

      const label =
        ellipsesNeeded && (openingEllipsesNeeded || closingEllipsesNeeded)
          ? '...'
          : pageNumber;

      pages.push({
        label,
        value: pageNumber,
      });
    }

    return pages;
  }

  private calculatePageNumber(
    index: number,
    currentPage: number,
    paginationRange: number,
    totalPages: number,
  ): number {
    const halfWay = Math.ceil(paginationRange / 2);

    if (index === paginationRange) {
      return totalPages;
    }
    if (index === 1) {
      return 1;
    }

    if (paginationRange < totalPages) {
      if (totalPages - halfWay < currentPage) {
        return totalPages - paginationRange + index;
      }
      if (halfWay < currentPage) {
        return currentPage - halfWay + index;
      }
    }

    return index;
  }

  private resolveTotalPages(instance: ResolvedPaginationInstance): number {
    if (instance.totalPages !== undefined) {
      return instance.totalPages;
    }

    return Math.max(Math.ceil(instance.totalItems / instance.itemsPerPage), 1);
  }
}
