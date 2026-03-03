# @nkrass/angular-modern-pagination

Standalone Angular pagination utilities for Angular 21.

The package supports:
- client-side slicing with `paginate` pipe
- server-side pagination with `totalItems`, `totalPages`, or `hasNextPage`
- configurable controls through `pagination-controls` and `pagination-template`
- signals-based internals and standalone Angular APIs

## Installation

```bash
npm install @nkrass/angular-modern-pagination
```

## Peer Dependencies

- `@angular/core` `^21.2.0`
- `@angular/common` `^21.2.0`

## Exports

- `PaginatePipe` (`paginate`)
- `PaginationControlsComponent` (`pagination-controls`)
- `PaginationControlsDirective` (`pagination-template`, exportAs `paginationApi`)
- `PaginationService`
- `PaginationInstance`

## Standalone Usage

Add the standalone exports to a component `imports` list:

```ts
import { Component } from '@angular/core';
import {
  PaginatePipe,
  PaginationControlsComponent,
} from '@nkrass/angular-modern-pagination';

@Component({
  standalone: true,
  imports: [PaginatePipe, PaginationControlsComponent],
  templateUrl: './example.component.html',
})
export class ExampleComponent {
  page = 1;
  itemsPerPage = 10;
  items = Array.from({ length: 250 }, (_, i) => `Item ${i + 1}`);
}
```

Template:

```html
<li *ngFor="let item of items | paginate: {
  itemsPerPage: itemsPerPage,
  currentPage: page
}">
  {{ item }}
</li>

<pagination-controls
  (pageChange)="page = $event"
  [previousLabel]="'pagination.previous' | transloco"
  [nextLabel]="'pagination.next' | transloco">
</pagination-controls>
```

## Server-Side Pagination

When you fetch only one page from the backend, pass page metadata:

```html
<li *ngFor="let row of rows | paginate: {
  itemsPerPage: pageSize,
  currentPage: page,
  totalItems: totalItems,
  totalPages: totalPages,
  hasNextPage: hasNextPage
}">
  {{ row.name }}
</li>

<pagination-controls
  (pageChange)="page = $event">
</pagination-controls>
```

Resolution behavior:
- `totalItems` present: used directly
- else `totalPages` present: inferred as `totalPages * itemsPerPage`
- else `hasNextPage === true`: synthetic next page is exposed
- else final page is inferred from current collection length

## Custom Template API

Use `pagination-template` for full control:

```html
<pagination-template #p="paginationApi" (pageChange)="page = $event">
  <button (click)="p.previous()" [disabled]="p.isFirstPage()">Prev</button>
  <span>{{ p.getCurrent() }} / {{ p.getLastPage() }}</span>
  <button (click)="p.next()" [disabled]="p.isLastPage()">Next</button>
</pagination-template>
```

## Inputs and Outputs

`PaginatePipe` args:
- `id?: string`
- `itemsPerPage: number | string`
- `currentPage: number | string`
- `totalItems?: number | string`
- `totalPages?: number | string`
- `hasNextPage?: boolean | string`

`pagination-controls` inputs:
- `id?: string`
- `maxSize?: number`
- `directionLinks?: boolean`
- `autoHide?: boolean`
- `responsive?: boolean`
- `previousLabel?: string`
- `nextLabel?: string`
- `screenReaderPaginationLabel?: string`
- `screenReaderPageLabel?: string`
- `screenReaderCurrentLabel?: string`
- `currentPage?: number | string`
- `itemsPerPage?: number | string`
- `totalItems?: number | string`
- `totalPages?: number | string`
- `hasNextPage?: boolean | string`

`pagination-controls` outputs:
- `pageChange: number`
- `pageBoundsCorrection: number`

## Development

```bash
npm install
npm run build
npm test
```
