#pragma once
#include "KeyboardEvent.hpp"

class Keyboard
{
	friend class Window;
public:
	Keyboard();
	bool KeyIsPressed(const unsigned char keycode);
	bool EventBufferIsEmpty();
	KeyboardEvent ReadEvent();

private:
	void OnWindowsKeyboardMessage(UINT uMsg, WPARAM wParam, LPARAM lParam);

	bool keyStates[256] = { false };
	std::queue<KeyboardEvent> eventBuffer;
};
