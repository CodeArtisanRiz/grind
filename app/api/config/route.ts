import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(session.user.id);

    const record = await prisma.userConfig.findUnique({ where: { userId } });
    const config = record?.config ?? { weekPlan: {}, groups: {}, exercises: {} };

    return NextResponse.json({ config });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(session.user.id);
    const { config } = await req.json();

    await prisma.userConfig.upsert({
        where: { userId },
        update: { config },
        create: { userId, config },
    });

    return NextResponse.json({ ok: true });
}
