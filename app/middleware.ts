import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    // ป้องกันเฉพาะ path /admin และ /api/admin
    const { pathname } = req.nextUrl;
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
        return NextResponse.next();
    }

    const user = process.env.ADMIN_USER || "admin";
    const pass = process.env.ADMIN_PASS || "1234";

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Basic ")) {
        return new NextResponse("Auth required", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
        });
    }

    const base64 = auth.replace("Basic ", "");
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    const [u, p] = decoded.split(":");

    if (u !== user || p !== pass) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
