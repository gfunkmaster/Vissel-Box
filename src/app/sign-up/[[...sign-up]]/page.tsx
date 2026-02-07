import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <SignUp
                appearance={{
                    elements: {
                        rootBox: 'mx-auto',
                        card: 'bg-slate-900 border-slate-800',
                    },
                }}
            />
        </div>
    )
}
