---
trigger: always_on
---

Dev Environment
Service	Port	Status
Production (Docker)	3535	Running
Development (local)	4000	Running
Database (Docker)	54322	Healthy
Both environments share the same database. Open http://localhost:4000 for development.

Always use dev to add and test features