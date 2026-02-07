import Link from 'next/link'
import { getReportsForTenant } from '@/app/actions/report'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Clock, Eye, ChevronRight } from 'lucide-react'

function getStatusBadge(status: string) {
    switch (status) {
        case 'new':
            return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Ny</Badge>
        case 'read':
            return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Läst</Badge>
        case 'archived':
            return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Arkiverad</Badge>
        default:
            return null
    }
}

function formatDate(dateString: string) {
    return new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateString))
}

export default async function ReportsPage() {
    const reports = await getReportsForTenant()

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Rapporter</h1>
                <p className="text-slate-400 mt-1">Hantera inkomna visselblåsarrapporter</p>
            </div>

            {reports.length === 0 ? (
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Inga rapporter ännu</h3>
                        <p className="text-slate-400">
                            När någon skickar en rapport via din länk visas den här.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <Card key={report.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-white">
                                                    Rapport #{report.id.slice(0, 8)}
                                                </span>
                                                {getStatusBadge(report.status)}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(report.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/reports/${report.id}`}>
                                        <Button variant="ghost" className="text-slate-400 hover:text-white">
                                            <Eye className="mr-2 h-4 w-4" />
                                            Visa
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
