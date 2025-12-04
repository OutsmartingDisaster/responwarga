# Respon Warga Database Migration - Credentials and Configuration

## ⚠️ SECURITY WARNING

This document contains sensitive information including passwords and connection details. 
- Store this file securely
- Never commit to version control
- Share only with authorized personnel
- Use secure channels for distribution
- Destroy after migration is complete and verified

---

## Database Credentials

### New Production Database (192.168.18.27)

#### Application User
```yaml
username: responwarga_user
password: SECURE_PASSWORD_HERE  # Replace with strong password
database: responwarga_prod
host: 192.168.18.27
port: 5432
ssl_mode: require
max_connections: 20
privileges: 
  - SELECT, INSERT, UPDATE, DELETE on all tables
  - USAGE on all sequences
  - EXECUTE on all functions
```

#### Read-Only User (Reporting/Analytics)
```yaml
username: responwarga_readonly
password: READONLY_PASSWORD_HERE  # Replace with strong password
database: responwarga_prod
host: 192.168.18.27
port: 5432
ssl_mode: require
max_connections: 50
privileges:
  - SELECT on all tables
  - USAGE on all sequences
```

#### Backup User (Automated Backups)
```yaml
username: responwarga_backup
password: BACKUP_PASSWORD_HERE  # Replace with strong password
database: responwarga_prod
host: 192.168.18.27
port: 5432
ssl_mode: require
max_connections: 10
privileges:
  - SELECT on all tables
  - USAGE on all sequences
```

#### Superuser (Database Administration)
```yaml
username: postgres
password: POSTGRES_ADMIN_PASSWORD  # Replace with very strong password
database: postgres
host: 192.168.18.27
port: 5432
privileges: ALL
```

### Current Development Database (For Migration)

```yaml
username: rio
password: Rio290185!
database: responwarga_dev
host: localhost
port: 5433
ssl_mode: disable
```

---

## Connection Strings

### Production Application Connection
```
postgresql://responwarga_user:SECURE_PASSWORD_HERE@192.168.18.27:5432/responwarga_prod?sslmode=require&connect_timeout=20&application_name=responwarga
```

### Read-Only Connection (Reporting)
```
postgresql://responwarga_readonly:READONLY_PASSWORD_HERE@192.168.18.27:5432/responwarga_prod?sslmode=require&connect_timeout=20&application_name=responwarga_readonly
```

### Backup Connection
```
postgresql://responwarga_backup:BACKUP_PASSWORD_HERE@192.168.18.27:5432/responwarga_prod?sslmode=require&connect_timeout=20&application_name=responwarga_backup
```

### Migration Source Connection
```
postgresql://rio:Rio290185!@localhost:5433/responwarga_dev?sslmode=disable
```

---

## SSL Configuration

### SSL Certificate Paths
```yaml
server_cert: /etc/ssl/certs/postgresql.crt
server_key: /etc/ssl/private/postgresql.key
ca_cert: /etc/ssl/certs/ca.crt
client_cert: /etc/ssl/certs/client.crt
client_key: /etc/ssl/private/client.key
```

### SSL Configuration Settings
```yaml
ssl: on
ssl_cert_file: /etc/ssl/certs/postgresql.crt
ssl_key_file: /etc/ssl/private/postgresql.key
ssl_ca_file: /etc/ssl/certs/ca.crt
ssl_crl_file: /etc/ssl/certs/postgresql.crl
```

---

## Application Configuration

### Environment Variables
```bash
# Database Configuration
POSTGRES_HOST=192.168.18.27
POSTGRES_PORT=5432
POSTGRES_DB=responwarga_prod
POSTGRES_USER=responwarga_user
POSTGRES_PASSWORD=SECURE_PASSWORD_HERE

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=10000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
SESSION_TIMEOUT=3600
ENABLE_RLS=true

# Performance
ENABLE_QUERY_CACHE=true
QUERY_CACHE_SIZE=100MB
STATEMENT_TIMEOUT=30000

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/responwarga/app.log
```

---

## Server Access Credentials

### Database Server (192.168.18.27)
```yaml
ssh_user: admin_user  # Replace with actual SSH user
ssh_port: 22
ssh_key: ~/.ssh/responwarga_db_server
sudo_password: SERVER_SUDO_PASSWORD  # Replace with actual password
```

### Application Server
```yaml
ssh_user: deploy_user
ssh_port: 22
ssh_key: ~/.ssh/responwarga_app_server
sudo_password: APP_SUDO_PASSWORD  # Replace with actual password
```

---

## Third-Party Service Credentials

### Email Service (SMTP)
```yaml
smtp_host: smtp.example.com
smtp_port: 587
smtp_user: noreply@responwarga.com
smtp_password: SMTP_PASSWORD_HERE
smtp_tls: true
```

### Cloud Storage (S3 Backup)
```yaml
s3_bucket: responwarga-backups
s3_region: us-west-2
s3_access_key: S3_ACCESS_KEY_HERE
s3_secret_key: S3_SECRET_KEY_HERE
```

### Monitoring Services
```yaml
prometheus_password: PROMETHEUS_PASSWORD_HERE
grafana_admin_password: GRAFANA_PASSWORD_HERE
```

---

## Password Generation Guidelines

### Strong Password Requirements
- Minimum 16 characters
- Include uppercase and lowercase letters
- Include numbers and special characters
- No dictionary words or personal information
- Unique for each service

