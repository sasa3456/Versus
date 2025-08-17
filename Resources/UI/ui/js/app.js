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