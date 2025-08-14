#include "pch.hpp"
#include "../Kernel/Kernel.hpp"

int WINAPI wWinMain(HINSTANCE hInstance_, HINSTANCE hPrevInstance_, PWSTR pCmdLine_, int nCmdShow_)
{
	Engine engine;
	if (engine.Initialize(1920, 1000, "Versus"))
	{
		Timer t;
		t.Start();
		while (engine.IsRunning())
		{
			const float deltaTime = t.GetMilisecondsElapsed();
			t.Restart();
			engine.Tick(deltaTime);
			engine.Render();
		}
	}
	return 0;
}
