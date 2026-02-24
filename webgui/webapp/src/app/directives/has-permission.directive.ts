import { Directive, Input, TemplateRef, ViewContainerRef, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Directive({
    selector: '[hasPermission]',
    standalone: true
})
export class HasPermissionDirective implements OnDestroy {
    private subscription: Subscription;
    private permissions: string | string[] = [];
    private hasView = false;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private auth: AuthService
    ) {
        this.subscription = this.auth.permissions.subscribe(() => {
            this.updateView();
        });
    }

    @Input()
    set hasPermission(val: string | string[]) {
        this.permissions = val;
        this.updateView();
    }

    private updateView() {
        const isAuthorized = this.auth.hasPermission(this.permissions);

        if (isAuthorized && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!isAuthorized && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
