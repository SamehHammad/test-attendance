"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import net from "net";

export async function getSystemSettings() {
    const settings = await prisma.systemSetting.findUnique({
        where: { id: "global" }
    });

    if (!settings) {
        return await prisma.systemSetting.create({
            data: {
                id: "global",
                networkMode: "local",
            }
        });
    }

    return settings;
}

export async function updateSystemSettings(data: any) {
    const settings = await prisma.systemSetting.upsert({
        where: { id: "global" },
        update: {
            ...data,
            publicPort: data.publicPort ? parseInt(data.publicPort, 10) : null,
            vpnPort: data.vpnPort ? parseInt(data.vpnPort, 10) : null,
        },
        create: {
            id: "global",
            ...data,
            publicPort: data.publicPort ? parseInt(data.publicPort, 10) : null,
            vpnPort: data.vpnPort ? parseInt(data.vpnPort, 10) : null,
        }
    });

    revalidatePath("/dashboard/settings");
    return settings;
}

export async function testConnection(host: string, port: number): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
        if (!host || !port) {
            return resolve({ success: false, message: "Host or Port is missing" });
        }

        const socket = new net.Socket();
        socket.setTimeout(5000); // 5 seconds timeout

        socket.on("connect", () => {
            socket.destroy();
            resolve({ success: true, message: "تم الاتصال بنجاح (Connection Successful)" });
        });

        socket.on("timeout", () => {
            socket.destroy();
            resolve({ success: false, message: "فشل الاتصال: انتهت مهلة الاتصال (Timeout) تأكد من صحة البيانات" });
        });

        socket.on("error", (err) => {
            socket.destroy();
            resolve({ success: false, message: `فشل الاتصال: ${err.message}` });
        });

        socket.connect(port, host);
    });
}

export async function getConnectionStatus() {
    const settings = await prisma.systemSetting.findUnique({
        where: { id: "global" }
    });

    if (!settings) {
        return {
            isConnected: false,
            connectionStatus: "disconnected",
            lastConnectionTime: null,
            connectionError: null,
            networkMode: "local"
        };
    }

    return {
        isConnected: settings.isConnected || false,
        connectionStatus: settings.connectionStatus || "disconnected",
        lastConnectionTime: settings.lastConnectionTime,
        connectionError: settings.connectionError,
        networkMode: settings.networkMode
    };
}

export async function setConnectionStatus(status: "connected" | "disconnected" | "connecting" | "error", error?: string) {
    const settings = await prisma.systemSetting.update({
        where: { id: "global" },
        data: {
            connectionStatus: status,
            isConnected: status === "connected",
            lastConnectionTime: status === "connected" ? new Date() : undefined,
            connectionError: error || null
        }
    });

    revalidatePath("/dashboard/settings");
    return settings;
}
