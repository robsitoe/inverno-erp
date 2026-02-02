export declare enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER"
}
export declare class User {
    id: string;
    username: string;
    password: string;
    name?: string;
    email?: string;
    phone?: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isTechnical: boolean;
    isActive: boolean;
    profile?: string;
    language: string;
    permissions?: any[];
    createdAt: Date;
    updatedAt: Date;
}
