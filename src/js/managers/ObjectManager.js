// js/managers/ObjectManager.js
import * as THREE from 'three';
import { sanitizeName } from '../utils/helpers.js';
import { createPrimitive, createLight } from '../utils/creators.js';

const PRIMITIVE_TYPES = new Set(['cube', 'sphere', 'plane']);
const LIGHT_TYPES = new Set(['point', 'directional']);

export default class ObjectManager {
    constructor(scene, mixers, editor) {
        this.scene = scene;
        this.mixers = mixers;
        this.editor = editor;
        this.selected = null;

        this.originalMaterials = new Map();
        this.defaultShadedMaterial = new THREE.MeshStandardMaterial({ color: 0xbfbfbf });

        this.sceneListContainer = document.querySelector('.vs-tree');
        // map uuid -> { obj, el }
        this.sceneItems = new Map();

        // счетчик для имен по базовому имени, чтобы давать короткие уникальные суффиксы
        this.nameCounters = Object.create(null);

        this.lightAccordionItem = document.getElementById('light-accordion-item');
    }

    add(type, category, suppressHistory = false) {
        // Валидация типов — не создаём по умолчанию plane и т.п.
        if (category === 'primitive' && !PRIMITIVE_TYPES.has(type)) {
            console.warn(`ObjectManager.add: unknown primitive type "${type}" — пропускаю создание.`);
            return undefined;
        }
        if (category === 'light' && !LIGHT_TYPES.has(type)) {
            console.warn(`ObjectManager.add: unknown light type "${type}" — пропускаю создание.`);
            return undefined;
        }

        const newObj = (category === 'primitive') ? createPrimitive(type) : createLight(type);
        if (!newObj) {
            console.warn(`ObjectManager.add: creators returned falsy for type="${type}", category="${category}"`);
            return undefined;
        }

        // Добавляем в сцену
        this.scene.add(newObj);
        this.cacheOriginalMaterials(newObj);

        // Для интерактивного создания (через UI) регистрируем и выбираем;
        // при массовой загрузке (suppressHistory === true) мы позволим вызывающему коду
        // сначала назначить нужные трансформы/имя, а потом вызвать registerSceneObject.
        if (!suppressHistory) {
            // Перед регистрацией убеждаемся в уникальном имени
            newObj.name = this._generateUniqueName(sanitizeName(newObj.name || newObj.type || 'Object'));
            this.registerSceneObject(newObj);
            this.setSelected(newObj);

            // Запись в историю (если есть editor.addHistory)
            const action = {
                undo: () => this.remove(newObj, true),
                redo: () => {
                    this.scene.add(newObj);
                    this.registerSceneObject(newObj);
                    this.setSelected(newObj);
                }
            };
            this.editor && this.editor.addHistory && this.editor.addHistory(action);
        }

        // Возвращаем объект для внешней настройки (например, loadScene)
        return newObj;
    }

    remove(obj, suppressHistory = false) {
        if (!obj) return;
        if (!suppressHistory) {
            const action = {
                undo: () => {
                    this.scene.add(obj);
                    this.registerSceneObject(obj);
                    this.setSelected(obj);
                },
                redo: () => this.remove(obj, true)
            };
            this.editor && this.editor.addHistory && this.editor.addHistory(action);
        }

        try { if (obj.parent) obj.parent.remove(obj); } catch (e) {}
        const stored = this.sceneItems.get(obj.uuid);
        if (stored && stored.el && stored.el.parentNode) stored.el.parentNode.removeChild(stored.el);
        this.sceneItems.delete(obj.uuid);

        if (this.selected === obj) this.setSelected(null);
    }

    cacheOriginalMaterials(object) {
        object.traverse(node => {
            if (node.isMesh && !this.originalMaterials.has(node.uuid)) {
                this.originalMaterials.set(node.uuid, node.material);
            }
        });
    }

    rebuildSceneListUI() {
        if (!this.sceneListContainer) return;
        this.sceneListContainer.innerHTML = '';
        this.sceneItems.clear();
        // перерасчет nameCounters — опционально, но полезно при загрузке проекта
        this.nameCounters = Object.create(null);

        this.scene.children.forEach(child => {
            if (child.userData && child.userData.isHelper) return;
            if (child.userData && child.userData.isEditorObject) {
                // обеспечим уникальное имя и зарегистрируем
                child.name = this._generateUniqueName(sanitizeName(child.name || child.type || 'Object'));
                this.registerSceneObject(child);
            }
        });
    }

    /**
     * Генерирует уникальное короткое имя на основе base (например "cube" -> "cube", "cube_1", "cube_2")
     * nameCounters хранит последний использованный индекс
     */
    _generateUniqueName(base) {
        base = sanitizeName(base || 'Object');
        // если такое имя уже занято среди sceneItems:
        const namesInUse = new Set(Array.from(this.sceneItems.values()).map(v => v.obj.name));
        if (!namesInUse.has(base)) {
            // отметим счетчик, чтобы следующий раз использовать _1 при коллизии
            if (!this.nameCounters[base]) this.nameCounters[base] = 1;
            return base;
        }

        let idx = this.nameCounters[base] || 1;
        let candidate = `${base}_${idx}`;
        while (namesInUse.has(candidate)) {
            idx++;
            candidate = `${base}_${idx}`;
        }
        this.nameCounters[base] = idx + 1;
        return candidate;
    }

