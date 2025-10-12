// builtin

// external
import Link from "next/link";
import { Card, Button } from "pixel-retroui";

// internal

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 to-violet-200 flex flex-col">
      <header className="w-full px-8 py-4 bg-white shadow flex justify-between items-center">
        <h1 className="text-2xl font-extrabold font-minecraft text-violet-700 flex items-center gap-2">
          Triviate
        </h1>
        <nav className="flex gap-4">
          <Button>
            <Link href="/auth/login" className="transition flex items-center gap-2">
              Login
            </Link>
          </Button>
          <Button>
            <Link href="/auth/sign-up" className="transition flex items-center gap-2">
              Sign Up
            </Link>
          </Button>
        </nav>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center">
        <Card bg="#ffffff" textColor="#000000" className="max-w-2xl w-full px-8 py-12 rounded-xl shadow-lg flex flex-col items-center">
          <h2 className="text-3xl font-bold font-minecraft text-violet-700 mb-4 text-center flex items-center gap-2">
            Multiplayer Trivia Made Simple
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-2" role="img" aria-label="play">⚡</span>
              <span className="font-minecraft">Instant Play</span>
              <span className="text-gray-500 text-sm text-center">Jump into a game in seconds.</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-2" role="img" aria-label="friends">👥</span>
              <span className="font-minecraft">Play With Friends</span>
              <span className="text-gray-500 text-sm text-center">Invite and compete live.</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-2" role="img" aria-label="leaderboard">🏆</span>
              <span className="font-minecraft">Leaderboard</span>
              <span className="text-gray-500 text-sm text-center">Climb the ranks and show off.</span>
            </div>
          </div>
          <Button bg="#32cd32" textColor="#ffffff" className="w-full text-lg text-center transition mb-4 flex items-center justify-center gap-2">
            <Link href="/play">
              Quick Play
            </Link>
          </Button>
        </Card>
      </section>
    </main>
  );
}
