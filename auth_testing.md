# Auth Testing

Admin: olowokandevincent0@gmail.com / Cocoa@2026 (role admin, seeded on startup)

## API
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"olowokandevincent0@gmail.com","password":"Cocoa@2026"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Login returns user object + sets access_token/refresh_token cookies. /me returns same user via cookies.

bcrypt hashes start with $2b$. Users stored with string uuid `id` field, role in {admin, staff}.
