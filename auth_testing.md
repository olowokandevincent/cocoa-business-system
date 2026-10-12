# Auth Testing

Owner: olowokandevincent0@gmail.com / Cocoa@2026 (role admin, seeded on startup)
Demo:  demo@cocoaledger.app / CocoaDemo@2026 (role admin, seeded on startup, offered by the
       "Enter demo" button on the sign-in page)

Both are seeded from the environment (`ADMIN_EMAIL` / `ADMIN_PASSWORD` and `DEMO_EMAIL` /
`DEMO_PASSWORD`, see `.env.base44-defaults`). The demo account is off unless both `DEMO_EMAIL`
and `DEMO_PASSWORD` are set — with either one empty, no account is created and `GET
/api/auth/demo` returns `{"available": false}`, which hides the demo button in the UI.

## API
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"olowokandevincent0@gmail.com","password":"Cocoa@2026"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
curl http://localhost:8001/api/auth/demo      # public: the demo login, or {"available": false}
```
Login returns user object + sets access_token/refresh_token cookies. /me returns same user via cookies.

bcrypt hashes start with $2b$. Users stored with string uuid `id` field, role in {admin, staff}.
