import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { PaginatePipe } from './paginate.pipe';
import { PaginationService } from './pagination.service';
import { describe, expect, it } from 'vitest';

function createPipe(service = new PaginationService()): PaginatePipe {
  const injector = createEnvironmentInjector([
    { provide: PaginationService, useValue: service },
  ]);

  return runInInjectionContext(injector, () => new PaginatePipe());
}

describe('PaginatePipe', () => {
  it('slices in-memory arrays', () => {
    const pipe = createPipe();
    const result = pipe.transform([1, 2, 3, 4, 5], {
      itemsPerPage: 2,
      currentPage: 2,
    });

    expect(result).toEqual([3, 4]);
  });

  it('keeps server-side totalItems when provided', () => {
    const service = new PaginationService();
    const pipe = createPipe(service);

    const result = pipe.transform([1, 2], {
      itemsPerPage: 2,
      currentPage: 1,
      totalItems: 12,
    });

    expect(result).toEqual([1, 2]);
    expect(service.getInstance(service.defaultId()).totalItems).toBe(12);
  });

  it('synthesizes totalItems when hasNextPage is true', () => {
    const service = new PaginationService();
    const pipe = createPipe(service);

    pipe.transform([1, 2], {
      itemsPerPage: 2,
      currentPage: 1,
      hasNextPage: true,
    });

    expect(service.getInstance(service.defaultId()).totalItems).toBe(3);
  });
});

describe('PaginationService', () => {
  it('isolates multiple ids', () => {
    const service = new PaginationService();

    service.register({
      id: 'a',
      itemsPerPage: 10,
      currentPage: 1,
      totalItems: 100,
    });
    service.register({
      id: 'b',
      itemsPerPage: 10,
      currentPage: 5,
      totalItems: 100,
    });

    expect(service.getCurrentPage('a')).toBe(1);
    expect(service.getCurrentPage('b')).toBe(5);
  });

  it('emits changes when current page changes in bounds', () => {
    const service = new PaginationService();
    const events: string[] = [];
    service.change.subscribe((id) => events.push(id));

    service.register({
      id: 'bound',
      itemsPerPage: 2,
      currentPage: 1,
      totalItems: 4,
    });
    service.setCurrentPage('bound', 2);
    service.setCurrentPage('bound', 99);

    expect(events).toEqual(['bound']);
    expect(service.getCurrentPage('bound')).toBe(2);
  });
});
