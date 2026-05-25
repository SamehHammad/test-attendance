"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DeviceCard } from "@/components/devices/DeviceCard";
import { DeviceForm } from "@/components/devices/DeviceForm";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { DeviceFormData } from "@/lib/validations";

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<(DeviceFormData & { id?: string }) | undefined>();

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/devices");
      setDevices(res.data.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("فشل تحميل الأجهزة. تحقق من الاتصال بقاعدة البيانات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أجهزة البصمة</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة والاتصال بأجهزة ZKTeco</p>
        </div>
        <Button onClick={() => { setSelectedDevice(undefined); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4" /> إضافة جهاز
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
      ) : devices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 mb-4">لا توجد أجهزة مضافة بعد</p>
          <Button onClick={() => setIsModalOpen(true)}>أضف أول جهاز</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {devices.map((device, idx) => (
            <DeviceCard
              key={device.id}
              device={device}
              index={idx}
              onRefresh={fetchDevices}
              onDelete={fetchDevices}
              onEdit={() => {
                setSelectedDevice(device);
                setIsModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <DeviceForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchDevices}
          device={selectedDevice}
        />
      )}
    </div>
  );
}
