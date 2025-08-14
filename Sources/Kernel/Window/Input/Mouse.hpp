#pragma once
#include "MouseEvent.hpp"

class Mouse
{
	friend class Window;
public:
	int GetPosX();
	int GetPosY();
	MousePoint GetPos();
	bool EventBufferIsEmpty();
	MouseEvent ReadEvent();
private:
	void OnWindowsMouseMessage(UINT uMsg, WPARAM wParam, LPARAM lParam);
	MouseEvent::Button lastPressedButton = MouseEvent::Button::None;

	std::queue<MouseEvent> eventBuffer;
	int x = 0;
	int y = 0;
};
