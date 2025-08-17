// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef D3DCLASS_HPP
#define D3DCLASS_HPP

#include "../../Utility/ErrorHandler.hpp"

#include <Windows.h>
#include <d3d11.h>
#include <d3dcompiler.h>

namespace VE_Kernel
{
    class Window;
    class D3DClass
    {
    public:
        bool Initialize(Window* window_a);

    public:
        Microsoft::WRL::ComPtr<ID3D11Device> device_;
        Microsoft::WRL::ComPtr<ID3D11DeviceContext> device_context_;
        Microsoft::WRL::ComPtr<IDXGISwapChain> swapchain_;
        Microsoft::WRL::ComPtr<ID3D11RenderTargetView> render_target_view_;
        Microsoft::WRL::ComPtr<ID3D11Texture2D> depth_stencil_buffer_;
        Microsoft::WRL::ComPtr<ID3D11DepthStencilView> depth_stencil_view_;
        Microsoft::WRL::ComPtr<ID3D11DepthStencilState> depth_stencil_state_;
        Microsoft::WRL::ComPtr<ID3D11RasterizerState> rasterizer_state_;
        Microsoft::WRL::ComPtr<ID3D11SamplerState> sampler_state_;

    private:
        bool _InitializeDeviceAndSwapchain();
        bool _InitializeRenderTarget();
        bool _InitializeDepthStencilBufferAndState();
        bool _InitializeRasterizerState();
        bool _InitializeSamplerState();

    private:
        HWND hwnd_ = NULL;
        uint16_t width_ = 0;
        uint16_t height_ = 0;
    };
} // namespace VE_Kernel

#endif
