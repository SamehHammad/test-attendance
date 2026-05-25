import { z } from "zod";

export const deviceSchema = z.object({
  name: z.string().min(2, "اسم الجهاز يجب أن يكون على الأقل حرفين"),
  ip: z
    .string()
    .regex(
      /^[a-zA-Z0-9.-]+$/,
      "عنوان IP أو الرابط غير صحيح"
    ),
  port: z
    .number()
    .int()
    .min(1, "المنفذ يجب أن يكون أكبر من 0")
    .max(65535, "المنفذ يجب أن يكون أقل من 65535")
    .default(4370),
  location: z.string().optional(),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;

export const employeeSchema = z.object({
  deviceUserId: z.string().min(1, "رقم المستخدم مطلوب"),
  name: z.string().min(2, "الاسم يجب أن يكون على الأقل حرفين"),
  department: z.string().optional(),
  position: z.string().optional(),
  deviceId: z.string().min(1, "الجهاز مطلوب"),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;
