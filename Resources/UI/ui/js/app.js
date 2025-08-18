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

    // Переключатель Play/Simulate
    document.querySelectorAll('.vs-play-toggle .vs-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.vs-play-toggle .vs-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        })
    })

    // Инициализация тултипов Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    })