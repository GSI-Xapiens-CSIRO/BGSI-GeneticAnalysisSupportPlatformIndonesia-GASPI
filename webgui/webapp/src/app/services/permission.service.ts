import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PermissionPayload {
    sub: string;
    permissions: string[];
    [key: string]: any;
}

@Injectable({
    providedIn: 'root'
})
export class PermissionService {
    private permissionsSubject = new BehaviorSubject<string[]>([]);
    public permissions$ = this.permissionsSubject.asObservable();

    constructor() {
        this.loadPermissions();
        // Watch for localStorage changes (e.g., from other tabs)
        window.addEventListener('storage', (event) => {
            if (event.key === 'x-permissions-token') {
                this.loadPermissions();
            }
        });
    }

    /**
     * Load and decode permissions from localStorage
     */
    public loadPermissions(): void {
        const token = localStorage.getItem('x-permissions-token');
        if (!token) {
            this.permissionsSubject.next([]);
            return;
        }

        try {
            // JWT is header.payload.signature
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );

            const decoded: PermissionPayload = JSON.parse(jsonPayload);
            this.permissionsSubject.next(decoded.permissions || []);
        } catch (error) {
            console.error('Error decoding permissions token:', error);
            this.permissionsSubject.next([]);
        }
    }

    /**
     * Check if user has a specific permission
     */
    public hasPermission(permission: string): boolean {
        return this.permissionsSubject.value.includes(permission);
    }

    /**
     * Observable to check if user has a specific permission
     */
    public hasPermission$(permission: string): Observable<boolean> {
        return this.permissions$.pipe(
            map(permissions => permissions.includes(permission))
        );
    }

    /**
     * Check if user has any of the provided permissions
     */
    public hasAnyPermission(permissions: string[]): boolean {
        return permissions.some(p => this.permissionsSubject.value.includes(p));
    }

    /**
     * Clear permissions (on logout)
     */
    public clearPermissions(): void {
        this.permissionsSubject.next([]);
    }
}
