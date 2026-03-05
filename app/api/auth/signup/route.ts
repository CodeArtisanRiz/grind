import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password required" }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (existing) {
            return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }

        const hash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { email: email.toLowerCase().trim(), password: hash, name: name || null },
            select: { id: true, email: true, name: true },
        });

        return NextResponse.json({ user }, { status: 201 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[SIGNUP ERROR]", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
