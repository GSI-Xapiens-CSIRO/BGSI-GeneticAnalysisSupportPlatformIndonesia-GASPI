import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { PermissionService } from '../services/permission.service';
import { Subscription } from 'rxjs';

@Directive({
    selector: '[appHasPermission]',
    standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
    private permission: string = '';
    private subscription: Subscription | null = null;
    private isVisible = false;

    @Input()
    set appHasPermission(val: string) {
        this.permission = val;
        this.updateView();
    }

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private permissionService: PermissionService
    ) { }

    ngOnInit() {
        this.subscription = this.permissionService.permissions$.subscribe(() => {
            this.updateView();
        });
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    private updateView() {
        const hasPermission = this.permissionService.hasPermission(this.permission);
        if (hasPermission && !this.isVisible) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.isVisible = true;
        } else if (!hasPermission && this.isVisible) {
            this.viewContainer.clear();
            this.isVisible = false;
        }
    }
}

@Directive({
    selector: '[appDisableIfNoPermission]',
    standalone: true
})
export class DisableIfNoPermissionDirective implements OnInit, OnDestroy {
    private permission: string = '';
    private subscription: Subscription | null = null;

    @Input()
    set appDisableIfNoPermission(val: string) {
        this.permission = val;
        this.updateState();
    }

    constructor(
        private el: ElementRef,
        private renderer: Renderer2,
        private permissionService: PermissionService
    ) { }

    ngOnInit() {
        this.subscription = this.permissionService.permissions$.subscribe(() => {
            this.updateState();
        });
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    private updateState() {
        const hasPermission = this.permissionService.hasPermission(this.permission);
        if (hasPermission) {
            this.renderer.removeAttribute(this.el.nativeElement, 'disabled');
            this.renderer.removeClass(this.el.nativeElement, 'bui-disabled');
            this.renderer.setStyle(this.el.nativeElement, 'pointer-events', 'auto');
            this.renderer.setStyle(this.el.nativeElement, 'opacity', '1');
        } else {
            this.renderer.setAttribute(this.el.nativeElement, 'disabled', 'true');
            this.renderer.addClass(this.el.nativeElement, 'bui-disabled');
            this.renderer.setStyle(this.el.nativeElement, 'pointer-events', 'none');
            this.renderer.setStyle(this.el.nativeElement, 'opacity', '0.5');
        }
    }
}
