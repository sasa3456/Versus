#include "../Kernel/Kernel.hpp"

int WINAPI wWinMain(
	HINSTANCE h_instance_a, HINSTANCE h_prev_instance_a, 
	PWSTR p_cmd_line_a, int n_cmd_show_a)
{
	VE_Kernel::Engine engine_;
	if (engine_.Initialize(1920, 1000, "Versus"))
	{
		VE_Kernel::Timer t_;
		t_.Start();
		while (engine_.IsRunning())
		{
			const float delta_time_ = t_.GetMilisecondsElapsed();
			t_.Restart();
			engine_.Tick(delta_time_);
			engine_.Render();
		}
	}

	return 0;
}