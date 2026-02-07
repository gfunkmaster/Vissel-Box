export type Tenant = {
    id: string
    name: string
    slug: string
    contact_email: string
    created_at: string
    public_key: string | null
    owner_id: string
    status: 'setup' | 'active'
}

export type Report = {
    id: string
    tenant_id: string
    encrypted_content: string
    encrypted_attachments: string | null
    status: 'new' | 'read' | 'archived' | 'closed'
    created_at: string
    closed_at: string | null
}

export type ReportStatus = Report['status']
