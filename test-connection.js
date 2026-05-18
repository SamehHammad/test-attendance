const { PrismaClient } = require('@prisma/client');
const ZKLib = require('node-zklib');

const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany();
  console.log("Devices in DB:", devices);
  
  if (devices.length === 0) {
    console.log("No devices found in DB");
    return;
  }
  
  const device = devices[0];
  console.log(`Connecting to ${device.name} at ${device.ip}:${device.port}...`);
  
  const zk = new ZKLib(device.ip, device.port, 10000, 4000);
  try {
    console.log("Creating socket...");
    await zk.createSocket();
    console.log("Socket created!");
    
    console.log("Fetching attendances...");
    const att = await zk.getAttendances();
    console.log("Attendances success! Count:", att?.data?.length);
    
    console.log("Fetching users...");
    const users = await zk.getUsers();
    console.log("Users success! Count:", users?.data?.length);
    
    console.log("Disconnecting...");
    await zk.disconnect();
    console.log("Disconnected!");
  } catch (err) {
    console.error("Error during ZK operations:", err);
    try {
      await zk.disconnect();
    } catch (e) {
      console.error("Error disconnecting:", e);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
