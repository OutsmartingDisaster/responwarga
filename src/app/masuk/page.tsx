'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, UserPlus, LogIn } from 'lucide-react'
import { AuthHeader, FormInput, RoleSelector, AuthMessage, SubmitButton, type UserRole } from '@/components/auth'
import { registerUser, loginUser, getSession } from '@/lib/auth/api'
import { getRegistrationRedirect, getLoginRedirect } from '@/lib/auth/redirect'

export default function MasukPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check if user is already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const user = await getSession()
        if (user) {
          const redirect = await getLoginRedirect(user)
          router.replace(redirect.path)
          return
        }
      } catch (err) {
        console.error('Session check error:', err)
      }
      setCheckingSession(false)
    }
    checkExistingSession()
  }, [router])

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('org_admin')

  const validateForm = (): string | null => {
    if (isRegister) {
      if (password !== confirmPassword) return 'Kata sandi tidak cocok.'
      if (password.length < 6) return 'Kata sandi minimal 6 karakter.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setLoading(false)
      return
    }

    if (isRegister) {
      const result = await registerUser({ email, password, name, role })
      if (!result.success) {
        setError(result.error || 'Pendaftaran gagal')
        setLoading(false)
        return
      }

      if (result.user) {
        const redirect = await getRegistrationRedirect(result.user)
        if (redirect.message) setSuccess(redirect.message)
        setTimeout(() => router.replace(redirect.path), redirect.delay || 0)
      }
    } else {
      const result = await loginUser({ email, password })
      if (!result.success) {
        setError(result.error || 'Login gagal')
        setLoading(false)
        return
      }

      if (result.user) {
        const redirect = await getLoginRedirect(result.user)
        router.replace(redirect.path)
      }
    }

    setLoading(false)
  }

  const toggleMode = () => {
    setIsRegister(!isRegister)
    setError(null)
    setSuccess(null)
  }

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-4">
      <div className="w-full max-w-md">
        <AuthHeader
          icon={isRegister ? UserPlus : LogIn}
          title={isRegister ? 'Daftar Akun' : 'Masuk'}
          subtitle={isRegister
            ? 'Buat akun baru untuk bergabung dengan Respon Warga'
            : 'Masuk ke akun Anda untuk melanjutkan'}
        />

        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6 shadow-xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <FormInput
                label="Nama Lengkap"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={name}
                onChange={setName}
                required
                icon={User}
              />
            )}

            <FormInput
              label="Email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={setEmail}
              required
              icon={Mail}
            />

            {isRegister && <RoleSelector value={role} onChange={setRole} />}

            <FormInput
              label="Kata Sandi"
              type="password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              icon={Lock}
            />

            {isRegister && (
              <FormInput
                label="Konfirmasi Kata Sandi"
                type="password"
                placeholder="Ulangi kata sandi"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                minLength={6}
                icon={Lock}
              />
            )}

            {error && <AuthMessage type="error" message={error} />}
            {success && <AuthMessage type="success" message={success} />}

            <SubmitButton
              loading={loading}
              loadingText="Memproses..."
              icon={isRegister ? UserPlus : LogIn}
              text={isRegister ? 'Daftar' : 'Masuk'}
            />
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-700 text-center">
            <p className="text-zinc-400">
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
            </p>
            <button
              type="button"
              onClick={toggleMode}
              className="mt-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {isRegister ? 'Masuk di sini' : 'Daftar sekarang'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
