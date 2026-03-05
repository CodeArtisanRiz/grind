import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(session.user.id);

    const rows = await prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
    });

    const sessions = rows.map((r: { sessionData: unknown; createdAt: Date }) => ({ ...(r.sessionData as object), created_at: r.createdAt }));
    return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(session.user.id);
    const { sessionData } = await req.json();

    await prisma.workoutSession.create({
        data: { userId, sessionData },
    });

    return NextResponse.json({ ok: true });
}
