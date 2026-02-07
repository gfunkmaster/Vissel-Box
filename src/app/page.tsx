import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Lock, Eye, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-500" />
            <span className="text-xl font-bold text-white">Vissel-Box</span>
          </div>
          <Link href="/sign-in">
            <Button variant="outline" className="border-slate-600 text-slate-800 bg-white hover:bg-slate-100">
              Logga in
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
            <Lock className="h-4 w-4" />
            GDPR-kompatibel • Zero-Knowledge
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Säker visselblåsning
            <span className="text-emerald-500"> för svenska företag</span>
          </h1>

          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            En krypterad plattform där anställda kan rapportera anonymt.
            Vi ser aldrig innehållet – bara du kan dekryptera.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white px-8">
                Kom igång gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-800 bg-white hover:bg-slate-100">
                Se demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-emerald-500" />
              </div>
              <CardTitle className="text-white">End-to-end kryptering</CardTitle>
              <CardDescription className="text-slate-200">
                Rapporter krypteras i webbläsaren innan de skickas. Servern ser aldrig innehållet.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle className="text-white">Anonym rapportering</CardTitle>
              <CardDescription className="text-slate-200">
                Inga IP-adresser eller identifierande information sparas. Total anonymitet.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-500" />
              </div>
              <CardTitle className="text-white">GDPR-kompatibel</CardTitle>
              <CardDescription className="text-slate-200">
                Uppfyller EU:s visselblåsardirektiv och svenska lagkrav för dataskydd.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How it works */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Så fungerar det</h2>
          <p className="text-slate-300 mb-12 max-w-2xl mx-auto">
            Tre enkla steg för att skydda dina visselblåsare
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-500">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Registrera ditt företag</h3>
              <p className="text-slate-300">Skapa ett konto och generera dina krypteringsnycklar</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-500">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Dela din länk</h3>
              <p className="text-slate-300">Ge anställda en unik länk för anonym rapportering</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-500">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Läs rapporter säkert</h3>
              <p className="text-slate-300">Dekryptera och hantera rapporter i din dashboard</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-32">
        <div className="container mx-auto px-4 py-8 text-center text-slate-500">
          <p className="text-slate-300">© 2026 Vissel-Box. Alla rättigheter förbehållna.</p>
        </div>
      </footer>
    </div>
  )
}
