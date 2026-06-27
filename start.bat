@echo off
echo Starting Trading Academy...
echo.
start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 2 /noisy
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 3 /noisy
echo.
echo App running at: http://localhost:5173
echo Admin: admin@trading.academy / admin123
echo Student: an@student.com / student123
echo.
start http://localhost:5173
