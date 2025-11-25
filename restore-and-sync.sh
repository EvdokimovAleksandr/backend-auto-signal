#!/bin/bash

echo "========================================"
echo "  Auto Signal - Восстановление БД"
echo "========================================"
echo

echo "[1/4] Восстановление БД из дампа..."
npm run restore-db-node
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Не удалось восстановить БД"
    exit 1
fi

echo
echo "[2/4] Подготовка БД..."
npm run setup-db
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Не удалось подготовить БД"
    exit 1
fi

echo
echo "[3/4] Синхронизация Prisma..."
npm run sync-prisma
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Не удалось синхронизировать Prisma"
    exit 1
fi

echo
echo "[4/4] Проверка БД..."
npm run check-db

echo
echo "========================================"
echo "  ГОТОВО! Запустите: npm run dev"
echo "========================================"
