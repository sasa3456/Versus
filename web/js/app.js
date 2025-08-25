    // Интерактивные элементы
    document.querySelectorAll('.vs-tree-item').forEach(it => {
      it.addEventListener('click', () => {
        document.querySelectorAll('.vs-tree-item').forEach(i => i.style.background = '');
        it.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.02), transparent)';
      })
    })

    // Таймер автосохранения
    let autosave = document.querySelector('.vs-sidebar .vs-muted');
    let i = 2;
    setInterval(() => {
      i++;
      autosave.textContent = 'Autosave: ' + i + 'm ago';
    }, 30000);
	
	// js/app.js

window.addEventListener('load', function() {
  const viewportCanvas = document.querySelector('.vs-viewport-canvas');

  if (!viewportCanvas) {
    console.error("Элемент '.vs-viewport-canvas' не найден!");
    return;
  }

  // Функция для отправки размеров в C++
  const sendViewportRect = () => {
    const rect = viewportCanvas.getBoundingClientRect();

    // Проверяем, доступна ли функция обратного вызова
    if (typeof OnViewportReady === 'function') {
      // Отправляем координаты и размеры
      OnViewportReady(rect.left, rect.top, rect.width, rect.height);
    } else {
      console.error("JS-Callback 'OnViewportReady' не определен в C++.");
    }
  };

  // Отправляем размеры при первой загрузке
  sendViewportRect();

  // Используем ResizeObserver для отслеживания изменений размера элемента
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      if (entry.target === viewportCanvas) {
        console.log('Размер вьюпорта изменен, отправляем новые координаты...');
        sendViewportRect();
      }
    }
  });
  
  // Начинаем наблюдение за элементом
  resizeObserver.observe(viewportCanvas);
});