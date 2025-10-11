// builtin

import Link from "next/link";


// external

// internal

export default async function Dashboard() {

    return (
        <div>
            Dashboard

            <Link href="/play">
                Play a game
            </Link>
        </div>
    );
}