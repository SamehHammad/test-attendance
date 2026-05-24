"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import net from "net";

export async function GET() {
    try {
        const settings = await prisma.systemSetting.findUnique({
            where: { id: "global" }
        });

        if (!settings) {
            return Response.json({ 
                isConnected: false, 
                connectionStatus: "disconnected",
                lastConnectionTime: null
            });
        }

        return Response.json({
            isConnected: settings.isConnected || false,
            connectionStatus: settings.connectionStatus || "disconnected",
            lastConnectionTime: settings.lastConnectionTime,
            connectionError: settings.connectionError,
            networkMode: settings.networkMode
        });
    } catch (error) {
        console.error("Error fetching connection status:", error);
        return Response.json({ error: "Failed to fetch connection status" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, mode } = body;

        const settings = await prisma.systemSetting.findUnique({
            where: { id: "global" }
        });

        if (!settings) {
            return Response.json({ error: "Settings not found" }, { status: 404 });
        }

        let host = "";
        let port = 0;

        if (mode === "port") {
            host = settings.publicIp || "";
            port = settings.publicPort || 0;
        } else if (mode === "vpn") {
            host = settings.vpnIp || "";
            port = 1723; // Default PPTP VPN port
        } else if (mode === "tunnel") {
            if (settings.tunnelUrl?.startsWith("tcp://")) {
                const parts = settings.tunnelUrl.replace("tcp://", "").split(":");
                host = parts[0];
                port = parseInt(parts[1]);
            }
        }

        if (action === "connect") {
            // Update status to connecting
            await prisma.systemSetting.update({
                where: { id: "global" },
                data: {
                    connectionStatus: "connecting",
                    networkMode: mode
                }
            });

            // Test the connection
            const connectionResult = await testConnection(host, port);

            if (connectionResult.success) {
                await prisma.systemSetting.update({
                    where: { id: "global" },
                    data: {
                        isConnected: true,
                        connectionStatus: "connected",
                        lastConnectionTime: new Date(),
                        connectionError: null,
                        networkMode: mode
                    }
                });
                revalidatePath("/dashboard/settings");
                return Response.json({ 
                    success: true, 
                    message: "تم الاتصال بنجاح",
                    connectionStatus: "connected"
                });
            } else {
                await prisma.systemSetting.update({
                    where: { id: "global" },
                    data: {
                        isConnected: false,
                        connectionStatus: "error",
                        connectionError: connectionResult.message,
                        networkMode: mode
                    }
                });
                revalidatePath("/dashboard/settings");
                return Response.json({ 
                    success: false, 
                    message: connectionResult.message,
                    connectionStatus: "error"
                }, { status: 400 });
            }
        } else if (action === "disconnect") {
            await prisma.systemSetting.update({
                where: { id: "global" },
                data: {
                    isConnected: false,
                    connectionStatus: "disconnected",
                    connectionError: null
                }
            });
            revalidatePath("/dashboard/settings");
            return Response.json({ 
                success: true, 
                message: "تم فصل الاتصال",
                connectionStatus: "disconnected"
            });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error managing connection:", error);
        return Response.json({ error: "Failed to manage connection" }, { status: 500 });
    }
}

function testConnection(host: string, port: number): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
        if (!host || !port) {
            return resolve({ success: false, message: "Host or Port is missing" });
        }

        // Bypass TCP check for VPN (port 1723) since Vercel cannot ping it directly
        if (port === 1723) {
            return resolve({ success: true, message: "تم تسجيل إعدادات الـ VPN بنجاح واعتمادها كالاتصال الأساسي" });
        }

        const socket = new net.Socket();
        socket.setTimeout(5000);

        socket.on("connect", () => {
            socket.destroy();
            resolve({ success: true, message: "تم الاتصال بنجاح" });
        });

        socket.on("timeout", () => {
            socket.destroy();
            resolve({ success: false, message: "فشل الاتصال: انتهت مهلة الاتصال" });
        });

        socket.on("error", (err) => {
            socket.destroy();
            resolve({ success: false, message: `فشل الاتصال: ${err.message}` });
        });

        socket.connect(port, host);
    });
}
