import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { getCurrentTenant } from '@/app/actions/tenant'
import { Shield, LayoutDashboard, FileText, Settings, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { userId } = await auth()

    if (!userId) {
        redirect('/sign-in')
    }

    const tenant = await getCurrentTenant()

    // If user has no tenant, redirect to onboarding
    if (!tenant) {
        redirect('/dashboard/onboarding')
    }

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-4 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <Shield className="h-8 w-8 text-emerald-500" />
                            <span className="text-xl font-bold text-white">Vissel-Box</span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        <Link href="/dashboard">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                                <LayoutDashboard className="mr-2 h-5 w-5" />
                                Översikt
                            </Button>
                        </Link>
                        <Link href="/dashboard/reports">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                                <FileText className="mr-2 h-5 w-5" />
                                Rapporter
                            </Button>
                        </Link>
                        <Link href="/dashboard/settings">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                                <Settings className="mr-2 h-5 w-5" />
                                Inställningar
                            </Button>
                        </Link>
                    </nav>

                    {/* Tenant info */}
                    <div className="p-4 border-t border-slate-800">
                        <div className="mb-4">
                            <p className="text-sm text-slate-500">Din rapportlänk</p>
                            <Link
                                href={`/${tenant.slug}`}
                                target="_blank"
                                className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            >
                                /{tenant.slug}
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <UserButton afterSignOutUrl="/" />
                            <div className="text-sm">
                                <p className="text-white font-medium truncate">{tenant.name}</p>
                                <p className="text-slate-500 text-xs truncate">{tenant.contact_email}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-64 min-h-screen">
                {children}
            </main>
        </div>
    )
}
