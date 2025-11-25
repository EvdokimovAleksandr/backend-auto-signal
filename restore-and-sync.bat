@echo off
echo ========================================
echo   Auto Signal - Восстановление БД
echo ========================================
echo.

echo [1/4] Восстановление БД из дампа...
call npm run restore-db-node
if errorlevel 1 (
    echo ОШИБКА: Не удалось восстановить БД
    pause
    exit /b 1
)

echo.
echo [2/4] Подготовка БД...
call npm run setup-db
if errorlevel 1 (
    echo ОШИБКА: Не удалось подготовить БД
    pause
    exit /b 1
)

echo.
echo [3/4] Синхронизация Prisma...
call npm run sync-prisma
if errorlevel 1 (
    echo ОШИБКА: Не удалось синхронизировать Prisma
    pause
    exit /b 1
)

echo.
echo [4/4] Проверка БД...
call npm run check-db

echo.
echo ========================================
echo   ГОТОВО! Запустите: npm run dev
echo ========================================
pause
