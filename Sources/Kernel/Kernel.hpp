// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef KERNEL_HPP
#define KERNEL_HPP

#include "Window/Window.hpp"
#include "Graphics/Renderer.hpp"
#include "Graphics/ULImpl/HtmlViewManager.hpp"

namespace VE_Kernel
{
    class Engine
    {
    public:
        bool Initialize(uint32_t width_a, 
            uint32_t height_a, const char* title_a);
        
        bool IsRunning();
        void Tick(float delta_time_a);
        void Render();

    private:
        Window window_;
        Renderer renderer_;
        Mouse* mouse_ = nullptr;
        Keyboard* keyboard_ = nullptr;
        HtmlViewManager html_view_manager_;
        bool is_running_ = false;
    };
} // namespace VE_Kernel

#endif