export interface TypedEntry {
    type: string;
    value: string;
}

export interface Contact {
    id: string;
    fn: string; // Formatted Name
    tels: TypedEntry[];
    emails: TypedEntry[];
    photo?: string; // base64 data URI
    note?: string;
    org?: string;
    title?: string;
}
