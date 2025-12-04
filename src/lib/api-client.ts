// Generic API Client for PostgreSQL database

type QueryFilter = {
    column: string;
    operator: string;
    value: any;
};

class QueryBuilder {
    private table: string;
    private action: 'select' | 'insert' | 'update' | 'delete';
    private columns: string = '*';
    private filters: QueryFilter[] = [];
    private _order: { column: string; ascending: boolean }[] = [];
    private _limit?: number;
    private _single: boolean = false;
    private _count?: 'exact' | 'planned' | 'estimated';
    private _values: any = null;

    constructor(table: string) {
        this.table = table;
        this.action = 'select'; // Default
    }

    select(columns: string = '*', options?: { head?: boolean; count?: 'exact' | 'planned' | 'estimated' }) {
        this.action = 'select';
        this.columns = columns;
        if (options?.count) {
            this._count = options.count;
        }
        return this;
    }

    insert(values: any) {
        this.action = 'insert';
        this._values = values;
        return this;
    }

    update(values: any) {
        this.action = 'update';
        this._values = values;
        return this;
    }

    delete() {
        this.action = 'delete';
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, operator: 'eq', value });
        return this;
    }

    neq(column: string, value: any) {
        this.filters.push({ column, operator: 'neq', value });
        return this;
    }

    gt(column: string, value: any) {
        this.filters.push({ column, operator: 'gt', value });
        return this;
    }

    lt(column: string, value: any) {
        this.filters.push({ column, operator: 'lt', value });
        return this;
    }

    gte(column: string, value: any) {
        this.filters.push({ column, operator: 'gte', value });
        return this;
    }

    lte(column: string, value: any) {
        this.filters.push({ column, operator: 'lte', value });
        return this;
    }

    in(column: string, value: any[]) {
        this.filters.push({ column, operator: 'in', value });
        return this;
    }

    is(column: string, value: any) {
        this.filters.push({ column, operator: 'is', value });
        return this;
    }

    like(column: string, value: string) {
        this.filters.push({ column, operator: 'like', value });
        return this;
    }

    ilike(column: string, value: string) {
        this.filters.push({ column, operator: 'ilike', value });
        return this;
    }

    order(column: string, { ascending = true, nullsFirst = false, foreignTable }: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string } = {}) {
        this._order.push({ column, ascending });
        return this;
    }

    limit(count: number) {
        this._limit = count;
        return this;
    }

    single() {
        this._single = true;
        return this;
    }

    maybeSingle() {
        this._single = true;
        return this;
    }

    // Execute the query
    async then(resolve: (value: any) => void, reject: (reason?: any) => void) {
        try {
            const payload: any = {
                action: this.action,
                table: this.table,
                filters: this.filters.length > 0 ? this.filters : undefined,
                order: this._order.length > 0 ? this._order : undefined,
                limit: this._limit,
                single: this._single,
                count: this._count,
            };

            if (this.action === 'select') {
                payload.columns = this.columns;
            } else if (this.action === 'insert' || this.action === 'update') {
                payload.values = this._values;
            }

            const response = await fetch('/api/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                cache: 'no-store', // Disable caching to fix memoization issues
            });

            const result = await response.json();

            if (!response.ok) {
                resolve({ data: null, error: result.error || { message: 'Unknown error' } });
            } else {
                resolve({ data: result.data, count: result.count, error: null });
            }
        } catch (error: any) {
            console.error('API Client Error:', error);
            resolve({ data: null, error: { message: error.message } });
        }
    }
}

// Define the API client interface to avoid circular references
interface ApiClient {
    from: (table: string) => QueryBuilder;
    rpc: (functionName: string, args?: any) => Promise<{ data: any; error: any }>;
    auth: {
        getUser: () => Promise<{ data: { user: any }; error: any }>;
        getSession: () => Promise<{ data: { session: any }; error: any }>;
        signOut: () => Promise<{ error: any }>;
        onAuthStateChange: () => { data: { subscription: { unsubscribe: () => void } } };
    };
    storage: {
        from: (bucket: string) => {
            upload: (path: string, file: File) => Promise<{ data: { path: string } | null; error: any }>;
            getPublicUrl: (path: string) => { data: { publicUrl: string } };
        };
    };
    channel: () => {
        on: () => { subscribe: () => void };
        subscribe: () => void;
    };
    removeChannel: () => void;
}

// Create a singleton API client instance to prevent multiple instances
let apiClientInstance: ApiClient | null = null;

export const createApiClient = (): ApiClient => {
    // Return existing instance if available
    if (apiClientInstance) {
        return apiClientInstance;
    }

    // Create a stable API client instance
    const client = {
        from: (table: string) => new QueryBuilder(table),

        rpc: async (functionName: string, args: any = {}) => {
            try {
                const response = await fetch('/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'rpc',
                        functionName,
                        args
                    }),
                    cache: 'no-store',
                });
                const result = await response.json();
                return { data: result.data, error: result.error };
            } catch (err: any) {
                return { data: null, error: { message: err.message } };
            }
        },

        auth: {
            getUser: async () => {
                try {
                    const response = await fetch('/api/auth/session', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        cache: 'no-store',
                    });

                    if (!response.ok) {
                        return { data: { user: null }, error: { message: 'Failed to fetch user' } };
                    }

                    const result = await response.json();
                    return { data: { user: result.data?.user || null }, error: null };
                } catch (err: any) {
                    return { data: { user: null }, error: { message: err.message } };
                }
            },
            getSession: async () => {
                try {
                    const response = await fetch('/api/auth/session', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        cache: 'no-store',
                    });

                    if (!response.ok) {
                        return { data: { session: null }, error: { message: 'Failed to fetch session' } };
                    }

                    const result = await response.json();
                    const user = result.data?.user;

                    if (!user) {
                        return { data: { session: null }, error: null };
                    }

                    return {
                        data: {
                            session: {
                                access_token: 'valid-token',
                                user: user
                            }
                        },
                        error: null
                    };
                } catch (err: any) {
                    return { data: { session: null }, error: { message: err.message } };
                }
            },
            signOut: async () => {
                await fetch('/api/auth/signout', { method: 'POST', cache: 'no-store' });
                return { error: null };
            },
            onAuthStateChange: () => {
                return { data: { subscription: { unsubscribe: () => { } } } };
            }
        },

        storage: {
            from: (bucket: string) => ({
                upload: async (path: string, file: File) => {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('bucket', bucket);
                    formData.append('path', path);

                    try {
                        const response = await fetch('/api/uploads', {
                            method: 'POST',
                            body: formData,
                            cache: 'no-store',
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error);
                        return { data: { path: result.path }, error: null };
                    } catch (err: any) {
                        return { data: null, error: err };
                    }
                },
                getPublicUrl: (path: string) => {
                    return { data: { publicUrl: `/uploads/${bucket}/${path}` } };
                }
            })
        },

        channel: () => ({
            on: () => ({ subscribe: () => { } }),
            subscribe: () => { }
        }),
        removeChannel: () => { }
    };

    apiClientInstance = client;
    return client;
};
