import { z } from 'zod'
import type { CreateUserDto } from '../../../shared/types/dtos/user.dto'

/**
 * Lista de senhas comuns que devem ser bloqueadas
 * Baseada em senhas mais usadas e variações comuns em português
 */
const SENHAS_COMUNS = [
  'password123',
  '123456789',
  'qwerty123',
  'admin123',
  'senha123',
  'mudar123',
  '12345678',
  'abc123456',
  '123456',
  'password',
  '12345678910',
  'qwerty',
  'abc123',
  'senha',
  'admin',
  'administrador',
  'usuario',
  'user123',
  'pass123',
  'senha1234',
  'admin1234',
  '1234567890',
  'password1',
  'senha@123',
  'admin@123'
]

/**
 * Schema Zod para validação de senha forte
 *
 * Requisitos:
 * - Mínimo 12 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial
 * - Não pode ser uma senha comum
 */
export const passwordSchema = z.string()
  .min(12, 'Senha deve ter no mínimo 12 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/\d/, 'Senha deve conter pelo menos um número')
  .regex(/[^\dA-Z]/i, 'Senha deve conter pelo menos um caractere especial (!@#$%^&*)')
  .refine(
    (senha) => !SENHAS_COMUNS.includes(senha.toLowerCase()),
    'Senha muito comum, escolha outra'
  )

/**
 * Schema completo para criação de usuário
 * Inclui validação de email, nome, role e senha
 */
export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  role: z.enum(['admin', 'professional', 'superadmin'], {
    message: 'Role deve ser admin, professional ou superadmin'
  }),
  senha: passwordSchema
}) satisfies z.ZodType<CreateUserDto>

/**
 * Tipo TypeScript inferido do schema
 * @deprecated Use CreateUserDto from #shared/types/dtos/user.dto instead
 */
export type CreateUserInput = z.infer<typeof createUserSchema>
