// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef HTMLVIEWMANAGER_HPP
#define HTMLVIEWMANAGER_HPP

#include "HtmlView.hpp"
#include "../../Window/Input/KeyboardEvent.hpp"
#include "../../Window/Input/MouseEvent.hpp"
#include "../D3D/D3DClass.hpp"
#include "../D3D/VertexBuffer.hpp"

#include "LoggerAdapters/LoggerDefault.hpp"
#include "FontLoaderAdapters/FontLoaderWin.hpp"
#include "FileSystems/FileSystemDefault.hpp"
#include "GPUAdapters/GPUDriverD3D11.hpp"

namespace VE_Kernel
{
    class HtmlViewManager
    {
    public:
        bool Initialize(D3DClass* d3d_a);
        void UpdateViews();
        std::shared_ptr<HtmlView> CreateView(uint32_t width_a,
                                             uint32_t height_a,
                                             bool is_transparent_a = false);

        void FireMouseEvent(MouseEvent mouse_event_a);
        void FireKeyboardEvent(KeyboardEvent keyboard_event_a);
        std::vector<std::shared_ptr<HtmlView>>& GetViews();
        ~HtmlViewManager();

    private:
        D3DClass* d3d_ = nullptr;
        ul::RefPtr<ul::Renderer> ultralight_renderer_;
        std::unique_ptr<LoggerDefault> logger_;
        std::unique_ptr<FontLoaderWin> font_loader_;
        std::unique_ptr<FileSystemDefault> filesystem_;
        std::unique_ptr<GPUDriverD3D11> gpu_driver_;
        std::vector<std::shared_ptr<HtmlView>> html_views_;
        VertexBuffer<Vertex_3pf_2tf> vertex_buffer_;
    };
} // namespace VE_Kernel

#endif