### Example Strong Passwords
```
# Application Database
9xK#mP2$vL8@nQ5!wR

# Read-only User
4bN&7pT#3sF*9zH@2qL

# Backup User
6yJ$8rW#5dX*1vK@3pM

# Superuser
3zF&9xL#7pC*2vN@8qR
```

### Password Storage
- Use password manager (1Password, LastPass, etc.)
- Store encrypted copies offline
- Share via secure channels only
- Rotate passwords regularly
- Use different passwords for each service

---

## Security Configuration

### PostgreSQL Security Settings
```sql
-- Password encryption
password_encryption = scram-sha-256

-- SSL settings
ssl = on
ssl_cert_file = '/etc/ssl/certs/postgresql.crt'
ssl_key_file = '/etc/ssl/private/postgresql.key'
ssl_ca_file = '/etc/ssl/certs/ca.crt'

-- Connection security
listen_addresses = '*'
port = 5432
max_connections = 100

-- Logging
log_connections = on
log_disconnections = on
log_statement = 'all'
log_duration = on
```

### Firewall Rules
```bash
# Allow database connections from application server
ufw allow from APP_SERVER_IP to any port 5432

# Allow SSH from management network
ufw allow from MANAGEMENT_NETWORK to any port 22

# Deny all other database connections
ufw deny 5432
```

---

## Backup Configuration

### Automated Backup Script
```bash
#!/bin/bash
# Backup configuration
BACKUP_USER="responwarga_backup"
BACKUP_PASSWORD="BACKUP_PASSWORD_HERE"
BACKUP_HOST="192.168.18.27"
BACKUP_DB="responwarga_prod"
BACKUP_DIR="/var/backups/responwarga"
RETENTION_DAYS=30

# Create backup
pg_dump -h $BACKUP_HOST -U $BACKUP_USER -d $BACKUP_DB \
  --format=custom --compress=9 \
  --file="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

# Cleanup old backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +$RETENTION_DAYS -delete
```

### Backup Schedule (Crontab)
```bash
# Daily backups at 2 AM
0 2 * * * /usr/local/bin/responwarga_backup.sh

# Weekly full backups on Sunday at 3 AM
0 3 * * 0 /usr/local/bin/responwarga_full_backup.sh

# Hourly transaction log backups
0 * * * * /usr/local/bin/responwarga_log_backup.sh
```

---

## Monitoring and Alerting

### Database Monitoring
```yaml
metrics:
  - connection_count
  - query_response_time
  - cpu_usage
  - memory_usage
  - disk_io
  - replication_lag

alerts:
  - connection_count > 80
  - query_response_time > 5s
  - cpu_usage > 80%
  - memory_usage > 90%
  - disk_space < 10%
```

### Health Check Endpoints
```bash
# Database health check
curl -f https://responwarga.example.com/api/health/database

# Application health check
curl -f https://responwarga.example.com/api/health/application

# Full system health check
curl -f https://responwarga.example.com/api/health/system
```

---

## Emergency Procedures

### Database Recovery
```bash
# Stop application
systemctl stop responwarga-app

# Restore from backup
pg_restore -h 192.168.18.27 -U postgres -d responwarga_prod \
  --clean --if-exists --verbose \
  /var/backups/responwarga/backup_YYYYMMDD_HHMMSS.sql

# Restart application
systemctl start responwarga-app
```

### Password Reset
```sql
-- Reset application user password
ALTER USER responwarga_user PASSWORD 'NEW_SECURE_PASSWORD';

-- Reset read-only user password
ALTER USER responwarga_readonly PASSWORD 'NEW_SECURE_PASSWORD';

-- Reset backup user password
ALTER USER responwarga_backup PASSWORD 'NEW_SECURE_PASSWORD';
```

---

## Contact Information

### Emergency Contacts
| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| DBA | [DBA Name] | [Phone] | [Email] | 24/7 |
| SysAdmin | [SysAdmin Name] | [Phone] | [Email] | 24/7 |
| Dev Lead | [Dev Name] | [Phone] | [Email] | Business Hours |
| Security | [Security Name] | [Phone] | [Email] | 24/7 |

### Service Providers
| Service | Provider | Support Contact | Contract |
|---------|----------|-----------------|----------|
| Hosting | [Provider] | [Contact] | [Contract] |
| SSL Certs | [Provider] | [Contact] | [Contract] |
| Backup | [Provider] | [Contact] | [Contract] |
| Monitoring | [Provider] | [Contact] | [Contract] |

---

## Post-Migration Actions

### Security Tasks
- [ ] Change all default passwords
- [ ] Enable audit logging
- [ ] Configure intrusion detection
- [ ] Set up security scanning
- [ ] Review user permissions
- [ ] Update documentation

### Maintenance Tasks
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Schedule regular maintenance
- [ ] Test restore procedures
- [ ] Update disaster recovery plan
- [ ] Document lessons learned

---

## Important Notes

1. **Never use production passwords in development environments**
2. **Always use SSL connections in production**
3. **Regularly rotate all passwords**
4. **Monitor for unauthorized access attempts**
5. **Keep backup encryption keys secure**
6. **Document all password changes**
7. **Use multi-factor authentication where possible**
8. **Regular security audits are essential**

---

**Document Classification**: Confidential  
**Access Level**: Authorized Personnel Only  
**Retention Period**: Destroy after migration completion  
**Last Updated**: [Current Date]  
**Version**: 1.0

⚠️ **Remember to securely destroy this document after migration is complete and verified!**