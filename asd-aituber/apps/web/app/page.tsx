import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">ASD-AITuber</h1>
      <p className="mt-4 text-lg text-gray-600">
        Educational AITuber platform
      </p>
      <Link
        href="/chat"
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Start Chat
      </Link>
    </main>
  )
}