# ResponWarga - Dokumentasi Credential
**Tanggal:** 4 Desember 2025

---

## 1. Database Production

### Connection String (Aktif)
```
postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod
```

### Detail Koneksi
| Parameter | Value |
|-----------|-------|
| Host | `192.168.18.27` |
| Port | `5433` |
| Database | `responwarga_prod` |
| Username | `postgres` |
| Password | `pickitup` |
| SSL | `false` (disabled in code) |

### User Database Lainnya (Belum Aktif/Placeholder)
| Username | Password | Keterangan |
|----------|----------|------------|
| `responwarga_user` | `SECURE_PASSWORD_HERE` | Application user |
| `responwarga_readonly` | `READONLY_PASSWORD_HERE` | Read-only/reporting |
| `responwarga_backup` | `BACKUP_PASSWORD_HERE` | Backup automation |

---

## 2. Database Development (Legacy)

```
postgresql://rio:Rio290185!@localhost:5433/responwarga_dev
```

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `5433` |
| Database | `responwarga_dev` |
| Username | `rio` |
| Password | `Rio290185!` |

---

## 3. Docker Compose (Local Development)

### PostgreSQL
| Parameter | Value |
|-----------|-------|
| Image | `postgres:16` |
| Port | `54322` (mapped to 5432) |
| Username | `responwarga` |
| Password | `responwarga` |
| Database | `responwarga` |

### pgAdmin
| Parameter | Value |
|-----------|-------|
| URL | `http://localhost:5050` |
| Email | `admin@responwarga.local` |
| Password | `admin` |

---

## 4. Test User Accounts

Semua test user menggunakan password: **`password123`**

| Email | Role | Organization |
|-------|------|--------------|
| `admin@example.com` | `admin` | - (System Admin) |
| `org_admin@example.com` | `org_admin` | BPBD DKI Jakarta |
| `responder@example.com` | `org_responder` | BPBD DKI Jakarta |
| `public@example.com` | `public` | - |

---

## 5. API Keys

### Stadia Maps
| Parameter | Value |
|-----------|-------|
| Key | `feac4320-feda-4986-8338-74f50eb59bba` |
| Env Variable | `NEXT_PUBLIC_STADIA_API_KEY` |

---

## 6. Session Configuration

| Parameter | Value | Env Variable |
|-----------|-------|--------------|
| Cookie Name | `rw_session` | `SESSION_COOKIE_NAME` |
| Max Age | `7 days` | `SESSION_MAX_AGE_DAYS` |
| Secret | `change-me` (example) | `SESSION_SECRET` |

---

## 7. File Upload Configuration

| Parameter | Value | Env Variable |
|-----------|-------|--------------|
| Upload Directory | `public/uploads` | `FILE_UPLOAD_DIR` |
| Public Base URL | `/uploads` | `PUBLIC_UPLOAD_BASE` |

---

## 8. Third-Party Services (Placeholder)

### SMTP Email
| Parameter | Value |
|-----------|-------|
| Host | `smtp.example.com` |
| Port | `587` |
| Username | `noreply@responwarga.com` |
| Password | `SMTP_PASSWORD_HERE` |

### S3 Backup
| Parameter | Value |
|-----------|-------|
| Bucket | `responwarga-backups` |
| Region | `us-west-2` |
| Access Key | `S3_ACCESS_KEY_HERE` |
| Secret Key | `S3_SECRET_KEY_HERE` |

---

## 9. Application URLs

| Environment | URL | Port |
|-------------|-----|------|
| Development | `http://localhost:3535` | 3535 |
| Docker App | `http://localhost:3535` | 3535 |

---

## ⚠️ Security Notes

1. **Production passwords** (`SECURE_PASSWORD_HERE`, etc.) harus diganti dengan password yang kuat
2. **Test credentials** (`password123`) hanya untuk development/testing
3. **API keys** yang terekspos harus di-rotate secara berkala
4. **Session secret** harus diganti di production
5. File `.env.local` tidak boleh di-commit ke version control

---

## File Lokasi Credential

| File | Keterangan |
|------|------------|
| `.env.local` | Environment variables aktif |
| `.env.example` | Template environment |
| `docs/CREDENTIALS.md` | Dokumentasi lengkap credential |
| `docs/TEST_CREDENTIALS.md` | Test user accounts |
| `docker-compose.yml` | Docker configuration |
