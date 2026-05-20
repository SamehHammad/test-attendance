"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
