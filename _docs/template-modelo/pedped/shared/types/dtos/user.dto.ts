export interface CreateUserDto {
  email: string
  nome: string
  role: 'admin' | 'professional' | 'superadmin'
  senha: string
}
