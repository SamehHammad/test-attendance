const { PrismaClient } = require('@prisma/client');
const ZKLibUDP = require('node-zklib/zklibudp');

const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany();
  if (devices.length === 0) {
    console.log("No devices found in DB");
    return;
  }
  
  const device = devices[0];
  console.log(`Connecting via UDP to ${device.name} at ${device.ip}:${device.port}...`);
  
  // ZKLibUDP constructor signature: (ip, port, timeout, inport)
  const zk = new ZKLibUDP(device.ip, device.port, 10000, 4000);
  try {
    console.log("Creating UDP socket...");
    await zk.createSocket();
    console.log("UDP socket created!");
    
    console.log("Connecting UDP...");
    await zk.connect();
    console.log("UDP connected successfully!");
    
    console.log("Fetching attendances via UDP...");
    const att = await zk.getAttendances();
    console.log("UDP Attendances success! Count:", att?.data?.length);
    
    console.log("Fetching users via UDP...");
    const users = await zk.getUsers();
    console.log("UDP Users success! Count:", users?.data?.length);
    
    console.log("Disconnecting UDP...");
    await zk.disconnect();
    console.log("UDP Disconnected!");
  } catch (err) {
    console.error("Error during UDP ZK operations:", err);
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
