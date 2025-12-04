# PostgreSQL Database Documentation

## Current Database Setup

### Connection Details
- **Host**: 192.168.18.27
- **Port**: 5433
- **Default Database**: postgres
- **Default User**: postgres
- **Password**: pickitup
- **PostgreSQL Version**: 15
- **Extensions Installed**: PostGIS 3.6.1, pgvector 0.8.1

### Container Information
- **Container Name**: postgres15
- **Restart Policy**: unless-stopped (auto-starts after reboot)
- **Data Volume**: postgres15_data (persistent storage)
- **Docker Command**:
```bash
docker run -d --name postgres15 \
    -e POSTGRES_PASSWORD=pickitup \
    -v postgres15_data:/var/lib/postgresql/data \
    -p 5433:5432 \
    --restart=unless-stopped \
    postgres:15
```

## Remote Connection Setup

### 1. Allow Remote Connections
By default, PostgreSQL only accepts connections from localhost. To allow connections from other IPs:

```bash
# Enter the container
docker exec -it postgres15 bash

# Edit PostgreSQL configuration
echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf
```

### 2. Configure pg_hba.conf for Remote Access
```bash
# Add this line to allow connections from specific IP range
# Format: host    database    user    address    method

# Allow specific IP address (recommended)
echo "host    all    all    192.168.1.100/32    md5" >> /var/lib/postgresql/data/pg_hba.conf

# Or allow entire subnet (less secure)
echo "host    all    all    192.168.1.0/24    md5" >> /var/lib/postgresql/data/pg_hba.conf

# Allow from anywhere (least secure - use with caution)
echo "host    all    all    0.0.0.0/0    md5" >> /var/lib/postgresql/data/pg_hba.conf
```

### 3. Restart PostgreSQL to Apply Changes
```bash
docker restart postgres15
```

## Creating New Databases and Users

### Method 1: Using SQL Commands
```sql
-- Connect to PostgreSQL
docker exec -it postgres15 psql -U postgres

-- Create new user with password
CREATE USER newuser WITH PASSWORD 'newpassword';

-- Create new database owned by the user
CREATE DATABASE newdb OWNER newuser;

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE newdb TO newuser;

-- Grant connection privilege
GRANT CONNECT ON DATABASE newdb TO newuser;

-- Exit psql
\q
```

### Method 2: Using Environment Variables (for new containers)
If you need multiple database containers with different configurations:

```bash
# Create container with multiple databases/users
docker run -d --name postgres_multi \
    -e POSTGRES_PASSWORD=adminpass \
    -e POSTGRES_USER=admin \
    -e POSTGRES_DB=maindb \
    -e POSTGRES_MULTIPLE_DATABASES=db1:db2:db3 \
    -e POSTGRES_MULTIPLE_USERS=user1:password1,user2:password2,user3:password3 \
    -v multi_db_data:/var/lib/postgresql/data \
    -p 5434:5432 \
    --restart=unless-stopped \
    postgres:15
```

## Connecting from Other Applications

### Connection String Formats

#### PostgreSQL URI Format
```
postgresql://username:password@host:port/database
```

#### JDBC Format (Java)
```
jdbc:postgresql://host:port/database?user=username&password=password
```

#### Python (psycopg2)
```python
import psycopg2
conn = psycopg2.connect(
    host="host_ip",
    port="5433",
    database="dbname",
    user="username",
    password="password"
)
```

#### Node.js (pg)
```javascript
const { Pool } = require('pg');
const pool = new Pool({
    host: 'host_ip',
    port: 5433,
    database: 'dbname',
    user: 'username',
    password: 'password',
});
```

## Database Management Commands

### Basic Operations
```bash
# Connect to default database
docker exec -it postgres15 psql -U postgres

# Connect to specific database
docker exec -it postgres15 psql -U postgres -d dbname

# Connect with different user
docker exec -it postgres15 psql -U username -d dbname

# List all databases
docker exec postgres15 psql -U postgres -c "\l"

# List all users
docker exec postgres15 psql -U postgres -c "\du"

# List all tables in current database
docker exec postgres15 psql -U postgres -d dbname -c "\dt"

# Check running container status
docker ps | grep postgres15

# View container logs
docker logs postgres15
```

### Backup and Restore
```bash
# Backup a database
docker exec postgres15 pg_dump -U username dbname > backup.sql

# Restore a database
docker exec -i postgres15 psql -U username -d dbname < backup.sql

# Backup all databases
docker exec postgres15 pg_dumpall -U postgres > full_backup.sql
```

## Extension Usage Examples

### PostGIS (Geo-spatial)
```sql
-- Create table with geo data
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    geom GEOMETRY(POINT, 4326)
);

-- Insert location data
INSERT INTO locations (name, geom) VALUES
    ('New York', ST_GeomFromText('POINT(-74.0060 40.7128)', 4326)),
    ('London', ST_GeomFromText('POINT(-0.1278 51.5074)', 4326));

-- Create spatial index
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);

-- Find locations within 1000km of a point
SELECT name, ST_Distance(geom, ST_GeomFromText('POINT(0 0)', 4326)) as distance
FROM locations
WHERE ST_DWithin(geom, ST_GeomFromText('POINT(0 0)', 4326), 1000000);
```

### pgvector (Vector Similarity)
```sql
-- Create table with vectors
CREATE TABLE embeddings (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536)  -- Adjust dimension as needed
);

-- Insert vector data
INSERT INTO embeddings (content, embedding) VALUES
    ('Document 1', '[0.1,0.2,0.3,...]'),
    ('Document 2', '[0.2,0.1,0.4,...]');

-- Create vector index for faster search
CREATE INDEX idx_embeddings_embedding ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Find similar vectors (cosine similarity)
SELECT content, 1 - (embedding <=> '[0.1,0.2,0.3,...]') as similarity
FROM embeddings
ORDER BY embedding <=> '[0.1,0.2,0.3,...]'
LIMIT 10;
```

## Security Best Practices

1. **Use Strong Passwords**: Always use complex passwords for database users
2. **Limit Network Access**: Only allow connections from trusted IP addresses
3. **Regular Backups**: Set up automated backup schedules
4. **Monitor Logs**: Regularly check PostgreSQL logs for suspicious activity
5. **Update Extensions**: Keep PostGIS and pgvector updated
6. **Resource Limits**: Set appropriate connection and memory limits

## Troubleshooting

### Common Issues

#### Connection Refused
```bash
# Check if container is running
docker ps | grep postgres15

# Check port mapping
docker port postgres15

# Check if port is accessible
telnet [server_ip] 5433
```

#### Authentication Failed
- Verify username and password
- Check pg_hba.conf configuration
- Ensure user has database access privileges

#### Permission Denied
```sql
-- Grant specific permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO username;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO username;
```

#### Performance Issues
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('dbname'));

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public';
```

## Monitoring

### Docker Commands
```bash
# Monitor container resource usage
docker stats postgres15

# View real-time logs
docker logs -f postgres15
```

### SQL Monitoring Queries
```sql
-- Check database connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

## Next Steps

1. Configure firewall rules to only allow necessary IPs
2. Set up regular backup schedules
3. Configure monitoring and alerting
4. Implement connection pooling for high-traffic applications
5. Consider read replicas for scaling

---

**Last Updated**: 2025-11-16
**PostgreSQL Version**: 15
**Extensions**: PostGIS 3.6.1, pgvector 0.8.1