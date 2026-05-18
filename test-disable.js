const { PrismaClient } = require('@prisma/client');
const ZKLib = require('node-zklib');

const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany();
  if (devices.length === 0) {
    console.log("No devices found in DB");
    return;
  }
  
  const device = devices[0];
  console.log(`Connecting to ${device.name} at ${device.ip}:${device.port} with a 20-second timeout...`);
  
  // High timeout (20s) to give the device enough time
  const zk = new ZKLib(device.ip, device.port, 20000, 4000);
  try {
    console.log("Creating socket...");
    await zk.createSocket();
    console.log("Socket created!");
    
    console.log("Disabling device scanner to prevent CPU resource division...");
    await zk.disableDevice();
    console.log("Device disabled successfully.");
    
    console.log("Fetching attendances...");
    const att = await zk.getAttendances();
    console.log("Attendances success! Count:", att?.data?.length);
    
    console.log("Fetching users...");
    const users = await zk.getUsers();
    console.log("Users success! Count:", users?.data?.length);
    
    console.log("Enabling device scanner...");
    await zk.enableDevice();
    console.log("Device enabled successfully.");
    
    console.log("Disconnecting...");
    await zk.disconnect();
    console.log("Disconnected!");
  } catch (err) {
    console.error("Error during operations:", err);
    try {
      console.log("Ensuring device is re-enabled on error...");
      await zk.enableDevice();
    } catch (e) {}
    try {
      await zk.disconnect();
    } catch (e) {}
  } finally {
    await prisma.$disconnect();
  }
}

main();
