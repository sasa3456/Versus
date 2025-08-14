#pragma once
#include "../Editor/pch.hpp"
#include "Window/Window.hpp"
#include "Graphics/Renderer.hpp"
#include "Graphics/ULImpl/HtmlViewManager.hpp"

class Engine
{
public:
	bool Initialize(uint32_t width, uint32_t height, const char* title);
	bool IsRunning();
	void Tick(float deltaTime);
	void Render();
private:
	Window window;
	Renderer renderer;
	Mouse* pMouse = nullptr;
	Keyboard* pKeyboard = nullptr;
	HtmlViewManager htmlViewManager;
	bool isRunning = false;
};
