import z from "zod";

const RegisterSchema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres").max(255, "Máximo 255 caracteres"),
  email: z.email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(255, "Máximo 255 caracteres"),
});

const LoginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(255, "Máximo 255 caracteres"),
});

export type Register = z.infer<typeof RegisterSchema>;
export type Login = z.infer<typeof LoginSchema>;
