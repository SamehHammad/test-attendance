"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { deviceSchema, DeviceFormData } from "@/lib/validations";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import axios from "axios";
import toast from "react-hot-toast";

interface DeviceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device?: DeviceFormData & { id?: string };
}

export function DeviceForm({ isOpen, onClose, onSuccess, device }: DeviceFormProps) {
  const isEdit = !!device?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: device ?? { port: 4370 },
  });

  const onSubmit = async (data: DeviceFormData) => {
    try {
      if (isEdit) {
        await axios.put(`/api/devices/${device?.id}`, data);
        toast.success("تم تحديث الجهاز بنجاح");
      } else {
        await axios.post("/api/devices", data);
        toast.success("تم إضافة الجهاز بنجاح");
      }
      reset();
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error ?? "حدث خطأ ما");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "تعديل الجهاز" : "إضافة جهاز جديد"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="name"
          label="اسم الجهاز"
          placeholder="مثال: جهاز المدخل الرئيسي"
          error={errors.name?.message}
          {...register("name")}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="ip"
            label="عنوان IP"
            placeholder="192.168.1.201"
            dir="ltr"
            error={errors.ip?.message}
            {...register("ip")}
          />
          <Input
            id="port"
            label="المنفذ (Port)"
            type="number"
            placeholder="4370"
            dir="ltr"
            error={errors.port?.message}
            {...register("port", { valueAsNumber: true })}
          />
        </div>
        <Input
          id="location"
          label="الموقع (اختياري)"
          placeholder="مثال: الطابق الأول - المدخل"
          error={errors.location?.message}
          {...register("location")}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={isSubmitting} className="flex-1">
            {isEdit ? "حفظ التعديلات" : "إضافة الجهاز"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
