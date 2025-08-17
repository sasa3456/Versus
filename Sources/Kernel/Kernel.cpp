#include "Kernel.hpp"

namespace VE_Kernel
{
    bool Engine::Initialize(uint32_t width_a,
                            uint32_t height_a,
                            const char* title_a)
    {
        if (!window_.Initialize(width_a, height_a, title_a))
            return false;

        is_running_ = true;

        mouse_ = &window_.GetMouse();
        keyboard_ = &window_.GetKeyboard();

        if (!renderer_.Initialize(&window_))
            return false;

        if (!html_view_manager_.Initialize(renderer_.GetD3DPtr()))
        {
            ErrorHandler::LogCriticalError(
                    L"Failed to initialize html view manager.");
            
            return false;
        }

        auto temp_view_ = html_view_manager_.CreateView(width_a, height_a);
        if (temp_view_ == nullptr)
        {
            ErrorHandler::LogCriticalError(L"Failed to create html view.");
            return false;
        }

        temp_view_->LoadURL("file:///web/example.html");
        temp_view_->Focus();

        return true;
    }

    bool Engine::IsRunning()
    {
        return is_running_;
    }

    void Engine::Tick(float delta_time_a)
    {
        if (!window_.ProcessMessages())
        {
            is_running_ = false;
            return;
        }

        while (!mouse_->EventBufferIsEmpty())
        {
            MouseEvent me_ = mouse_->ReadEvent();
            if (me_.IsValid())
            {
                html_view_manager_.FireMouseEvent(me_);
            }
        }

        while (!keyboard_->EventBufferIsEmpty())
        {
            KeyboardEvent kbe_ = keyboard_->ReadEvent();
            if (kbe_.IsValid())
            {
                html_view_manager_.FireKeyboardEvent(kbe_);
            }
        }
    }

    void Engine::Render()
    {
        renderer_.GetD3DPtr()->device_context_->ClearState();
        html_view_manager_.UpdateViews();
        renderer_.BeginFrame();
        for (auto& view_ : html_view_manager_.GetViews())
        {
            renderer_.RenderView(view_);
        }

        renderer_.EndFrame();
    }
} // namespace VE_Kernel