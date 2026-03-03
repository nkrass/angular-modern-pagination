import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PaginationInstance } from './pagination-instance';
import { PaginationControlsDirective } from './pagination-controls.directive';
import { PaginationService } from './pagination.service';
import {
  coerceOptionalBoolean,
  coercePositiveInteger,
  parseNumber,
} from './pagination-utils';

const DEFAULT_STYLES = `
.ngx-pagination {
  margin-left: 0;
  margin-bottom: 1rem;
}

.ngx-pagination::before,
.ngx-pagination::after {
  content: ' ';
  display: table;
}

.ngx-pagination::after {
  clear: both;
}

.ngx-pagination li {
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  margin-right: 0.0625rem;
  border-radius: 0;
  display: inline-block;
}

.ngx-pagination a,
.ngx-pagination button {
  color: inherit;
  display: block;
  padding: 0.1875rem 0.625rem;
  border-radius: 0;
  cursor: pointer;
}

.ngx-pagination a:hover,
.ngx-pagination button:hover {
  background: #e6e6e6;
}

.ngx-pagination .current {
  padding: 0.1875rem 0.625rem;
  background: #2199e8;
  color: #fefefe;
  cursor: default;
}

.ngx-pagination .disabled {
  padding: 0.1875rem 0.625rem;
  color: #cacaca;
  cursor: default;
}

.ngx-pagination .disabled:hover {
  background: transparent;
}

.ngx-pagination .pagination-previous a::before,
.ngx-pagination .pagination-previous.disabled::before {
  content: '«';
  display: inline-block;
  margin-right: 0.5rem;
}

.ngx-pagination .pagination-next a::after,
.ngx-pagination .pagination-next.disabled::after {
  content: '»';
  display: inline-block;
  margin-left: 0.5rem;
}

.ngx-pagination .show-for-sr {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.ngx-pagination .small-screen {
  display: none;
}

@media screen and (max-width: 601px) {
  .ngx-pagination.responsive .small-screen {
    display: inline-block;
  }

  .ngx-pagination.responsive li:not(.small-screen):not(.pagination-previous):not(.pagination-next) {
    display: none;
  }
}
`;

@Component({
  selector: 'pagination-controls',
  standalone: true,
  imports: [PaginationControlsDirective, DecimalPipe],
  template: `
    <pagination-template
      #p="paginationApi"
      [id]="resolvedId()"
      [maxSize]="resolvedMaxSize()"
      (pageChange)="pageChange.emit($event)"
      (pageBoundsCorrection)="pageBoundsCorrection.emit($event)"
    >
      <nav role="navigation" [attr.aria-label]="screenReaderPaginationLabel()">
        @if (!(autoHide() && p.pages.length <= 1)) {
          <ul [class]="resolvedClassName()" [class.responsive]="responsive()">
            @if (directionLinks()) {
              <li class="pagination-previous" [class.disabled]="p.isFirstPage()">
                @if (1 < p.getCurrent()) {
                  <a tabindex="0" (keyup.enter)="p.previous()" (click)="p.previous()">
                    {{ previousLabel() }} <span class="show-for-sr">{{ screenReaderPageLabel() }}</span>
                  </a>
                } @else {
                  <span aria-disabled="true">
                    {{ previousLabel() }} <span class="show-for-sr">{{ screenReaderPageLabel() }}</span>
                  </span>
                }
              </li>
            }

            <li class="small-screen">
              {{ p.getCurrent() }} / {{ p.getLastPage() }}
            </li>

            @for (page of p.pages; track $index) {
              <li [class.current]="p.getCurrent() === page.value" [class.ellipsis]="page.label === '...'">
                @if (p.getCurrent() !== page.value) {
                  <a tabindex="0" (keyup.enter)="p.setCurrent(page.value)" (click)="p.setCurrent(page.value)">
                    <span class="show-for-sr">{{ screenReaderPageLabel() }} </span>
                    <span>{{ page.label === '...' ? page.label : (page.label | number: '') }}</span>
                  </a>
                } @else {
                  <span aria-live="polite">
                    <span class="show-for-sr">{{ screenReaderCurrentLabel() }} </span>
                    <span>{{ page.label === '...' ? page.label : (page.label | number: '') }}</span>
                  </span>
                }
              </li>
            }

            @if (directionLinks()) {
              <li class="pagination-next" [class.disabled]="p.isLastPage()">
                @if (!p.isLastPage()) {
                  <a tabindex="0" (keyup.enter)="p.next()" (click)="p.next()">
                    {{ nextLabel() }} <span class="show-for-sr">{{ screenReaderPageLabel() }}</span>
                  </a>
                } @else {
                  <span aria-disabled="true">
                    {{ nextLabel() }} <span class="show-for-sr">{{ screenReaderPageLabel() }}</span>
                  </span>
                }
              </li>
            }
          </ul>
        }
      </nav>
    </pagination-template>
  `,
  styles: [DEFAULT_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PaginationControlsComponent {
  private readonly service = inject(PaginationService);

  readonly id = input<string | undefined>(undefined);
  readonly maxSize = input(7, { transform: numberAttribute });
  readonly directionLinks = input(true, { transform: booleanAttribute });
  readonly autoHide = input(false, { transform: booleanAttribute });
  readonly responsive = input(false, { transform: booleanAttribute });

  readonly previousLabel = input('Previous');
  readonly nextLabel = input('Next');
  readonly className = input<string | undefined>(undefined);
  readonly screenReaderPaginationLabel = input('Pagination');
  readonly screenReaderPageLabel = input('page');
  readonly screenReaderCurrentLabel = input(`You're on page`);

  // Optional controls-only server-side mode (without using the paginate pipe).
  readonly currentPage = input<number | string | null>(null);
  readonly itemsPerPage = input<number | string | null>(null);
  readonly totalItems = input<number | string | null>(null);
  readonly totalPages = input<number | string | null>(null);
  readonly hasNextPage = input<boolean | string | null>(null);

  readonly pageChange = output<number>();
  readonly pageBoundsCorrection = output<number>();

  readonly resolvedId = computed(() => this.id() ?? this.service.defaultId());
  readonly resolvedMaxSize = computed(() =>
    coercePositiveInteger(this.maxSize(), 7),
  );
  readonly resolvedClassName = computed(() => {
    const className = this.className();
    if (!className) {
      return 'ngx-pagination';
    }
    return `ngx-pagination ${className}`;
  });

  constructor() {
    effect(() => {
      const currentPage = parseNumber(this.currentPage());
      const itemsPerPage = parseNumber(this.itemsPerPage());

      if (currentPage === null || itemsPerPage === null) {
        return;
      }

      const instance: PaginationInstance = {
        id: this.resolvedId(),
        currentPage: Math.max(1, Math.floor(currentPage)),
        itemsPerPage: Math.max(1, Math.floor(itemsPerPage)),
      };

      const totalItems = parseNumber(this.totalItems());
      if (totalItems !== null) {
        instance.totalItems = Math.max(0, Math.floor(totalItems));
      }

      const totalPages = parseNumber(this.totalPages());
      if (totalPages !== null) {
        instance.totalPages = Math.max(1, Math.floor(totalPages));
      }

      const hasNextPage = coerceOptionalBoolean(this.hasNextPage());
      if (hasNextPage !== null) {
        instance.hasNextPage = hasNextPage;
      }

      const changed = this.service.register(instance);
      if (changed) {
        this.service.change.emit(instance.id ?? this.service.defaultId());
      }
    });
  }
}
