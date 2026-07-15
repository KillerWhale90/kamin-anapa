---
name: deploy
description: Задеплоить изменения сайта на GitHub Pages — поднять cache-bust версии, закоммитить, запушить, дождаться публикации и проверить живой сайт
---

# Деплой kamin-anapa на GitHub Pages

Сайт — чистая статика без сборки. Деплой = push в `main` репозитория
`KillerWhale90/kamin-anapa`; GitHub Pages публикует сам за 1–3 минуты.
Живой адрес: https://killerwhale90.github.io/kamin-anapa/

## Порядок

1. **Cache-bust.** Если менялся `assets/css/style.css` или `assets/js/main.js` —
   поднять номер версии в ссылках `style.css?v=N` / `main.js?v=N`
   в ОБОИХ файлах: `index.html` и `catalog.html`.
   ⚠️ Версии менять ТОЛЬКО инструментом Edit, НЕ через PowerShell
   `Get-Content`/`-replace`/`Set-Content` — PS 5.1 читает UTF-8 без BOM как
   Windows-1251 и превращает русский текст в кракозябры (уже случалось с
   catalog.html, чинили восстановлением из git).
2. Закоммитить и запушить: `git add -A; git commit -m "..."; git push`.
3. Дождаться публикации: опрашивать живую страницу (с заголовком
   `Cache-Control: no-cache`) до появления нового `?v=N` или изменённого
   контента, до 3 минут по 15 секунд.
4. Проверить, что изменённые файлы отдаются (Invoke-WebRequest -Method Head → 200).
5. Если правился скролл/анимации — прогнать тесты из `tests/` (см. скилл scroll-test).

## Жёсткие правила проекта

- GSAP/ScrollTrigger/lenis лежат ЛОКАЛЬНО в `assets/js/vendor/`.
  НЕ возвращать на CDN: cdnjs/jsdelivr в РФ с мобильных сетей виснут,
  и пока они грузятся, main.js не выполняется — сайт ниже первого экрана
  остаётся невидимым (секции ждут reveal-класса от JS).
- Пути к файлам чувствительны к регистру (GitHub Pages — Linux):
  `fireplace.mp4`, не `Fireplace.mp4`.
- Netlify-версия (kamin-anapa.netlify.app) обновляется отдельно и вручную;
  обычно её не трогаем — основное зеркало для показа клиентам это github.io.
