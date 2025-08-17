// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef RENDERER_HPP
#define RENDERER_HPP

#include "ULImpl/HtmlView.hpp"

namespace VE_Kernel
{
    class Window;
    class Renderer
    {
    public:
        bool Initialize(Window* window_a);
        void BeginFrame();
        void EndFrame();
        void RenderView(std::shared_ptr<HtmlView> view_a);
        D3DClass* GetD3DPtr();

    private:
        bool _InitializeShaders();
        bool _InitializeConstantBuffers();

    private:
        D3DClass d3d_;
        ConstantBuffer<DirectX::XMMATRIX> cb_ortho_matrix_;
        ConstantBuffer<DirectX::XMMATRIX> cb_world_matrix_;
        PixelShader ps_orthographic2d_;
        VertexShader vs_orthographic2d_;
        Window* window_ = nullptr;
    };
} // namespace VE_Kernel

#endif