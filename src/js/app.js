// js/app.js
import Editor from './Editor.js';

document.addEventListener('DOMContentLoaded', () => {
    const projectModalElement = document.getElementById('project-modal');
    const projectModal = new bootstrap.Modal(projectModalElement);
    const mainContainer = document.querySelector('.vs-container');

    let app; // Will hold the Editor instance

    // --- Modal View Switching Logic ---
    const initialView = document.getElementById('modal-view-initial');
    const createView = document.getElementById('modal-view-create');

    const switchModalView = (fromView, toView) => {
        fromView.classList.add('exit-left');
        setTimeout(() => {
            fromView.classList.remove('active', 'exit-left');
            toView.classList.add('active');
        }, 300); // Match CSS transition duration
    };

    document.getElementById('show-create-project-view').addEventListener('click', () => {
        switchModalView(initialView, createView);
    });
    
    document.getElementById('back-to-initial-view').addEventListener('click', () => {
        switchModalView(createView, initialView);
    });

    // --- Core Application Logic ---
    const initializeEditor = () => {
        try {
            const viewportContainer = document.getElementById('viewport-container');
            if (!viewportContainer) {
                throw new Error("Критическая ошибка: элемент #viewport-container не найден!");
            }
            app = new Editor(viewportContainer);
            app.init();
            app.animate && app.animate();

            // Hook up save button after initialization
            document.getElementById('save-project-btn').addEventListener('click', () => {
                 app.saveProject && app.saveProject();
            });

            // Make the main UI visible and hide the modal
            projectModal.hide();
            mainContainer.style.visibility = 'visible';

        } catch (error) {
            console.error("Не удалось инициализировать редактор:", error);
            alert(`Критическая ошибка: ${error.message}`);
            return;
        }
    };
	
	// В app.js — после инициализации app (например, сразу после app.init()/app.animate() / после initializeEditor() вызовов)
function setupViewModeButtons(app) {
    const modes = [
        { id: 'view-mode-final-btn', mode: 'final' },
        { id: 'view-mode-shaded-btn', mode: 'shaded' },
        { id: 'view-mode-wireframe-btn', mode: 'wireframe' },
        { id: 'view-mode-transparent-btn', mode: 'transparent' },
    ];

    const btnEls = modes.map(m => ({ mode: m.mode, el: document.getElementById(m.id) })).filter(x => x.el);

    const setMode = (mode) => {
        if (!app || !app.objectManager) return;
        app.objectManager.setViewMode(mode);
        // UI: подсветка кнопок
        btnEls.forEach(b => b.el.classList.toggle('active', b.mode === mode));
    };

    btnEls.forEach(b => {
        b.el.addEventListener('click', (e) => {
            e.preventDefault();
            setMode(b.mode);
        });
    });

    // Установим начальный режим (например shaded)
    setMode('shaded');
}

// Вызовите setupViewModeButtons(app) сразу после initializeEditor();


    // --- Project Creation Logic ---
    document.getElementById('select-location-btn').addEventListener('click', async () => {
        const path = await window.electronAPI.selectDirectory();
        if (path) {
            document.getElementById('project-location').value = path;
        }
    });

    document.getElementById('create-project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectName = document.getElementById('project-name').value.trim();
        const projectLocation = document.getElementById('project-location').value.trim();

        if (!projectName || !projectLocation) {
            alert("Пожалуйста, укажите имя проекта и расположение.");
            return;
        }

        const fullProjectPath = `${projectLocation}\\${projectName}`;

        const result = await window.electronAPI.createProject(fullProjectPath, projectName);

        if (result.success) {
            initializeEditor();
            app.setProject(projectName, fullProjectPath);
        } else {
            alert(`Не удалось создать проект: ${result.error}`);
        }
    });

    // --- Project Opening Logic ---
     const handleOpenProject = async () => {
         const projectData = await window.electronAPI.openProject();

         if (projectData && projectData.name) {
             initializeEditor();
             app.setProject(projectData.name, projectData.path);
             
             // Нормализация: projectData.data может быть строкой или объектом, передаём в loadScene
             try {
                 const payload = projectData.data !== undefined ? projectData.data : projectData;
                 const scenePayload = (typeof payload === 'string') ? JSON.parse(payload) : payload;
                 app.loadScene(scenePayload);
             } catch (err) {
                 console.warn('Failed to normalize project data before loadScene, passing raw data:', err);
                 app.loadScene(projectData.data || projectData);
             }

         } else if (projectData && projectData.error) {
             alert(`Ошибка при открытии проекта: ${projectData.error}`);
         }
    };
    
    document.getElementById('open-project-btn').addEventListener('click', handleOpenProject);
    document.getElementById('open-project-menu-btn').addEventListener('click', handleOpenProject);

    // --- New Project From Menu ---
    document.getElementById('new-project-menu-btn').addEventListener('click', () => {
       if(confirm("Создать новый проект?")) {
           window.location.reload(); // Easiest way to restart the process
       }
    });

    // Show the modal on startup
    projectModal.show();
});

// Добавьте этот код в конец обработчика DOMContentLoaded в app.js
document.getElementById('build-menu-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const buildModal = new bootstrap.Modal(document.getElementById('build-modal'));
    buildModal.show();
});

// Обработчик для кнопки "Собрать" в модальном окне
document.getElementById('build-confirm-btn').addEventListener('click', () => {
    const platform = document.getElementById('platform-select').value;
    alert(`Начинаем сборку для платформы: ${platform}`);
    // Здесь будет логика запуска сборки
    bootstrap.Modal.getInstance(document.getElementById('build-modal')).hide();
});

// Добавьте этот код в конец обработчика DOMContentLoaded в app.js


// Добавьте этот код в конец обработчика DOMContentLoaded в app.js
document.getElementById('settings-menu-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const settingsModal = new bootstrap.Modal(document.getElementById('settings-modal'));
    settingsModal.show();
});

// Закрытие приложения по крестику в модальном окне
const modalCloseBtn = document.getElementById('modal-close-button');
if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', async () => {
        try {
            // Если в main реализована подтверждающая логика — используем её
            // confirmClose() должен вернуть true/false
            if (window.electronAPI && typeof window.electronAPI.confirmClose === 'function') {
                const shouldClose = await window.electronAPI.confirmClose();
                if (shouldClose) {
                    window.electronAPI.closeWindow && window.electronAPI.closeWindow();
                }
            } else {
                // Если confirmClose не доступен — просто просим закрыть окно
                window.electronAPI && window.electronAPI.closeWindow && window.electronAPI.closeWindow();
            }
        } catch (err) {
            console.error('Ошибка при попытке закрыть окно через крестик модального:', err);
            // fallback — всё равно шлём запрос на закрытие
            window.electronAPI && window.electronAPI.closeWindow && window.electronAPI.closeWindow();
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
  const exitMenuButton = document.getElementById('exit-menu-btn');
  if (exitMenuButton) {
    exitMenuButton.addEventListener('click', () => {
      window.electronAPI.confirmClose();
    });
  }
});