    /**
     * Регистрирует объект в панели Scene. Защищает от дублей по uuid:
     * - если уже есть элемент с этим uuid — обновляет заголовок и возвращает.
     * - иначе создаёт новый DOM-элемент и навешивает события (click, dblclick -> rename).
     */
    registerSceneObject(obj) {
        if (!this.sceneListContainer || !obj || !obj.uuid) return;

        // Если уже есть карточка с этим uuid — обновим заголовок и вернёмся
        if (this.sceneItems.has(obj.uuid)) {
            const existing = this.sceneItems.get(obj.uuid);
            if (existing && existing.el) {
                const titleEl = existing.el.querySelector('.vs-tree-item-title');
                if (titleEl) titleEl.textContent = obj.name || titleEl.textContent;
            }
            return;
        }

        // Защитимся от карточки с таким же name (редкие коллизии при загрузке/ручном переименовании)
        const existingByName = Array.from(this.sceneItems.values()).find(v => v.obj.name === obj.name);
        if (existingByName) {
            // Если уже есть объект с таким же именем — уникализируем имя
            obj.name = this._generateUniqueName(sanitizeName(obj.name || obj.type || 'Object'));
        } else {
            // Попытаемся применить sanitize + возможную генерацию счетчика (если имя пустое)
            obj.name = this._generateUniqueName(sanitizeName(obj.name || obj.type || 'Object'));
        }

        obj.userData.isEditorObject = true;

        // Создаём DOM карточку
        const el = document.createElement('div');
        el.className = 'vs-tree-item';
        el.dataset.uuid = obj.uuid;

        const icon = document.createElement('div');
        icon.className = 'vs-icon';
        icon.textContent = (obj.type || 'OB').slice(0, 2).toUpperCase();

        const title = document.createElement('div');
        title.className = 'vs-tree-item-title';
        title.textContent = obj.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'vs-btn';
        deleteBtn.innerHTML = '&#x2715;';
        deleteBtn.title = 'Удалить';
        deleteBtn.onclick = (e) => { e.stopPropagation(); this.remove(obj); };

        el.append(icon, title, deleteBtn);

        // Клик — выбрать объект
        el.addEventListener('click', () => this.setSelected(obj));

        // Двойной клик — rename
        title.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this._beginRename(obj, title);
        });

        this.sceneListContainer.appendChild(el);
        this.sceneItems.set(obj.uuid, { obj, el });

        // выделение если нужно
        this.highlightSceneListItem(this.selected ? this.selected.uuid : null);
    }

    _beginRename(obj, titleEl) {
        if (!titleEl) return;
        // Создадим input поверх title
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'vs-input';
        input.value = obj.name || '';
        input.style.width = '100%';
        // заменим title текст на input
        titleEl.textContent = '';
        titleEl.appendChild(input);
        input.focus();
        input.select();

        const finish = (commit) => {
            const newValRaw = input.value.trim();
            if (commit && newValRaw) {
                // sanitize and ensure uniqueness
                let candidateBase = sanitizeName(newValRaw);
                // если имя уже используется другим объектом — уникализируем
                const otherNames = new Set(Array.from(this.sceneItems.values()).filter(v => v.obj.uuid !== obj.uuid).map(v => v.obj.name));
                let finalName = candidateBase;
                if (otherNames.has(finalName)) {
                    let idx = this.nameCounters[candidateBase] || 1;
                    while (otherNames.has(`${candidateBase}_${idx}`)) idx++;
                    finalName = `${candidateBase}_${idx}`;
                    this.nameCounters[candidateBase] = idx + 1;
                }
                obj.name = finalName;
            }
            // Восстанавливаем title
            titleEl.removeChild(input);
            titleEl.textContent = obj.name || '';
            // Обновим запись в sceneItems (объект уже тот же по uuid)
            const stored = this.sceneItems.get(obj.uuid);
            if (stored) stored.obj = obj;
        };

        const onKey = (ev) => {
            if (ev.key === 'Enter') {
                finish(true);
            } else if (ev.key === 'Escape') {
                finish(false);
            }
        };

        input.addEventListener('blur', () => finish(true));
        input.addEventListener('keydown', onKey);
    }

    highlightSceneListItem(uuid) {
        this.sceneItems.forEach(({ el }, id) => {
            if (!el) return;
            if (id === uuid) el.classList.add('active'); else el.classList.remove('active');
        });
    }

    setSelected(obj) {
        this.selected = obj || null;
        this.highlightSceneListItem(this.selected ? this.selected.uuid : null);
        this.updateInspector();
        window.dispatchEvent(new CustomEvent('selectionChanged', { detail: { selected: this.selected } }));
    }

    updateInspector() {
        if (this.selected && this.selected.isLight) {
            this.lightAccordionItem && (this.lightAccordionItem.style.display = 'block');
            const light = this.selected;
            const colorInput = document.getElementById('light-color-input');
            if (colorInput) colorInput.value = '#' + light.color.getHexString();
            const intensitySlider = document.getElementById('light-intensity-slider');
            if (intensitySlider) intensitySlider.value = light.intensity;
            const intensityNumber = document.getElementById('light-intensity-number');
            if (intensityNumber) intensityNumber.value = light.intensity;
            const shadowCheck = document.getElementById('light-shadow-check');
            if (shadowCheck) shadowCheck.checked = light.castShadow;
        } else {
            this.lightAccordionItem && (this.lightAccordionItem.style.display = 'none');
        }
    }
}
