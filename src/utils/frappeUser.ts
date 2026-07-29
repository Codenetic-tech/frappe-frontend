/**
 * Fetches the full User document (roles, role_profiles, api_key/secret
 * included) via the gopocket.api.user backend method, in place of the
 * generic GET /api/resource/User/<name> call — the backend restricts this
 * to the user themselves or a System Manager.
 */
export async function fetchUserProfile(frappeCtx: any, email: string): Promise<any | null> {
    try {
        const res = await frappeCtx?.call?.post('gopocket.api.user', { user: email });
        return res?.message ?? null;
    } catch (err) {
        console.warn('Could not fetch user profile via gopocket.api.user:', err);
        return null;
    }
}

/** Checks the `roles` child table (from fetchUserProfile) for a given role name. */
export function userHasRole(frappeUser: any, role: string): boolean {
    if (!frappeUser?.roles) return false;
    return frappeUser.roles.some((r: any) => r.role === role);
}
