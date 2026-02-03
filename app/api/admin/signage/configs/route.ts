import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    const base = process.env.SIGNAGE_API_BASE!;
    const token = process.env.SIGNAGE_ADMIN_TOKEN!;

    const res = await fetch(`${base}/signage/configs`, {
        headers: { "x-admin-token": token },
        cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
export async function PUT(req: Request) {
    const base = process.env.SIGNAGE_API_BASE!;
    console.log("base =", base);
    const token = process.env.SIGNAGE_ADMIN_TOKEN!;

    const body = await req.json();

    const res = await fetch(`${base}/signage/config`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "x-admin-token": token,
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}