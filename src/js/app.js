// js/main.js
import Editor from './Editor.js';

// Ожидаем полной загрузки DOM, чтобы все элементы были доступны
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Находим корневой элемент для нашего приложения
        const viewportContainer = document.getElementById('viewport-container');
        if (!viewportContainer) {
            throw new Error("Критическая ошибка: элемент #viewport-container не найден!");
        }

        // Создаем и инициализируем главный редактор
        const app = new Editor(viewportContainer);
        app.init();
        app.animate(); // Запускаем рендер-цикл

    } catch (error) {
        console.error("Не удалось инициализировать редактор:", error);
        // В случае критической ошибки выводим сообщение пользователю
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: red;">
                <h1>Критическая ошибка</h1>
                <p>Не удалось инициализировать 3D-редактор. Проверьте консоль для получения дополнительной информации.</p>
                <p><i>${error.message}</i></p>
            </div>`;
    }
});